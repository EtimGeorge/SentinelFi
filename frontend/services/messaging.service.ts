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
        try {
            const response = await api.post('/messaging/conversations', { userIds, name });
            const newConv = response.data;
            
            setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
            
            // Join the room dynamically
            if (socket) {
                socket.emit('join_conversation', { conversationId: newConv.id });
            }
            
            return newConv;
        } catch (error) {
            console.error('Failed to create conversation', error);
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

