import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, WebSocket } from "ws";
import { Logger, Inject, forwardRef } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@WebSocketGateway({
  path: "/ws-notifications",
  cors: {
    origin: (origin: string, callback) => {
      const allowed = NotificationsGateway.allowedOrigins;
      callback(null, !origin || allowed.includes(origin));
    },
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  private static _allowedOrigins: string[] | null = null;

  /**
   * Resolve (once) the allowlist of WS origins. Derived from FRONTEND_URL plus
   * FRONTEND_ALLOWED_ORIGINS (comma-separated, optional). Evaluated lazily at
   * first connection — by then ConfigModule has loaded the .env into
   * process.env. Falls back to the local dev origin.
   */
  static getAllowedOrigins(): string[] {
    if (!this._allowedOrigins) {
      const primary =
        process.env.FRONTEND_URL?.split(",").map((s) => s.trim()) || [];
      const extra = (process.env.FRONTEND_ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const merged = [...primary, ...extra].filter(Boolean);
      this._allowedOrigins =
        merged.length > 0 ? merged : ["http://localhost:3000"];
    }
    return this._allowedOrigins;
  }

  static get allowedOrigins(): string[] {
    return this.getAllowedOrigins();
  }

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log("Client connected to WebSocket.");
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log("Client disconnected from WebSocket.");
  }

  @SubscribeMessage("message")
  handleMessage(client: WebSocket, payload: any): string {
    this.logger.log(`Received message from client: ${payload}`);
    client.send(
      JSON.stringify({ event: "ack", data: `Message received: ${payload}` }),
    );
    return "Hello world!";
  }

  emitUnreadCountUpdate(count: number) {
    if (!this.server || !this.server.clients) {
      this.logger.warn(
        "WebSocket server not ready; unread count update skipped.",
      );
      return;
    }
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "UNREAD_COUNT_UPDATE", count }));
      }
    });
  }

  emitVarianceAlert(alert: {
    title: string;
    message: string;
    type: string;
    metadata?: any;
  }) {
    if (!this.server || !this.server.clients) {
      this.logger.warn("WebSocket server not ready; variance alert skipped.");
      return;
    }
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(alert));
      }
    });
  }
}
