# ARCH-006: Notifications & Real-Time Sync

SentinelFi provides instantaneous financial alerts and status updates across the enterprise through a high-performance, low-latency **WebSocket** infrastructure.

## 📡 Protocol Architecture

Unlike traditional REST-polling, SentinelFi leverages the **raw `ws` protocol** (WebSockets) via `@nestjs/websockets`.

### Why raw WebSockets?
- **Efficiency**: Minimal overhead compared to Socket.io or long-polling.
- **Reliability**: Direct, persistent connection for critical variance alerts.
- **Scaling**: Easier to horizontal-scale behind a load balancer with standard sticky sessions.

## 🔔 Notification Pipeline

The real-time synchronization is split into the **Gateway** and the **Service**.

### 1. NotificationsGateway
- **Path**: `/ws-notifications`
- **Role**: Manages active socket connections and maps them to internal system events.
- **Safety**: Includes heartbeat monitoring and automatic reconnection logic.

### 2. NotificationsService
- **Role**: Handlers for complex notification business logic (e.g., determining which manager to notify about a budget variance).
- **Persistence**: Notifications are stored in the database for later "mark-as-read" retrieval, even if the user was offline during the event.

## ⚡ Main Event Types

The following events are broadcast to connected clients:
- **`UNREAD_COUNT_UPDATE`**: Refreshes the notification bell icon (red badge).
- **`varianceAlert`**: Triggers a high-priority UI toast when a project exceeds its burn-rate threshold.
- **`DOCUMENT_READY`**: Notifies the user when an expensive, long-running PDF export is complete and ready for download.

## 🔒 Multi-Tenant Scoping

While the initial implementation utilizes a global broadcast for administrative alerts, the architectural roadmap supports **Room-Based Scoping**:
- **Tenant Room**: Broadcast only to users within a specific Tenant ID.
- **User Room**: Direct notification to a specific user (e.g., "Your requisition was approved").

---

- **Service**: `backend/src/notifications/notifications.service.ts`
- **Gateway**: `backend/src/notifications/notifications.gateway.ts`
- **Frontend Hook**: `frontend/hooks/useNotifications.ts`
