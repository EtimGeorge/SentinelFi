import api from './api';

export const getUnreadNotificationCount = async (): Promise<{ unreadCount: number }> => {
  try {
    // This endpoint needs to be implemented in the backend.
    // For now, it's a placeholder.
    const response = await api.get('/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    // Return a default or throw an error based on desired behavior
    return { unreadCount: 0 };
  }
};
