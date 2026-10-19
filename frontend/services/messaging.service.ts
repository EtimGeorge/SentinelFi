import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../components/context/AuthContext';
import api from '../lib/api';
import { resolveMessagingWsOrigin } from '../lib/ws-url';

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
    /** Server-computed count of messages newer than the viewer's last_read_at. */
    unread_count?: number;
    /** Trimmed preview of the newest message in the conversation. */
    last_message_preview?: string;
    last_message_at?: string;
    /** The viewing user's own read marker (for receipt rendering). */
    viewer_last_read_at?: string | null;
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

const TYPING_RESET_MS = 4000;

export const useMessaging = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);

    const socketRef = useRef<Socket | null>(null);
    // Ref mirror of activeConversationId so the socket effect does not
    // re-run (reconnect!) whenever the user opens a different conversation.
    const activeIdRef = useRef<string | null>(null);
    activeIdRef.current = activeConversationId;
    const conversationsRef = useRef<Conversation[]>([]);
    conversationsRef.current = conversations;
    const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const recomputeTotalUnread = useCallback((convs: Conversation[]) => {
        setTotalUnread(convs.reduce((sum, c) => sum + (c.unread_count ?? 0), 0));
    }, []);

    const setActiveConversationId = useCallback((id: string | null) => {
        setActiveConversationIdState(id);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('sentinelfi_auth_token') || '';
        if (!token || !user) return;

        const wsUrl = resolveMessagingWsOrigin();

        const newSocket = io(wsUrl, {
            path: '/ws-messaging', transports: ['websocket'], autoConnect: true, reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000, reconnectionDelayMax: 5000,
        });

        const bumpTyping = (conversationId: string, userId: string) => {
            setTypingUsers((prev) => {
                const list = prev[conversationId] ?? [];
                if (list.includes(userId)) return prev;
                return { ...prev, [conversationId]: [...list, userId] };
            });
            // Auto-expire so a crashed client doesn't leave a stuck indicator.
            const existing = typingTimeoutsRef.current[`${conversationId}:${userId}`];
            if (existing) clearTimeout(existing);
            typingTimeoutsRef.current[`${conversationId}:${userId}`] = setTimeout(() => {
                setTypingUsers((prev) => ({
                    ...prev,
                    [conversationId]: (prev[conversationId] ?? []).filter((u) => u !== userId),
                }));
            }, TYPING_RESET_MS);
        };

        const clearTyping = (conversationId: string, userId: string) => {
            const existing = typingTimeoutsRef.current[`${conversationId}:${userId}`];
            if (existing) clearTimeout(existing);
            setTypingUsers((prev) => ({
                ...prev,
                [conversationId]: (prev[conversationId] ?? []).filter((u) => u !== userId),
            }));
        };

        newSocket.on('connect', () => {
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

        newSocket.on('presence_snapshot', (data: { onlineUserIds: string[] }) => {
            setOnlineUsers(new Set(data.onlineUserIds ?? []));
        });

        newSocket.on('presence', (data: { userId: string; status: 'online' | 'offline' }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                if (data.status === 'online') next.add(data.userId);
                else next.delete(data.userId);
                return next;
            });
        });

        newSocket.on('new_message', (message: Message) => {
            clearTyping(message.conversation_id, message.sender_id);

            // Active conversation: append to the open thread.
            if (message.conversation_id === activeIdRef.current) {
                setMessages((prev) =>
                    prev.some((m) => m.id === message.id) ? prev : [...prev, message],
                );
            }

            setConversations((prev) => {
                const index = prev.findIndex((c) => c.id === message.conversation_id);
                if (index === -1) {
                    // Unknown conversation (e.g. someone started a direct chat
                    // with us) — pull the list so the badge/items appears.
                    fetchConversations();
                    return prev;
                }
                const conv = { ...prev[index] };
                conv.last_activity_at = message.created_at;
                conv.last_message_preview = String(message.content || '').slice(0, 120);
                conv.last_message_at = message.created_at;
                // Incoming from someone else in a non-open conversation → unread.
                if (message.sender_id !== user.id && message.conversation_id !== activeIdRef.current) {
                    conv.unread_count = (conv.unread_count ?? 0) + 1;
                }
                const next = [...prev];
                next.splice(index, 1);
                recomputeTotalUnread(next);
                return next;
            });
        });

        newSocket.on('conversation_read', (data: { conversationId: string; userId: string; readAt: string }) => {
            // A member read the thread — update their marker for receipts.
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === data.conversationId
                        ? {
                            ...c,
                            members: c.members.map((m) =>
                                m.user_id === data.userId
                                    ? { ...m, last_read_at: data.readAt }
                                    : m,
                            ),
                        }
                        : c,
                ),
            );
        });

        newSocket.on('typing', (data: { conversationId: string; userId: string }) => {
            if (data.userId === user.id) return;
            bumpTyping(data.conversationId, data.userId);
        });

        newSocket.on('stop_typing', (data: { conversationId: string; userId: string }) => {
            clearTyping(data.conversationId, data.userId);
        });

        newSocket.on('message_sent', (ack: { tempId?: string; id?: string; conversationId?: string }) => {
            clearTyping(ack.conversationId ?? '', user.id);
        });

        newSocket.on('message_error', (err: { error: string; tempId?: string }) => {
            console.warn('[Messaging] message_error:', err.error);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        socketRef.current = newSocket;

        return () => {
            Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
            typingTimeoutsRef.current = {};
            newSocket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await api.get('/messaging/conversations');
            const list: Conversation[] = response.data ?? [];
            setConversations(list);
            setTotalUnread(list.reduce((sum, c) => sum + (c.unread_count ?? 0), 0));
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        }
    }, []);

    const fetchHistory = useCallback(async (conversationId: string) => {
        try {
            const response = await api.get(`/messaging/conversations/${conversationId}/history`);
            const list: Message[] = response.data ?? [];
            setMessages(list);
            setActiveConversationIdState(conversationId);
            // History length == server page size means more pages may exist.
            setHasMoreHistory(list.length >= 50);

            // Mark as read: clears server-side unread and notifies the room.
            api.patch(`/messaging/conversations/${conversationId}/read`).catch(() => { });
            const previousUnread = conversationsRef.current.find((c) => c.id === conversationId)?.unread_count ?? 0;
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === conversationId ? { ...c, unread_count: 0 } : c,
                ),
            );
            setTotalUnread((prev) => Math.max(0, prev - previousUnread));
        } catch (error) {
            console.error('Failed to fetch chat history', error);
        }
    }, []);

    /**
     * Cursor pagination: load messages older than the oldest currently
     * loaded one and prepend them.
     */
    const loadEarlier = useCallback(async () => {
        const conversationId = activeIdRef.current;
        const oldest = messages[0];
        if (!conversationId || !oldest || isLoadingEarlier) return;
        setIsLoadingEarlier(true);
        try {
            const response = await api.get(
                `/messaging/conversations/${conversationId}/history`,
                { params: { before: new Date(oldest.created_at).toISOString(), limit: 50 } },
            );
            const older: Message[] = response.data ?? [];
            if (older.length > 0) {
                setMessages((prev) => [...older, ...prev]);
            }
            setHasMoreHistory(older.length >= 50);
        } catch (error) {
            console.error('Failed to load earlier messages', error);
        } finally {
            setIsLoadingEarlier(false);
        }
    }, [messages, isLoadingEarlier]);

    const emitTyping = useCallback((conversationId: string) => {
        socketRef.current?.emit('typing', { conversationId });
    }, []);

    const emitStopTyping = useCallback((conversationId: string) => {
        socketRef.current?.emit('stop_typing', { conversationId });
    }, []);

    const emitMarkRead = useCallback((conversationId: string) => {
        socketRef.current?.emit('mark_read', { conversationId });
    }, []);

    const sendMessage = useCallback((conversationId: string, content: string, tempId?: string) => {
        if (!socketRef.current) return;
        socketRef.current.emit('send_message', { conversationId, content, tempId });
    }, []);

    const createConversation = useCallback(async (userIds: string[], name?: string) => {
        // Resolve any email/username identifiers to UUIDs via tenant directory (defensive, backend also resolves)
        const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
        let resolvedIds = userIds;
        const hasEmail = userIds.some((id) => id.includes('@'));
        if (hasEmail) {
            try {
                const dir = await api.get('/tenant/users');
                const emailMap = new Map<string, string>((dir.data || []).map((u: any) => [u.email?.toLowerCase(), u.id]));
                const usernameMap = new Map<string, string>((dir.data || []).map((u: any) => [(u as any).username?.toLowerCase(), u.id]));
                resolvedIds = userIds.map((id) => {
                    if (id.includes('@')) return emailMap.get(id.toLowerCase()) || id;
                    if ((id.includes('\\') || id.includes('/'))) return usernameMap.get(id.toLowerCase()) || id;
                    return id;
                });
            } catch (_) { /* backend will attempt lookup */ }
        }
        // Filter synthetic SYSTEM and non-UUID/non-email that would 400
        resolvedIds = resolvedIds.filter((id) => id !== 'SYSTEM' && (isUuid(id) || id.includes('@')));
        if (resolvedIds.length === 0 && userIds.length > 0) {
            console.warn('[Messaging] All userIds filtered as synthetic, aborting createConversation');
            throw new Error('No valid user identifiers');
        }
        try {
            const response = await api.post('/messaging/conversations', { userIds: resolvedIds, name });
            const newConv: Conversation = (response as any).data ?? response;

            setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);

            // Join the room for live delivery of the newly created thread.
            if (socketRef.current) {
                socketRef.current.emit('join_conversation', { conversationId: newConv.id });
            }

            return newConv;
        } catch (error: any) {
            const status = error?.response?.status;
            const msg = error?.response?.data?.message;
            if (status === 400) {
                console.warn('[Messaging] Validation failed:', msg);
            } else if (status === 403) {
                console.warn('[Messaging] Forbidden, cross-tenant or not allowed:', msg);
            } else {
                console.error('Failed to create conversation', error);
            }
            throw error;
        }
    }, []);

    return {
        messages, conversations, sendMessage, isConnected, fetchHistory, fetchConversations, createConversation,
        activeConversationId, setActiveConversationId,
        // New capabilities
        typingUsers, onlineUsers, hasMoreHistory, isLoadingEarlier, loadEarlier,
        emitTyping, emitStopTyping, emitMarkRead, totalUnread,
    };
};
