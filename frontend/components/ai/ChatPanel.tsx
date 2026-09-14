import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  Bot, X, Minus, Send, Paperclip, Sparkles, ChevronDown, RefreshCw, BarChart2, FileText, Zap, BookOpen, AlertTriangle, CheckCircle, Loader, TrendingUp, Calendar, MessageSquare, Trash2, Map, Mic, MicOff, Copy, ChevronRight, TrendingDown, DollarSign, Table, Grid, Image as ImageIcon, Code, Link as LinkIcon,
} from "lucide-react";
import {
  AIChatMessage, AIChatScope, SuggestionChip, ActionChip, RichContent,
} from "./types";
import DataTable from "../../components/common/DataTable";

interface ChatPanelProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  scope: AIChatScope | undefined;
  messages: AIChatMessage[];
  isStreaming: boolean;
  proactiveInsight: any;
  onDismissInsight: () => void;
  unreadCount: number;
  quickActions: { label: string; icon: React.ReactNode; prompt: string }[];
  onQuickAction: (prompt: string) => void;
  onSendMessage: (content: string) => Promise<void>;
  onClearHistory: () => void;
}

const PANEL_STYLES = `
  @keyframes sentinelai-slideup {
    from { opacity: 0; transform: translateY(24px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
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
  @keyframes spin { to { transform: rotate(360deg); } }
  .sentinelai-panel { animation: sentinelai-slideup 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .sentinelai-msg-appear { animation: sentinelai-fadein 0.25s ease forwards; }
  .sentinelai-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.7); display: inline-block; margin: 0 2px; }
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

const RichContentRenderer: React.FC<{ content: RichContent }> = ({
  content,
}) => {
  switch (content.type) {
    case "text":
      return (
        <div className="text-white/90 whitespace-pre-wrap">{content.value}</div>
      );
    case "chart":
      return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-white">
              {content.config.title || "Chart"}
            </h4>
            <span className="text-xs text-gray-500 capitalize">
              {content.config.type}
            </span>
          </div>
          <div className="h-48" style={{ position: "relative" }}>
            <canvas id={`chart-${Math.random()}`} className="w-full h-full" />
          </div>
        </div>
      );
    case "table": {
      const tableColumns = content.headers.map((h, i) => ({
        key: `col-${i}`, label: h, get: (row: string[]) => row[i] || '', tier: (i === 0 ? 'P0' : i < 3 ? 'P1' : 'P2') as 'P0' | 'P1' | 'P2',
      }));
      return (
        <DataTable
          columns={tableColumns}
          rows={content.rows}
          rowKey={(row) => JSON.stringify(row)}
          className="bg-gray-800/50 border border-gray-700 rounded-xl mt-2"
          emptyMessage="No data"
        />
      );
    }
    case "actions":
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {content.chips.map((chip, i) => (
            <button
              key={i}
              onClick={() => {}}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chip.variant === "primary"
                  ? "bg-brand-primary text-white hover:bg-brand-primary/80"
                  : chip.variant === "destructive"
                    ? "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              }`}
            >
              {chip.icon && <span>{chip.icon}</span>}
              {chip.label}
            </button>
          ))}
        </div>
      );
    case "card":
      return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mt-2">
          <h4 className="font-bold text-white mb-2">{content.title}</h4>
          <p className="text-gray-300">{content.content}</p>
          {content.metadata && (
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
              {Object.entries(content.metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    case "kpi":
      return (
        <div
          className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 mt-2 border-l-4`}
          style={{ borderLeftColor: content.accent }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">
              {content.label}
            </span>
            {content.trend !== undefined && (
              <span
                className={`text-xs font-bold ${content.trend >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {content.trend >= 0 ? (
                  <TrendingUp className="w-3 h-3 inline" />
                ) : (
                  <TrendingDown className="w-3 h-3 inline" />
                )}
                {Math.abs(content.trend)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-black text-white mt-1">{content.value}</p>
        </div>
      );
    default:
      return <div className="text-gray-500">Unsupported content type</div>;
  }
};

const AIMessageBubble: React.FC<{
  message: AIChatMessage;
  onQuickAction: (prompt: string) => void;
  onActionHint: (action: string) => void;
}> = ({ message, onQuickAction, onActionHint }) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";

  const handleCopy = () => {
    const text =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  if (message.streaming) {
    return (
      <div className="sentinelai-msg-appear flex gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-2xl rounded-bl-sm">
            <div className="flex items-center gap-2">
              <span className="sentinelai-dot" />
              <span className="sentinelai-dot" />
              <span className="sentinelai-dot" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAssistant) {
    return (
      <div className="sentinelai-msg-appear flex justify-end gap-3">
        <div className="max-w-[80%] px-4 py-3 bg-gradient-to-br from-brand-primary/30 to-brand-secondary/20 border border-brand-primary/30 rounded-2xl rounded-br-sm text-white">
          {typeof message.content === "string" ? (
            message.content
          ) : (
            <RichContentRenderer content={message.content as RichContent} />
          )}
        </div>
        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gray-800 border border-gray-700 flex items-center justify-center">
          <Bot className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="sentinelai-msg-appear flex gap-3">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-brand-primary to-brand-secondary">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-2xl rounded-bl-sm">
          {typeof message.content === "string" ? (
            <div className="text-white/90 whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <RichContentRenderer content={message.content as RichContent} />
          )}

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCopy}
              className="p-1 text-gray-500 hover:text-white transition-colors"
              title="Copy"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <span className="text-xs text-gray-500 ml-auto">
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {message.metadata?.relatedEntities &&
          message.metadata.relatedEntities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.metadata.relatedEntities.map((entity, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-brand-primary/20 text-brand-primary text-xs rounded-full"
                >
                  {entity}
                </span>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen, isMinimized, onClose, onToggleMinimize, scope, messages, isStreaming, proactiveInsight, onDismissInsight, unreadCount, quickActions, onQuickAction, onSendMessage, onClearHistory,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight, behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  const handleSend = useCallback(async () => {
    const msg = inputValue.trim();
    if (!msg || isStreaming) return;
    setInputValue("");
    await onSendMessage(msg);
  }, [inputValue, isStreaming, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("target_form", "wbs-budget");
        if (scope?.projectId) formData.append("project_id", scope.projectId);

        const res = await fetch("/api/v1/ai/document/fill-form", {
          method: "POST", credentials: "include", body: formData,
        });

        if (!res.ok) throw new Error();
        const data = await res.json();
        await onSendMessage(
          `I uploaded "${file.name}" - please summarize what was extracted and suggest next steps.`,
        );
      } catch {
        await onSendMessage(
          `I tried uploading "${file.name}" but something went wrong. Can you help me fill the form manually?`,
        );
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [scope?.projectId, onSendMessage],
  );

  const pageLabels: Record<string, string> = {
    dashboard: "Dashboard", wbs: "WBS Budget",
    "capex-dashboard": "CAPEX Dashboard",
    "opex-dashboard": "OPEX Dashboard", procurement: "P2P Desk", approvals: "Approvals",
    "budget-draft": "Budget Draft", reporting: "Reports", default: "SentinelFi",
  };
  const pageLabel = scope?.page
    ? pageLabels[scope.page] || scope.page
    : "SentinelFi";

  if (!isOpen && isMinimized) return null;

  return (
    <>
      <style>{PANEL_STYLES}</style>

      {isMinimized && (
        <button
          onClick={onToggleMinimize}
          className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center elev-lg sentinelai-fab-glow transition-transform hover:scale-105"
          aria-label="Expand AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-alert-critical rounded-full flex items-center justify-center text-xs font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {!isMinimized && (
        <div
          id="sentinel-ai-panel"
          className="sentinelai-panel fixed bottom-6 right-6 z-[9999] w-96 max-w-[calc(100vw-32px)] h-[min(600px,calc(100dvh-40px))] bg-brand-dark/95 backdrop-blur-3xl border border-white/5 rounded-2xl elev-lg flex flex-col overflow-hidden"
          role="dialog"
          aria-label="AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/10 border-b border-white/5 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center sentinelai-fab-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">SentinelFi AI</span>
                  <span
                    className={`w-2 h-2 rounded-full ${isStreaming ? "bg-yellow-400" : "bg-green-400"}`}
                  />
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Analyzing: {pageLabel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onToggleMinimize}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Proactive Insight Banner */}
          {proactiveInsight && (
            <div className="p-4 bg-yellow-900/20 border-b border-yellow-700/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-yellow-300">
                    {proactiveInsight.title}
                  </p>
                  <p className="text-sm text-yellow-200 mt-1">
                    {proactiveInsight.message}
                  </p>
                  {proactiveInsight.actionPrompt && (
                    <button
                      onClick={() =>
                        onQuickAction(proactiveInsight.actionPrompt)
                      }
                      className="mt-2 text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />{" "}
                      {proactiveInsight.actionPrompt}
                    </button>
                  )}
                </div>
                <button
                  onClick={onDismissInsight}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions (Empty State) */}
          {messages.length === 0 && (
            <div className="p-4 border-b border-gray-700/50">
              <p className="text-xs font-bold text-gray-500 r mb-3">
                Suggested questions for {pageLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickActions.slice(0, 4).map((action, i) => (
                  <button
                    key={i}
                    onClick={() => onQuickAction(action.prompt)}
                    className="sentinelai-chip px-3 py-1.5 rounded-full text-xs font-medium border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 transition-colors flex items-center gap-1.5"
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="sentinelai-scroll flex-1 overflow-y-auto p-4 space-y-4"
            role="log"
            aria-live="polite"
          >
            {messages.map((msg) => (
              <AIMessageBubble
                key={msg.id}
                message={msg}
                onQuickAction={onQuickAction}
                onActionHint={() => {}}
              />
            ))}
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto text-gray-700 mb-3" />
                <p className="font-medium text-white">Start a conversation</p>
                <p className="text-xs mt-1">
                  Ask me about budgets, projects, or expenses
                </p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-700/50 bg-black/20">
            <div className="relative">
              <div className="flex items-end gap-2 bg-gray-900/50 border border-gray-700 rounded-2xl p-2 transition-colors focus-within:border-brand-primary/50">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isStreaming}
                  className="p-2 text-gray-500 hover:text-brand-primary hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
                  title="Upload document"
                >
                  {isUploading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about budgets, projects, expenses…"
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent border-none text-white text-sm resize-none max-h-32 outline-none placeholder:text-gray-500"
                  style={{ lineHeight: "1.5" }}
                />

                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming}
                  className="p-2 rounded-xl transition-colors flex-shrink-0 ${inputValue.trim() && !isStreaming
                    ? 'bg-brand-primary text-white hover:bg-brand-primary/80'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'}"
                  aria-label="Send message"
                >
                  {isStreaming ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 mt-2">
                AI responses are for guidance only. Always validate critical
                financial decisions.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatPanel;
