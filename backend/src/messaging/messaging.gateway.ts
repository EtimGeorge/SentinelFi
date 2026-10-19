import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { MessagingService } from "./messaging.service";
import { JwtService } from "@nestjs/jwt";

/** Multi-tab presence: userId → set of live socket ids. */

@WebSocketGateway({
  path: "/ws-messaging", // We'll keep this path for backward compatibility with frontend proxy
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MessagingGateway.name);

  /** userId → live socket ids (multi-tab/desktop support). */
  private readonly onlineSockets = new Map<string, Set<string>>();

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`New messaging client connecting: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) return;

    const sockets = this.onlineSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size > 0) {
        // Still online via another tab — presence unchanged.
        return;
      }
      this.onlineSockets.delete(userId);
    }

    // Last socket for this user: broadcast offline to every room they were in.
    try {
      const convs = await this.messagingService.getConversationsForUser(
        userId,
        client.data?.tenantId,
      );
      for (const conv of convs) {
        this.server
          .to(`conv_room_${conv.id}`)
          .emit("presence", { userId, status: "offline" });
      }
      this.server
        .to(`user_room_${userId}`)
        .emit("presence", { userId, status: "offline" });
    } catch (e: any) {
      this.logger.warn(
        `Failed to broadcast offline presence for ${userId}: ${e.message}`,
      );
    }
  }

  @SubscribeMessage("authenticate")
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    try {
      const payload = this.jwtService.verify(data.token);
      const userId = payload.sub;
      const tenantId = payload.tenant_id;

      client.data.userId = userId;
      client.data.tenantId = tenantId;

      // 1. Join personal room (for direct notifications or new conversation alerts)
      client.join(`user_room_${userId}`);

      // 2. Fetch all user's conversations and join those rooms (Group & Direct)
      const convs = await this.messagingService.getConversationsForUser(
        userId,
        tenantId,
      );
      for (const conv of convs) {
        client.join(`conv_room_${conv.id}`);
      }

      // 3. Reference-counted presence: only announce "online" on the FIRST
      //    live socket for this user; announce current presence state to the
      //    connecting client so it can render accurate dots on load.
      const wasOffline = !this.onlineSockets.has(userId);
      if (!this.onlineSockets.has(userId)) {
        this.onlineSockets.set(userId, new Set());
      }
      this.onlineSockets.get(userId)!.add(client.id);

      const onlineUserIds = Array.from(this.onlineSockets.keys());
      client.emit("presence_snapshot", { onlineUserIds });

      if (wasOffline) {
        for (const conv of convs) {
          client
            .to(`conv_room_${conv.id}`)
            .emit("presence", { userId, status: "online" });
        }
      }

      this.logger.log(
        `User ${userId} authenticated on socket ${client.id} for tenant ${tenantId}`,
      );
      client.emit("authenticated", { status: "success", userId, tenantId });
    } catch (e) {
      client.emit("authenticated", {
        status: "error",
        message: "Invalid token",
      });
      client.disconnect();
    }
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; tempId?: string },
  ) {
    const userId = client.data?.userId;
    const tenantId = client.data?.tenantId;
    if (!userId || !tenantId) return; // Unauthenticated

    try {
      if (!data.conversationId || !data.content) {
        client.emit("message_error", {
          error: "conversationId and content are required.",
        });
        return;
      }
      if (typeof data.content !== "string" || data.content.length > 8000) {
        client.emit("message_error", { error: "Invalid message content." });
        return;
      }

      const message = await this.messagingService.saveMessage({
        senderId: userId,
        conversationId: data.conversationId,
        content: data.content,
        tenantId,
      });

      // Emits to all active sockets in the conversation room via Redis Pub/Sub
      // This will hit all users in the room across all clustered backend servers,
      // as well as all other tabs opened by the sender.
      this.server
        .to(`conv_room_${data.conversationId}`)
        .emit("new_message", message);

      // The sender's own read marker moves to this message implicitly.
      await this.messagingService.markConversationAsRead(
        data.conversationId,
        userId,
      );

      // Ack for optimistic-UI reconciliation.
      client.emit("message_sent", {
        id: message.id,
        tempId: data.tempId,
        conversationId: data.conversationId,
      });
    } catch (e: any) {
      this.logger.error(`Error sending message: ${e.message}`);
      client.emit("message_error", {
        error: e.message,
        tempId: data.tempId,
      });
    }
  }

  @SubscribeMessage("join_conversation")
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId) return;

    // IDOR guard: joining a room grants live access to every message in it, so
    // membership is enforced server-side, not just in the UI.
    const isMember = await this.messagingService.isConversationMember(
      data.conversationId,
      userId,
    );
    if (!isMember) {
      client.emit("join_conversation_error", {
        error: "You are not a member of this conversation.",
      });
      return;
    }

    client.join(`conv_room_${data.conversationId}`);
    client
      .to(`conv_room_${data.conversationId}`)
      .emit("presence", { userId, status: "online" });
  }

  @SubscribeMessage("typing")
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.conversationId) return;

    // Membership check: typing events reveal conversation existence + activity
    // to non-members otherwise (IDOR surface).
    const isMember = await this.messagingService.isConversationMember(
      data.conversationId,
      userId,
    );
    if (!isMember) return;

    client
      .to(`conv_room_${data.conversationId}`)
      .emit("typing", { conversationId: data.conversationId, userId });
  }

  @SubscribeMessage("stop_typing")
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.conversationId) return;
    client
      .to(`conv_room_${data.conversationId}`)
      .emit("stop_typing", { conversationId: data.conversationId, userId });
  }

  @SubscribeMessage("mark_read")
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.conversationId) return;

    const isMember = await this.messagingService.isConversationMember(
      data.conversationId,
      userId,
    );
    if (!isMember) return;

    await this.messagingService.markConversationAsRead(
      data.conversationId,
      userId,
    );
    // Tell the room so senders can flip pending → read ticks.
    this.server
      .to(`conv_room_${data.conversationId}`)
      .emit("conversation_read", {
        conversationId: data.conversationId,
        userId,
        readAt: new Date().toISOString(),
      });
  }
}
