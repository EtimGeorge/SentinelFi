import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  X,
  Minus,
  Send,
  Paperclip,
  Sparkles,
  ChevronDown,
  RefreshCw,
  BarChart2,
  FileText,
  Zap,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Loader,
  TrendingUp,
  Calendar,
  MessageSquare,
  Trash2,
  Map,
  Mic,
  MicOff,
} from "lucide-react";
import { useAIChat } from "../../hooks/useAIChat";
import {
  AIChatMessage,
  AIChatScope,
  SuggestionChip,
  ActionChip,
} from "./types";
import { ChatPanel } from "./ChatPanel";
import { ChatSheet } from "./ChatSheet";
import useUIStore from "../../store/uiStore";

const FAB_STYLES = `
  @keyframes sentinelai-fab-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
    50%      { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
  }
  @keyframes sentinelai-fab-glow {
    0%, 100% { filter: brightness(1); }
    50%      { filter: brightness(1.2); }
  }
  @keyframes sentinelai-slideup {
    from { opacity: 0; transform: translateY(24px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  .sentinelai-fab-pulse { animation: sentinelai-fab-pulse 2s infinite; }
  .sentinelai-fab-glow { animation: sentinelai-fab-glow 3s ease-in-out infinite; }
  .sentinelai-panel-enter { animation: sentinelai-slideup 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
`;

const PAGE_QUICK_ACTIONS: Record<
  string,
  { label: string; icon: React.ReactNode; prompt: string }[]
> = {
  dashboard: [
    {
      label: "Portfolio summary",
      icon: <BarChart2 size={12} />,
      prompt: "Give me a financial health summary of our full portfolio.",
    },
    {
      label: "Top overruns",
      icon: <AlertTriangle size={12} />,
      prompt: "Show me the projects with the worst cost overruns.",
    },
    {
      label: "How to use",
      icon: <BookOpen size={12} />,
      prompt: "How do I use SentinelFi to track project budgets?",
    },
  ],
  wbs: [
    {
      label: "Explain WBS",
      icon: <BookOpen size={12} />,
      prompt: "Explain what the WBS budget structure is and how to use it.",
    },
    {
      label: "Top variants",
      icon: <TrendingUp size={12} />,
      prompt: "Which WBS items have the highest cost variance right now?",
    },
    {
      label: "Log expense guide",
      icon: <Zap size={12} />,
      prompt: "How do I log a live expense against a WBS item?",
    },
  ],
  "capex-dashboard": [
    {
      label: "Portfolio health",
      icon: <BarChart2 size={12} />,
      prompt:
        "Give me an executive summary of our current CAPEX portfolio health.",
    },
    {
      label: "Forecast exhaustion",
      icon: <Calendar size={12} />,
      prompt:
        "Forecast when our budget will be exhausted at the current burn rate.",
    },
    {
      label: "Explain overruns",
      icon: <AlertTriangle size={12} />,
      prompt: "Which projects are over budget and by how much?",
    },
  ],
  "opex-dashboard": [
    {
      label: "Dept breakdown",
      icon: <BarChart2 size={12} />,
      prompt:
        "Which departments are spending the most vs their allocated budget?",
    },
    {
      label: "Budget runway",
      icon: <TrendingUp size={12} />,
      prompt: "Explain my OPEX budget runway and what I should watch out for.",
    },
    {
      label: "Payroll insight",
      icon: <Zap size={12} />,
      prompt: "Give me a summary of recent payroll cost decomposition.",
    },
  ],
  procurement: [
    {
      label: "P2P status",
      icon: <FileText size={12} />,
      prompt:
        "Show me the current status of all requisitions, POs, and invoices.",
    },
    {
      label: "Overdue items",
      icon: <AlertTriangle size={12} />,
      prompt: "Which P2P items are overdue and need attention?",
    },
    {
      label: "Create requisition",
      icon: <Zap size={12} />,
      prompt: "Guide me through creating a new requisition.",
    },
  ],
  approvals: [
    {
      label: "Pending count",
      icon: <FileText size={12} />,
      prompt: "How many items are pending my approval and what are they?",
    },
    {
      label: "High value items",
      icon: <TrendingUp size={12} />,
      prompt: "Show me the highest value items awaiting approval.",
    },
    {
      label: "Approval guide",
      icon: <BookOpen size={12} />,
      prompt: "What is the approval workflow for budget drafts?",
    },
  ],
  "budget-draft": [
    {
      label: "How to submit",
      icon: <CheckCircle size={12} />,
      prompt: "What are the steps to submit a budget draft for approval?",
    },
    {
      label: "Explain DOA",
      icon: <BookOpen size={12} />,
      prompt: "Explain the Delegation of Authority (DOA) approval process.",
    },
    {
      label: "Draft from doc",
      icon: <FileText size={12} />,
      prompt: "How do I auto-fill a budget draft from an uploaded document?",
    },
  ],
  default: [
    {
      label: "Portfolio summary",
      icon: <BarChart2 size={12} />,
      prompt: "Give me a financial health summary of our full portfolio.",
    },
    {
      label: "Top overruns",
      icon: <AlertTriangle size={12} />,
      prompt: "Show me the projects with the worst cost overruns.",
    },
    {
      label: "How to use",
      icon: <BookOpen size={12} />,
      prompt: "How do I use SentinelFi to track project budgets?",
    },
  ],
};

