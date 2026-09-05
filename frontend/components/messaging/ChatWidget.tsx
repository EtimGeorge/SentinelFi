import React, { useState, useEffect, useRef } from 'react';
import { useMessaging, Message, Conversation } from '../../services/messaging.service';
import { useAuth } from '../context/AuthContext';
import { useSecuredApi } from '../hooks/useSecuredApi';
import { Users, Search, MessageCircle, X, Send, Loader2, Plus, ArrowLeft, Check, CheckCircle2 } from 'lucide-react';
import Tooltip from '../common/Tooltip';

interface ChatWidgetProps {
  initialRecipientId?: string;
  initialRecipientName?: string;
  initialConversationId?: string;
}

type ViewMode = 'CONVERSATIONS' | 'DIRECTORY' | 'CHAT';

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  initialRecipientId, 
  initialRecipientName,
  initialConversationId 
}) => {
  const { user } = useAuth();
  const { 
    messages, 
    conversations, 
    sendMessage, 
    isConnected, 
    fetchHistory, 
    createConversation,
    activeConversationId,
    setActiveConversationId
  } = useMessaging();
  const api = useSecuredApi();
  
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('CONVERSATIONS');
  const [inputValue, setInputValue] = useState('');
  
  // Directory State
  const [directory, setDirectory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync with props if they change
  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      setViewMode('CHAT');
      setIsOpen(true);
    } else if (initialRecipientId) {
      // Guard: ignore synthetic SYSTEM identifier and non-UUID values that would 400
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(initialRecipientId);
      const isEmail = initialRecipientId.includes('@');
      if (initialRecipientId === 'SYSTEM' || (!isUuid && !isEmail)) {
        console.debug('[ChatWidget] Skipping direct chat start for non-resolvable id:', initialRecipientId);
        return;
      }
      handleDirectChatStart(initialRecipientId);
      setIsOpen(true);
    }
  }, [initialConversationId, initialRecipientId]);

  // Handle auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, viewMode]);

  const fetchDirectory = async () => {
    try {
      setLoadingDirectory(true);
      const res = await api.get('/tenant/users'); 
      const others = res.data.filter((u: any) => u.id !== user?.id);
      setDirectory(others);
    } catch (err) {
      console.error('Failed to fetch user directory for chat', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const handleDirectChatStart = async (targetUserId: string) => {
    // Resolve email/usernames to UUID via directory cache if needed
    let resolvedId = targetUserId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId);
    if (!isUuid && targetUserId.includes('@')) {
      try {
        // Attempt to resolve email to UUID via tenant users endpoint
        const res = await api.get(`/tenant/users`);
        const match = (res.data || []).find((u: any) => u.email?.toLowerCase() === targetUserId.toLowerCase());
        if (match?.id) resolvedId = match.id;
      } catch (_) { /* fallback to raw value, backend will resolve */ }
    }
    if (resolvedId === 'SYSTEM') return;
    try {
      const conv = await createConversation([resolvedId]);
      setActiveConversationId(conv.id);
      fetchHistory(conv.id);
      setViewMode('CHAT');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 || status === 403) {
        console.warn('[ChatWidget] Cannot start chat:', err?.response?.data?.message || err.message);
      } else {
        console.error('Failed to start direct chat', err);
      }
    }
  };

  const handleGroupCreate = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      const conv = await createConversation(selectedUserIds);
      setActiveConversationId(conv.id);
      fetchHistory(conv.id);
      setViewMode('CHAT');
      setSelectedUserIds([]);
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = () => {
    if (inputValue.trim() && activeConversationId) {
      sendMessage(activeConversationId, inputValue);
      setInputValue('');
    }
  };

  const openConversation = (convId: string) => {
    setActiveConversationId(convId);
    fetchHistory(convId);
    setViewMode('CHAT');
  };

  const filteredDirectory = directory.filter(u => 
    (u.first_name + ' ' + u.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const getChatTitle = () => {
    if (!activeConversation) return 'Chat';
    if (activeConversation.type === 'GROUP') return activeConversation.name || 'Group Chat';
    const otherMember = activeConversation.members.find(m => m.user_id !== user?.id);
    return otherMember ? `${otherMember.user.first_name} ${otherMember.user.last_name}` : 'Direct Chat';
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] transition-all duration-500 ease-in-out ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-2'}`}>
      {!isOpen ? (
        <Tooltip content="Open Messages" position="left">
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-2xl hover:bg-brand-primary/90 hover:scale-105 transition-all outline-none focus:ring-4 focus:ring-brand-primary/30 group"
          >
            <MessageCircle className="w-6 h-6 group-hover:animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
          </button>
        </Tooltip>
      ) : (
        <div className="flex flex-col w-[360px] max-h-[calc(100vh-100px)] h-[580px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden transform origin-bottom-right transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white z-10">
            <div className="flex items-center gap-3">
              {viewMode !== 'CONVERSATIONS' && (
                <button 
                  onClick={() => setViewMode('CONVERSATIONS')}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <span className="font-black tracking-widest text-[10px] uppercase">
                {viewMode === 'CONVERSATIONS' ? 'Messages' : viewMode === 'DIRECTORY' ? 'New Message' : getChatTitle()}
              </span>
            </div>
            <Tooltip content="Close" position="bottom">
              <button onClick={() => setIsOpen(false)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          <div className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">
            {/* Background Image & Overlay */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-700"
              style={{ backgroundImage: 'url("/AI-DEGITAL-WALLPAPER.jpeg")' }}
            />
            <div className="absolute inset-0 z-0 bg-slate-900/80 backdrop-blur-[2px]" />
            
            {/* CONVERSATIONS LIST */}
            {viewMode === 'CONVERSATIONS' && (
              <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300 z-10">
                <div className="p-4 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-tighter">Recent Chats</h3>
                  <button 
                    onClick={() => { setViewMode('DIRECTORY'); fetchDirectory(); }}
                    className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary/20 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                  {conversations.length > 0 ? (
                    conversations.map(conv => {
                      const isGroup = conv.type === 'GROUP';
                      const otherMember = conv.members.find(m => m.user_id !== user?.id);
                      const name = isGroup ? (conv.name || 'Group Chat') : `${otherMember?.user.first_name} ${otherMember?.user.last_name}`;
                      
                      return (
                        <button 
                          key={conv.id}
                          onClick={() => openConversation(conv.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${activeConversationId === conv.id ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'hover:bg-slate-100'}`}
                        >
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-brand-primary/10 text-brand-primary'}`}>
                            {isGroup ? <Users className="w-5 h-5" /> : name?.[0]}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-brand-primary transition-colors">{name}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {conv.type === 'GROUP' ? `${conv.members.length} members` : 'Direct Message'}
                            </p>
                          </div>
                          <div className="text-[9px] text-slate-300 font-medium">
                            {new Date(conv.last_activity_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center opacity-40">
                      <MessageCircle className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-xs text-slate-500 font-medium">No conversations yet.</p>
                      <button 
                        onClick={() => { setViewMode('DIRECTORY'); fetchDirectory(); }}
                        className="mt-4 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline"
                      >
                        Start a chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DIRECTORY / GROUP CREATION */}
            {viewMode === 'DIRECTORY' && (
              <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300 z-10">
                <div className="p-4 bg-white border-b border-slate-100 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search team..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                    />
                  </div>
                  
                  {selectedUserIds.length > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {selectedUserIds.length} users selected
                      </p>
                      <button 
                        onClick={handleGroupCreate}
                        className="px-3 py-1.5 bg-brand-primary text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
                      >
                        Create {selectedUserIds.length > 1 ? 'Group' : 'Chat'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {loadingDirectory ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-primary opacity-50" /></div>
                  ) : filteredDirectory.length > 0 ? (
                    <div className="space-y-1">
                      {filteredDirectory.map((member) => {
                        const isSelected = selectedUserIds.includes(member.id);
                        return (
                          <button 
                            key={member.id} 
                            onClick={() => toggleUserSelection(member.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${isSelected ? 'bg-brand-primary/5 ring-1 ring-brand-primary/20' : 'hover:bg-slate-100'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center font-black text-xs uppercase transition-all ${isSelected ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {isSelected ? <Check className="w-5 h-5" /> : `${member.first_name[0]}${member.last_name[0]}`}
                              </div>
                              <div className="text-left">
                                <p className={`text-xs font-bold transition-colors ${isSelected ? 'text-brand-primary' : 'text-slate-900 group-hover:text-brand-primary'}`}>{member.first_name} {member.last_name}</p>
                                <p className="text-[10px] text-slate-500">{member.role || 'Team Member'}</p>
                              </div>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-200 group-hover:border-brand-primary/50" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-400">No team members found.</div>
                  )}
                </div>
              </div>
            )}

            {/* CHAT INTERFACE */}
            {viewMode === 'CHAT' && activeConversationId && (
              <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 z-10">
                <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                         <MessageCircle className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">End-to-End Secure</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Messages are only visible to<br/>members of this conversation.</p>
                    </div>
                  ) : (
                    messages.map((msg: Message, idx) => {
                      const isMe = msg.sender_id === user?.id;
                      const showAvatar = idx === 0 || messages[idx-1].sender_id !== msg.sender_id;
                      
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {showAvatar ? (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black uppercase shrink-0 shadow-sm ${isMe ? 'bg-brand-primary text-white' : 'bg-white text-slate-600 border border-slate-100'}`}>
                              {isMe ? 'ME' : msg.sender?.first_name?.[0] || '?'}
                            </div>
                          ) : (
                            <div className="w-7 h-7 shrink-0 hidden sm:block" />
                          )}
                          <div className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {showAvatar && !isMe && activeConversation?.type === 'GROUP' && (
                              <span className="text-[9px] font-bold text-slate-400 mb-1 ml-1">{msg.sender?.first_name} {msg.sender?.last_name}</span>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-xs shadow-sm shadow-slate-200/50 transition-all ${isMe ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'}`}>
                              {msg.content}
                            </div>
                            <span className="text-[8px] text-slate-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                  <div className="relative flex items-center">
                    <input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Secure message..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-14 py-3.5 text-xs focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!isConnected || !inputValue.trim()}
                      className="absolute right-2 p-2.5 bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 disabled:opacity-20 disabled:shadow-none transition-all group"
                    >
                      <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </div>
                  {!isConnected && (
                    <div className="flex items-center justify-center gap-1.5 mt-3 animate-pulse">
                      <div className="w-1 h-1 bg-red-500 rounded-full" />
                      <p className="text-[9px] text-red-500 font-black uppercase tracking-widest">Reconnecting to server...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
