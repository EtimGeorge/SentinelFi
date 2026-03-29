import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Bot, X, Minus, Send, Paperclip, Sparkles, ChevronDown, RefreshCw,
  BarChart2, FileText, Zap, BookOpen, AlertTriangle, CheckCircle, Loader,
  TrendingUp, Calendar, MessageSquare, Trash2, Map,
} from 'lucide-react';
import { useAiAssistant, AiChatMessage, UseAiAssistantOptions } from '../../hooks/useAiAssistant';
import { AiChatMessageBubble } from './AiChatMessage';
import useUIStore from '../../store/uiStore';
import { getTutorial } from '../../lib/tutorial-content';
import { useTour } from '../../contexts/TourContext';

// ─── Styles ───────────────────────────────────────────────────────────────────

const WIDGET_STYLES = `
  @keyframes sentinelai-slideup {
    from { opacity: 0; transform: translateY(24px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes sentinelai-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
    50%       { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
  }
  @keyframes sentinelai-fadein {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sentinelai-dots {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1; }
  }
  @keyframes sentinelai-glow {
    0%, 100% { filter: brightness(1); }
    50%      { filter: brightness(1.15); }
  }
  .sentinelai-widget { font-family: 'Inter', 'Segoe UI', sans-serif; }
  .sentinelai-widget * { box-sizing: border-box; }
  .sentinelai-panel-open {
    animation: sentinelai-slideup 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .sentinelai-msg-appear {
    animation: sentinelai-fadein 0.25s ease forwards;
  }
  .sentinelai-fab-pulse {
    animation: sentinelai-pulse 2s infinite;
  }
  .sentinelai-fab-glow {
    animation: sentinelai-glow 3s ease-in-out infinite;
  }
  .sentinelai-dot {
    width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.7);
    display: inline-block; margin: 0 2px;
  }
  .sentinelai-dot:nth-child(1) { animation: sentinelai-dots 1.2s 0s   infinite; }
  .sentinelai-dot:nth-child(2) { animation: sentinelai-dots 1.2s 0.2s  infinite; }
  .sentinelai-dot:nth-child(3) { animation: sentinelai-dots 1.2s 0.4s  infinite; }
  .sentinelai-input:focus { outline: none; }
  .sentinelai-scroll::-webkit-scrollbar { width: 4px; }
  .sentinelai-scroll::-webkit-scrollbar-track { background: transparent; }
  .sentinelai-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
  .sentinelai-chip:hover { background: rgba(99,102,241,0.25) !important; border-color: rgba(99,102,241,0.5) !important; }
  .sentinelai-action-btn:hover { background: rgba(99,102,241,0.2) !important; }
  .sentinelai-send-btn:hover { filter: brightness(1.1); }
  .sentinelai-close-btn:hover { background: rgba(255,255,255,0.15) !important; }
`;

// ─── Quick Actions ─────────────────────────────────────────────────────────────

