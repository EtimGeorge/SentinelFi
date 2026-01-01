import { create } from 'zustand';
// import { getUnreadNotificationCount } from '../lib/notificationService'; // No longer needed for polling

interface UIState {
  isMobileSidebarOpen: boolean;
  isDesktopSidebarCollapsed: boolean;
  unreadNotificationsCount: number;
  socket: WebSocket | null; // NEW: WebSocket instance - Re-enabled
  socketConnected: boolean; // NEW: WebSocket connection status - Re-enabled

  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleDesktopSidebar: () => void;
  setUnreadNotificationsCount: (count: number) => void;
  // fetchUnreadNotificationsCount: () => Promise<void>; // REMOVED: Replaced by WebSocket

  // NEW: WebSocket actions - Re-enabled
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

const useUIStore = create<UIState>((set, get) => ({
  isMobileSidebarOpen: false,
  isDesktopSidebarCollapsed: false,
  unreadNotificationsCount: 0,
  socket: null, // Re-enabled
  socketConnected: false, // Re-enabled

  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
  toggleDesktopSidebar: () => set((state) => ({ isDesktopSidebarCollapsed: !state.isDesktopSidebarCollapsed })),
  setUnreadNotificationsCount: (count) => set({ unreadNotificationsCount: count }),

  // REMOVED POLLING MECHANISM
  // fetchUnreadNotificationsCount: async () => {
  //   try {
  //     const response = await getUnreadNotificationCount();
  //     get().setUnreadNotificationsCount(response.unreadCount);
  //   } catch (error) {
  //     console.error('Failed to fetch unread notification count:', error);
  //     get().setUnreadNotificationsCount(0);
  //   }
  // },

  // Re-enabling WebSocket connection
  connectWebSocket: () => {
    if (get().socketConnected && get().socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected.');
      return;
    }

    // Connect to backend WebSocket endpoint
    const WS_URL = 'ws://localhost:3001/ws-notifications'; // Using port 3001 for backend
    const newSocket = new WebSocket(WS_URL);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      set({ socket: newSocket, socketConnected: true });
      // Optionally, fetch initial unread count via REST if not sent on connect
      // get().fetchUnreadNotificationsCount();
    };

    newSocket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'UNREAD_COUNT_UPDATE' && typeof message.count === 'number') {
          set({ unreadNotificationsCount: message.count });
        }
        // Handle other message types as needed
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ socketConnected: false });
      // Attempt to reconnect after a delay, but implement backoff
      setTimeout(() => get().connectWebSocket(), 5000);
    };

    newSocket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      set({ socket: null, socketConnected: false });
      // Attempt to reconnect only if not intentionally disconnected
      if (!event.wasClean) {
        setTimeout(() => get().connectWebSocket(), 5000);
      }
    };

    set({ socket: newSocket }); // Set socket even before it's open
  },

  disconnectWebSocket: () => {
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'Client disconnected'); // 1000 is normal closure
    }
    set({ socket: null, socketConnected: false, unreadNotificationsCount: 0 });
  },
}));

export default useUIStore;
