import { create } from 'zustand';
// import { getUnreadNotificationCount } from '../lib/notificationService'; // No longer needed for polling

interface UIState {
  isMobileSidebarOpen: boolean;
  isDesktopSidebarCollapsed: boolean;
  unreadNotificationsCount: number;
  socket: WebSocket | null;
  socketConnected: boolean;

  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleDesktopSidebar: () => void;
  setUnreadNotificationsCount: (count: number) => void;

  connectWebSocket: () => void;
  disconnectWebSocket: () => void;

  // AI Widget State
  isAiAssistantOpen: boolean;
  toggleAiAssistant: () => void;
  setAiAssistantOpen: (isOpen: boolean) => void;

  // NEW: Reconnection state
  reconnectAttempts: number;
  reconnectTimeoutId: NodeJS.Timeout | null;
}

const useUIStore = create<UIState>((set, get) => ({
  isMobileSidebarOpen: false,
  isDesktopSidebarCollapsed: false,
  unreadNotificationsCount: 0,
  socket: null,
  socketConnected: false,
  reconnectAttempts: 0, // Initialize
  reconnectTimeoutId: null, // Initialize

  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
  toggleDesktopSidebar: () => set((state) => ({ isDesktopSidebarCollapsed: !state.isDesktopSidebarCollapsed })),
  setUnreadNotificationsCount: (count) => set({ unreadNotificationsCount: count }),

  isAiAssistantOpen: false,
  toggleAiAssistant: () => set((state) => ({ isAiAssistantOpen: !state.isAiAssistantOpen })),
  setAiAssistantOpen: (isOpen) => set({ isAiAssistantOpen: isOpen }),

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
    const state = get();
    
    if (state.socketConnected && state.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected.');
      return;
    }

    // Clear any existing reconnection timeout
    if (state.reconnectTimeoutId) {
      clearTimeout(state.reconnectTimeoutId);
      set({ reconnectTimeoutId: null });
    }

    // Connect to backend WebSocket endpoint
    const WS_URL = 'ws://localhost:3001/ws-notifications'; // Using port 3001 for backend
    const newSocket = new WebSocket(WS_URL);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      set({ 
        socket: newSocket, 
        socketConnected: true,
        reconnectAttempts: 0 // ✅ Reset on successful connection
      });
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
      // Note: onclose will also be triggered after onerror, handling reconnection
    };

    newSocket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      set({ socket: null, socketConnected: false });
      
      // ✅ Only reconnect if not intentionally disconnected
      if (!event.wasClean) {
        const currentAttempts = get().reconnectAttempts;
        const nextAttempt = currentAttempts + 1;
        
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
        const delay = Math.min(1000 * Math.pow(2, currentAttempts), 30000);
        
        console.log(`Reconnection attempt ${nextAttempt} in ${delay}ms`);
        
        const timeoutId = setTimeout(() => {
          set({ reconnectAttempts: nextAttempt });
          get().connectWebSocket();
        }, delay);
        
        set({ reconnectTimeoutId: timeoutId });
      }
    };

    set({ socket: newSocket }); // Set socket even before it's open
  },

  disconnectWebSocket: () => {
    const state = get();
    
    // Clear reconnection timeout
    if (state.reconnectTimeoutId) {
      clearTimeout(state.reconnectTimeoutId);
    }
    
    const socket = state.socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'Client disconnected');
    }
    
    set({ 
      socket: null, 
      socketConnected: false, 
      unreadNotificationsCount: 0,
      reconnectAttempts: 0, // Reset attempts on intentional disconnect
      reconnectTimeoutId: null // Clear timeout id
    });
  },
}));

export default useUIStore;