const PAGE_QUICK_ACTIONS: Record<string, { label: string; icon: React.ReactNode; message: string }[]> = {
  'wbs': [
    { label: 'Explain WBS', icon: <BookOpen size={12} />, message: 'Explain what the WBS budget structure is and how to use it.' },
    { label: 'Top variants', icon: <TrendingUp size={12} />, message: 'Which WBS items have the highest cost variance right now?' },
    { label: 'Log expense guide', icon: <Zap size={12} />, message: 'How do I log a live expense against a WBS item?' },
  ],
  'capex-dashboard': [
    { label: 'Portfolio health', icon: <BarChart2 size={12} />, message: 'Give me an executive summary of our current CAPEX portfolio health.' },
    { label: 'Forecast exhaustion', icon: <Calendar size={12} />, message: 'Forecast when our budget will be exhausted at the current burn rate.' },
    { label: 'Explain overruns', icon: <AlertTriangle size={12} />, message: 'Which projects are over budget and by how much?' },
  ],
  'opex-dashboard': [
    { label: 'Dept breakdown', icon: <BarChart2 size={12} />, message: 'Which departments are spending the most vs their allocated budget?' },
    { label: 'Budget runway', icon: <TrendingUp size={12} />, message: 'Explain my OPEX budget runway and what I should watch out for.' },
    { label: 'Payroll insight', icon: <Zap size={12} />, message: 'Give me a summary of recent payroll cost decomposition.' },
  ],
  'budget-draft': [
    { label: 'How to submit', icon: <CheckCircle size={12} />, message: 'What are the steps to submit a budget draft for approval?' },
    { label: 'Explain DOA', icon: <BookOpen size={12} />, message: 'Explain the Delegation of Authority (DOA) approval process.' },
    { label: 'Draft from doc', icon: <FileText size={12} />, message: 'How do I auto-fill a budget draft from an uploaded document?' },
  ],
  'default': [
    { label: 'Portfolio summary', icon: <BarChart2 size={12} />, message: 'Give me a financial health summary of our full portfolio.' },
    { label: 'Top overruns', icon: <AlertTriangle size={12} />, message: 'Show me the projects with the worst cost overruns.' },
    { label: 'How to use', icon: <BookOpen size={12} />, message: 'How do I use SentinelFi to track project budgets?' },
  ],
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AiAssistantWidgetProps extends UseAiAssistantOptions {
  defaultOpen?: boolean;
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = memo(({
  currentPage,
  projectId,
  defaultOpen = false,
  onActionHint,
}) => {
  const isAiAssistantOpen = useUIStore((state) => state.isAiAssistantOpen);
  const setAiAssistantOpen = useUIStore((state) => state.setAiAssistantOpen);
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [schedulePanel, setSchedulePanel] = useState(false);
  const [isGuideMode, setIsGuideMode] = useState(false);

  const { startTour, isActive: isTourActive, startStepById } = useTour();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = useAiAssistant({ currentPage, projectId, onActionHint });

  // Guide mode: inject a UX tutor system prompt
  const tutorial = getTutorial(currentPage ?? 'default');
  const guideModeQuickActions = [
    { label: 'How do I start?', icon: <BookOpen size={12} />, message: `How do I get started on the ${tutorial.title} page? Give me step-by-step instructions.` },
    { label: 'Key features', icon: <Zap size={12} />, message: `What are the most important features on the ${tutorial.title} page and how do I use them?` },
    { label: 'Common mistakes', icon: <AlertTriangle size={12} />, message: `What mistakes should I avoid on the ${tutorial.title} page?` },
  ];

  const quickActions = isGuideMode
    ? guideModeQuickActions
    : (PAGE_QUICK_ACTIONS[currentPage ?? 'default'] ?? PAGE_QUICK_ACTIONS['default']);

  // Prepend tutor system prompt when guide mode first activates
  const handleToggleGuideMode = useCallback(() => {
    setIsGuideMode(m => {
      if (!m) {
        // Entering guide mode — send a silent context-setting message
        ai.sendMessage(`[SYSTEM CONTEXT — DO NOT SHOW TO USER] You are now in UX Guide Mode. ${tutorial.aiTutorPrompt}`);
      }
      return !m;
    });
  }, [ai, tutorial.aiTutorPrompt]);

  const handleStartInteractiveTour = useCallback(() => {
    startTour(currentPage ?? 'default');
    setAiAssistantOpen(false); // Close AI when tour starts to avoid overlap
  }, [startTour, currentPage, setAiAssistantOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
    if (!isAiAssistantOpen && ai.messages.length > 0) {
      setUnreadCount(n => n + 1);
    }
  }, [ai.messages]);

  // Clear unread on open
  useEffect(() => {
    if (isAiAssistantOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isAiAssistantOpen]);

  const handleSend = useCallback(() => {
    const msg = inputValue.trim();
    if (!msg || ai.isLoading) return;
    setInputValue('');
    ai.sendMessage(msg);
  }, [inputValue, ai]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleQuickAction = useCallback((message: string) => {
    if (ai.isLoading) return;
    ai.sendMessage(message);
  }, [ai]);

  const handleActionHint = useCallback((action: string) => {
    if (action.startsWith('guide:')) {
      const stepId = action.replace('guide:', '');
      startStepById(currentPage ?? 'default', stepId);
      setAiAssistantOpen(false); // Minimize to show the element
    } else if (onActionHint) {
      onActionHint(action);
    }
  }, [startStepById, currentPage, onActionHint, setAiAssistantOpen]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_form', 'wbs-budget'); // TODO: make configurable via props
      if (projectId) formData.append('project_name', projectId);

      const res = await fetch('/api/v1/ai/document/fill-form', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      setUploadSuccess(`Extracted ${data.item_count ?? 'data'} from "${file.name}"`);
      ai.sendMessage(`I uploaded "${file.name}" — please summarize what was extracted and suggest next steps.`);
    } catch {
      ai.sendMessage(`I tried uploading "${file.name}" but something went wrong. Can you help me fill the form manually?`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [projectId, ai]);

  const pageLabels: Record<string, string> = {
    'wbs': 'WBS Budget',
    'capex-dashboard': 'CAPEX Dashboard',
    'opex-dashboard': 'OPEX Dashboard',
    'budget-draft': 'Budget Draft',
    'reporting': 'Reports',
  };
  const pageLabel = pageLabels[currentPage ?? ''] ?? null;

  return (
    <>
      <style>{WIDGET_STYLES}</style>

      {/* ── Chat Panel ────────────────────────────────────────────────────── */}
      {isAiAssistantOpen && (
        <div
          id="sentinel-ai-panel"
          className="sentinelai-widget sentinelai-panel-open"
          style={{
            position: 'fixed', top: 64, right: 16, zIndex: 9998,
            width: 400, maxWidth: 'calc(100vw - 32px)',
            height: isMinimized ? 56 : 620, maxHeight: 'calc(100vh - 140px)',
            background: 'linear-gradient(160deg, #12121f 0%, #0f0f1a 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 20,
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            transition: 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, rgba(14,165,233,0.08) 100%)',
            borderBottom: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Animated AI orb */}
              <div className="sentinelai-fab-glow" style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #0ea5e9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px rgba(99,102,241,0.5)',
              }}>
                <Sparkles size={16} color="#fff" />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                    SentinelFi AI
                  </span>
                  {/* Live indicator */}
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: ai.isLoading ? '#f59e0b' : '#22c55e',
                    boxShadow: `0 0 6px ${ai.isLoading ? '#f59e0b' : '#22c55e'}`,
                    animation: ai.isLoading ? 'sentinelai-pulse 1s infinite' : 'none',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
                  {pageLabel ? `Analyzing: ${pageLabel}` : 'Financial Intelligence'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Guide Me toggle */}
              <button
                onClick={handleToggleGuideMode}
                title={isGuideMode ? 'Exit Guide Mode' : 'Guide Me — UX Tutor Mode'}
                className="sentinelai-close-btn"
                style={{
                  background: isGuideMode ? 'rgba(99,102,241,0.25)' : 'transparent',
                  border: isGuideMode ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
                  cursor: 'pointer',
                  color: isGuideMode ? '#a5b4fc' : 'rgba(255,255,255,0.4)', padding: '4px 8px',
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all 0.15s', fontSize: 10, fontWeight: 600,
                }}
              >
                <Map size={12} /> {isGuideMode ? 'Guiding' : 'Guide Me'}
              </button>
              {/* Clear history */}
              {ai.messageCount > 0 && (
                <button
                  onClick={ai.clearHistory}
                  title="Clear conversation"
                  className="sentinelai-close-btn"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)', padding: '6px',
                    borderRadius: 8, display: 'flex', alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(m => !m)}
                className="sentinelai-close-btn"
                title={isMinimized ? 'Expand' : 'Minimize'}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)', padding: '6px',
                  borderRadius: 8, display: 'flex', alignItems: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <Minus size={14} />
              </button>
              {/* Close */}
              <button
                onClick={() => setAiAssistantOpen(false)}
                className="sentinelai-close-btn"
                title="Close"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)', padding: '6px',
                  borderRadius: 8, display: 'flex', alignItems: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ── Body (hidden when minimized) ─────────────────────────────── */}
          {!isMinimized && (
            <>
              {/* ── Message area ─────────────────────────────────────── */}
              <div
                ref={scrollRef}
                className="sentinelai-scroll"
                style={{
                  flex: 1, overflowY: 'auto', padding: '16px 14px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                {/* Welcome / Empty State */}
                {ai.messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                    {/* Welcome logo */}
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(14,165,233,0.2))',
                      border: '1px solid rgba(99,102,241,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}>
                      <Sparkles size={22} style={{ color: '#a5b4fc' }} />
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                      Financial Intelligence AI
                    </p>
                    <p style={{ margin: '0 0 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                      Ask me anything about your budgets, projects, and financial data.
                      {pageLabel && ` Currently viewing ${pageLabel}.`}
                    </p>

                    {/* Quick action chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {isGuideMode && (
                        <>
                          <button
                            onClick={() => {
                              window.open(`/tutorial/${currentPage ?? 'dashboard'}`, '_blank');
                              setAiAssistantOpen(false);
                            }}
                            className="sentinelai-chip"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'rgba(14,165,233,0.1)',
                              border: '1px solid rgba(14,165,233,0.4)',
                              borderRadius: 20, padding: '8px 16px',
                              color: '#7dd3fc', fontSize: 12, cursor: 'pointer',
                              transition: 'all 0.15s', width: '100%', marginBottom: 6,
                              fontWeight: 700,
                              justifyContent: 'center',
                            }}
                          >
                            <BookOpen size={14} style={{ color: '#0ea5e9' }} />
                            Explore Full Visual Guide
                          </button>

                          {tutorial.tourSteps.length > 0 && (
                            <button
                              onClick={handleStartInteractiveTour}
                              className="sentinelai-chip"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'rgba(234,179,8,0.1)',
                                border: '1px solid rgba(234,179,8,0.4)',
                                borderRadius: 20, padding: '8px 16px',
                                color: '#fbbf24', fontSize: 12, cursor: 'pointer',
                                transition: 'all 0.15s', width: '100%', marginBottom: 12,
                                fontWeight: 700,
                                justifyContent: 'center',
                              }}
                            >
                              <Map size={14} style={{ color: '#fbbf24' }} />
                              Start Interactive Tour
                            </button>
                          )}
                        </>
                      )}
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          id={`ai-quick-${i}`}
                          onClick={() => handleQuickAction(action.message)}
                          className="sentinelai-chip"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 20, padding: '6px 10px',
                            color: '#a5b4fc', fontSize: 11, cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span style={{ color: '#818cf8' }}>{action.icon}</span>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {ai.messages.map((msg) => (
                  <AiChatMessageBubble 
                    key={msg.id} 
                    message={msg} 
                    onQuickAction={handleQuickAction} 
                    onActionHint={handleActionHint}
                  />
                ))}
              </div>

              {/* ── Upload success banner ─────────────────────────────────── */}
              {uploadSuccess && (
                <div style={{
                  margin: '0 12px',
                  padding: '8px 12px',
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 8,
                  fontSize: 11, color: '#86efac',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <CheckCircle size={12} />
                  {uploadSuccess}
                </div>
              )}

              {/* ── Input bar ────────────────────────────────────────────── */}
              <div style={{
                padding: '10px 12px 12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '8px 8px 8px 12px',
                  transition: 'border-color 0.2s',
                }}>
                  {/* Textarea */}
                  <textarea
                    ref={inputRef}
                    id="sentinel-ai-input"
                    className="sentinelai-input"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about budgets, projects, expenses…"
                    rows={1}
                    disabled={ai.isLoading}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      color: '#fff', fontSize: 13, lineHeight: '20px',
                      resize: 'none', maxHeight: 100, overflowY: 'auto',
                      fontFamily: 'inherit', letterSpacing: '-0.01em',
                    }}
                  />

                  {/* Attach button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload a document for AI analysis"
                    disabled={isUploading || ai.isLoading}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: isUploading ? '#f59e0b' : 'rgba(255,255,255,0.35)',
                      padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center',
                      transition: 'color 0.15s', flexShrink: 0,
                    }}
                  >
                    {isUploading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={16} />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.xlsx,.csv"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  {/* Send button */}
                  <button
                    id="sentinel-ai-send"
                    onClick={handleSend}
                    disabled={!inputValue.trim() || ai.isLoading}
                    className="sentinelai-send-btn"
                    style={{
                      width: 32, height: 32, borderRadius: 10, border: 'none',
                      background: inputValue.trim() && !ai.isLoading
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : 'rgba(255,255,255,0.08)',
                      cursor: inputValue.trim() && !ai.isLoading ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: inputValue.trim() && !ai.isLoading ? '#fff' : 'rgba(255,255,255,0.25)',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}
                  >
                    {ai.isLoading
                      ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Send size={14} />
                    }
                  </button>
                </div>

                {/* Footer hint */}
                <p style={{ margin: '6px 4px 0', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                  AI responses are for guidance only. Always validate critical financial decisions.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
});

AiAssistantWidget.displayName = 'AiAssistantWidget';
