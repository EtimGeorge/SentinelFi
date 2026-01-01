import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/platform-ws'; // Use @nestjs/platform-ws for WebSocket support
import { Server, WebSocket } from 'ws'; // Import WebSocket and Server from 'ws'
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@WebSocketGateway(3001, { // Port for WebSocket (should match frontend)
  path: '/ws-notifications', // Path for WebSocket (should match frontend)
  cors: {
    origin: 'http://localhost:3000', // Allow frontend origin
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log('Client connected to WebSocket.');
    // TODO: Implement authentication (e.g., validate JWT from query params or cookie)
    // For now, connections are accepted, but real authentication is crucial.
    // client.id = someValidatedUserId; // Assign a user ID after authentication
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Client disconnected from WebSocket.');
    // TODO: Clean up client-specific resources if any
  }

  @SubscribeMessage('message') // Example message handler
  handleMessage(client: WebSocket, payload: any): string {
    this.logger.log(`Received message from client: ${payload}`);
    // Example: send a response back
    client.send(JSON.stringify({ event: 'ack', data: `Message received: ${payload}` }));
    return 'Hello world!';
  }

  // Example method to emit a notification to all connected clients
  // In a real application, this would be triggered by a service or event.
  emitUnreadCountUpdate(count: number) {
    this.server.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'UNREAD_COUNT_UPDATE', count }));
      }
    });
  }
}