export const AIChatFAB: React.FC = () => {
  const isOpen = useUIStore((state) => state.isAiAssistantOpen);
  const setIsOpen = useUIStore((state) => state.setAiAssistantOpen);
  const {
    messages,
    scope,
    isStreaming,
    proactiveInsight,
    unreadCount,
    sendMessage,
    clearHistory,
    dismissProactiveInsight,
  } = useAIChat();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const currentPage = scope?.page || "default";
  const quickActions =
    PAGE_QUICK_ACTIONS[currentPage] || PAGE_QUICK_ACTIONS["default"];

  const handleToggle = useCallback(() => {
    if (isOpen && !isMinimized) {
      setIsMinimized(true);
    } else if (isOpen && isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isOpen, isMinimized, setIsOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, [setIsOpen]);

  const handleQuickAction = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
      setShowQuickActions(false);
    },
    [sendMessage],
  );

  // Pulse when there's a proactive insight
  useEffect(() => {
    if (proactiveInsight && !isOpen) {
      // The pulse is handled via CSS class
    }
  }, [proactiveInsight, isOpen]);

  const pageLabels: Record<string, string> = {
    dashboard: "Dashboard",
    wbs: "WBS Budget",
    "capex-dashboard": "CAPEX Dashboard",
    "opex-dashboard": "OPEX Dashboard",
    procurement: "P2P Desk",
    approvals: "Approvals",
    "budget-draft": "Budget Draft",
    reporting: "Reports",
    default: "SentinelFi",
  };

  const pageLabel = pageLabels[currentPage] || pageLabels["default"];

  return (
    <>
      <style>{FAB_STYLES}</style>

      {/* FAB Button */}
      <button
        ref={fabRef}
        onClick={handleToggle}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "bg-gray-800 text-gray-400 scale-95"
            : "bg-brand-primary text-white sentinelai-fab-glow"
        } ${proactiveInsight && !isOpen ? "sentinelai-fab-pulse" : ""}`}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        aria-expanded={isOpen}
      >
        {proactiveInsight && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-alert-critical rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse">
            !
          </span>
        )}
        <Sparkles
          className={`w-7 h-7 ${isOpen ? "text-gray-400" : "text-white"}`}
        />
        {isOpen && !isMinimized && (
          <span className="absolute -left-40 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium text-white elev-lg border border-gray-700">
            AI Assistant
          </span>
        )}
      </button>

      {/* Quick Actions Tooltip */}
      {showQuickActions && !isMinimized && isOpen && (
        <div className="fixed bottom-24 right-6 z-[9998] bg-brand-dark/95 backdrop-blur-3xl border border-white/5 rounded-2xl p-4 elev-lg min-w-[200px] animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 r">
              Quick Actions
            </span>
            <button
              onClick={() => setShowQuickActions(false)}
              className="text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleQuickAction(action.prompt)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-brand-primary">{action.icon}</span>
                <span className="text-sm text-white">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

{/* Chat Panel (Desktop) */}
      {(isOpen || isMinimized) && window.innerWidth >= 640 && (
        <ChatPanel
          isOpen={isOpen}
          isMinimized={isMinimized}
          onClose={handleClose}
          onToggleMinimize={() => setIsMinimized(!isMinimized)}
          scope={scope}
          messages={messages}
          isStreaming={isStreaming}
          proactiveInsight={proactiveInsight}
          onDismissInsight={dismissProactiveInsight}
          unreadCount={unreadCount}
          quickActions={quickActions}
          onQuickAction={handleQuickAction}
          onSendMessage={sendMessage}
          onClearHistory={clearHistory}
        />
      )}

      {/* Chat Sheet (Mobile) */}
      {(isOpen || isMinimized) && window.innerWidth < 640 && (
        <ChatSheet
          isOpen={isOpen}
          onClose={handleClose}
          scope={scope}
          messages={messages}
          isStreaming={isStreaming}
          proactiveInsight={proactiveInsight}
          quickActions={quickActions}
          onQuickAction={handleQuickAction}
          onSendMessage={sendMessage}
          onClearHistory={clearHistory}
        />
      )}
    </>
  );
};

export default AIChatFAB;
