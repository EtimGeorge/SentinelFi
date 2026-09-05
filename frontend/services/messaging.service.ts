import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../components/context/AuthContext';
import api from '../lib/api';

export interface Message {
    id: string;
    sender_id: string;
    conversation_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
    metadata?: any;
    sender?: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

export interface Conversation {
    id: string;
    tenant_id: string;
    type: 'DIRECT' | 'GROUP';
    name?: string;
    last_activity_at: string;
    members: ConversationMember[];
}

export interface ConversationMember {
    id: string;
    user_id: string;
    user: {
        id: string;
        first_name: string;
        last_name: string;
    };
    last_read_at?: string;
    joined_at: string;
}

export const useMessaging = () => {
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('sentinelfi_auth_token') || '';
        if (!token || !user) return;

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
        
        // Initialize Socket.io client
        const newSocket = io(wsUrl, {
            path: '/ws-messaging',
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        newSocket.on('connect', () => {
            console.log('Socket.io connected:', newSocket.id);
            newSocket.emit('authenticate', { token });
        });

        newSocket.on('authenticated', (data) => {
            if (data.status === 'success') {
                setIsConnected(true);
                fetchConversations();
            } else {
                console.error('Socket authentication failed:', data.message);
                setIsConnected(false);
            }
        });

        newSocket.on('new_message', (message: Message) => {
            // Update messages list if it belongs to active conversation
            if (message.conversation_id === activeConversationId) {
                setMessages((prev) => [...prev, message]);
            }
            
            // Re-order conversations to put this one at top
            setConversations((prev) => {
                const index = prev.findIndex(c => c.id === message.conversation_id);
                if (index === -1) {
                    // If conversation not in list, we might need to fetch it
                    // For now, let's just trigger a re-fetch of conversations
                    fetchConversations();
                    return prev;
                }
                const newConversations = [...prev];
                const conv = { ...newConversations[index], last_activity_at: message.created_at };
                newConversations.splice(index, 1);
                return [conv, ...newConversations];
            });
        });

        newSocket.on('presence', (data: { userId: string, status: 'online' | 'offline' }) => {
            console.log(`User ${data.userId} is ${data.status}`);
            // In a real UI, you'd update a presence subset of state here
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Socket.io disconnected');
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user, activeConversationId]);

    const fetchConversations = async () => {
        try {
            const response = await api.get('/messaging/conversations');
            setConversations(response.data);
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        }
    };

    const fetchHistory = async (conversationId: string) => {
        try {
            const response = await api.get(`/messaging/conversations/${conversationId}/history`);
            setMessages(response.data);
            setActiveConversationId(conversationId);
            
            // Mark as read
            api.patch(`/messaging/conversations/${conversationId}/read`).catch(console.error);
        } catch (error) {
            console.error('Failed to fetch chat history', error);
        }
    };

    const sendMessage = useCallback((conversationId: string, content: string) => {
        if (socket && isConnected) {
            socket.emit('send_message', {
                conversationId,
                content
            });
        }
    }, [socket, isConnected]);

    const createConversation = async (userIds: string[], name?: string) => {
        // Resolve any email/username identifiers to UUIDs via tenant directory (defensive – backend also resolves)
        const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
        let resolvedIds = userIds;
        const hasEmail = userIds.some(id => id.includes('@'));
        const hasUsername = userIds.some(id => id.includes('\\') || id.includes('/'));
        if (hasEmail) {
          try {
            const dir = await api.get('/tenant/users');
            const emailMap = new Map<string,string>((dir.data || []).map((u:any)=>[u.email?.toLowerCase(), u.id]));
            const usernameMap = new Map<string,string>((dir.data || []).map((u:any)=>[(u as any).username?.toLowerCase(), u.id]));
            resolvedIds = userIds.map(id => {
              if (id.includes('@')) return emailMap.get(id.toLowerCase()) || id;
              if ((id.includes('\\') || id.includes('/')) || (id as string).includes('@')) return usernameMap.get(id.toLowerCase()) || id;
              return id;
            });
          } catch (_) { /* backend will attempt lookup */ }
        }
        // Filter synthetic SYSTEM and non-UUID/non-email that would 400
        resolvedIds = resolvedIds.filter(id => id !== 'SYSTEM' && (isUuid(id) || id.includes('@')));
        if (resolvedIds.length === 0 && userIds.length > 0) {
          console.warn('[Messaging] All userIds filtered as synthetic – aborting createConversation');
          throw new Error('No valid user identifiers');
        }
        try {
            const response = await api.post('/messaging/conversations', { userIds: resolvedIds, name });
            const newConv = (response as any).data ?? response;
            
            setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
            
            // Join the room dynamically
            if (socket) {
                socket.emit('join_conversation', { conversationId: newConv.id });
            }
            
            return newConv;
        } catch (error: any) {
            const status = error?.response?.status;
            const msg = error?.response?.data?.message;
            if (status === 400) {
              console.warn('[Messaging] Validation failed:', msg);
            } else if (status === 403) {
              console.warn('[Messaging] Forbidden — cross-tenant or not allowed:', msg);
            } else {
              console.error('Failed to create conversation', error);
            }
            throw error;
        }
    };

    return { 
        messages, 
        conversations,
        sendMessage, 
        isConnected, 
        fetchHistory, 
        fetchConversations,
        createConversation,
        activeConversationId,
        setActiveConversationId
    };
};

