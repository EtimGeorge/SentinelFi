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

@WebSocketGateway(3001, {
  path: "/ws-notifications",
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

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
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "UNREAD_COUNT_UPDATE", count }));
      }
    });
  }

  emitVarianceAlert(alert: { title: string; message: string; type: string }) {
    this.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(alert));
        }
      });
  }
}