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

@WebSocketGateway({
  path: "/ws-messaging", // We'll keep this path for backward compatibility with frontend proxy
  cors: {
    origin: "*",
    credentials: true,
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`New messaging client connecting: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = client.data?.userId;
    if (userId) {
      // In a real system, you'd track if this was their LAST active socket
      // before emitting an offline status via Redis presence tracking.
      // For now, we rely on the client emitting an offline event or leaving the room.
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
      const convs = await this.messagingService.getConversationsForUser(userId, tenantId);
      for (const conv of convs) {
        client.join(`conv_room_${conv.id}`);
        // Notify others in this conversation that user is online
        client.to(`conv_room_${conv.id}`).emit("presence", { userId, status: "online" });
      }

      this.logger.log(`User ${userId} authenticated on socket ${client.id} for tenant ${tenantId}`);
      client.emit("authenticated", { status: "success", userId, tenantId });

    } catch (e) {
      client.emit("authenticated", { status: "error", message: "Invalid token" });
      client.disconnect();
    }
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string, content: string },
  ) {
    const userId = client.data?.userId;
    const tenantId = client.data?.tenantId;
    if (!userId || !tenantId) return; // Unauthenticated
    
    try {
      const message = await this.messagingService.saveMessage({
          senderId: userId,
          conversationId: data.conversationId,
          content: data.content,
          tenantId,
      });

      // Emits to all active sockets in the conversation room via Redis Pub/Sub
      // This will hit all users in the room across all clustered backend servers,
      // as well as all other tabs opened by the sender.
      this.server.to(`conv_room_${data.conversationId}`).emit("new_message", message);
      
      // We don't necessarily need a "message_sent" ack if the sender gets it via "new_message",
      // but providing an ack is good practice for UI immediate confirmation.
      client.emit("message_sent", { id: message.id, tempId: (data as any).tempId });
    } catch (e: any) {
      this.logger.error(`Error sending message: ${e.message}`);
      client.emit("message_error", { error: e.message, tempId: (data as any).tempId });
    }
  }

  @SubscribeMessage("join_conversation")
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    // Called when a user dynamically creates or is added to a new conversation
    client.join(`conv_room_${data.conversationId}`);
    client.to(`conv_room_${data.conversationId}`).emit("presence", { userId: client.data.userId, status: "online" });
  }
}
