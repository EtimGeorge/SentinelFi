import React, { useState, useEffect } from "react";
import {
  BarChart2, FileText, Zap, BookOpen, AlertTriangle, CheckCircle, TrendingUp, Calendar,
} from "lucide-react";
import { useAIChat } from "../../hooks/useAIChat";
import { ChatPanel } from "./ChatPanel";
import { ChatSheet } from "./ChatSheet";
import useUIStore from "../../store/uiStore";

/**
 * AIAssistantRoot — headless mount for the AI chat surface.
 *
 * The floating orb is gone: the header sparkle button (LayoutNav) is the
 * single entry point and toggles `isAiAssistantOpen` in the UI store. This
 * component only owns the conversation lifecycle and renders ChatPanel
 * (desktop) / ChatSheet (mobile) when open. Proactive insights and unread
 * state pulse the header icon via the `aiAttention` store flag.
 */
interface AIAssistantRootProps {
  /** Page context key (wbs, capex-dashboard, opex-dashboard, …) — from the route. */
  pageContext?: string;
  /** Active project scope from the workspace selector / deep-link. */
  projectId?: string;
}

export const AIAssistantRoot: React.FC<AIAssistantRootProps> = ({ pageContext, projectId }) => {
  const isOpen = useUIStore((state) => state.isAiAssistantOpen);
  const setIsOpen = useUIStore((state) => state.setAiAssistantOpen);
  const setAiAttention = useUIStore((state) => state.setAiAttention);
  const {
    messages, scope, isStreaming, proactiveInsight, unreadCount, sendMessage, clearHistory, dismissProactiveInsight,
  } = useAIChat({ currentPage: pageContext, projectId });

  // Desktop/mobile surface decision — resize-aware, not a render-time
  // `window.innerWidth` snapshot (hydration-safe across rotation/resize).
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsMobileViewport(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Sync attention signal for the header icon: actionable insight or unread
  // assistant messages while the panel is closed.
  const attention = !isOpen && ((proactiveInsight != null) || unreadCount > 0);
  useEffect(() => {
    setAiAttention(attention);
    return () => {
      // Unmount cleanup — never leave a stale badge behind.
      setAiAttention(false);
    };
  }, [attention, setAiAttention]);

  const quickActions = QUICK_ACTIONS_BY_PAGE[scope?.page || "default"] || QUICK_ACTIONS_BY_PAGE["default"];
  const handleQuickAction = (prompt: string) => sendMessage(prompt);
  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Chat Panel (Desktop) */}
      {!isMobileViewport && isOpen && (
        <ChatPanel
          isOpen={isOpen}
          isMinimized={false}
          onClose={handleClose}
          onToggleMinimize={() => setIsOpen(false)}
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
      {isMobileViewport && isOpen && (
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

// Re-exported per-page quick actions (moved verbatim from AIChatFAB).
const QUICK_ACTIONS_BY_PAGE: Record<string, { label: string; icon: React.ReactNode; prompt: string }[]> = {
  dashboard: [
    { label: "Portfolio summary", icon: <BarChart2 size={12} />, prompt: "Give me a financial health summary of our full portfolio." },
    { label: "Top overruns", icon: <AlertTriangle size={12} />, prompt: "Show me the projects with the worst cost overruns." },
    { label: "How to use", icon: <BookOpen size={12} />, prompt: "How do I use SentinelFi to track project budgets?" },
  ],
  wbs: [
    { label: "Explain WBS", icon: <BookOpen size={12} />, prompt: "Explain what the WBS budget structure is and how to use it." },
    { label: "Top variants", icon: <TrendingUp size={12} />, prompt: "Which WBS items have the highest cost variance right now?" },
    { label: "Log expense guide", icon: <Zap size={12} />, prompt: "How do I log a live expense against a WBS item?" },
  ],
  "capex-dashboard": [
    { label: "Portfolio health", icon: <BarChart2 size={12} />, prompt: "Give me an executive summary of our current CAPEX portfolio health." },
    { label: "Forecast exhaustion", icon: <Calendar size={12} />, prompt: "Forecast when our budget will be exhausted at the current burn rate." },
    { label: "Explain overruns", icon: <AlertTriangle size={12} />, prompt: "Which projects are over budget and by how much?" },
  ],
  "opex-dashboard": [
    { label: "Dept breakdown", icon: <BarChart2 size={12} />, prompt: "Which departments are spending the most vs their allocated budget?" },
    { label: "Budget runway", icon: <TrendingUp size={12} />, prompt: "Explain my OPEX budget runway and what I should watch out for." },
    { label: "Payroll insight", icon: <Zap size={12} />, prompt: "Give me a summary of recent payroll cost decomposition." },
  ],
  procurement: [
    { label: "P2P status", icon: <FileText size={12} />, prompt: "Show me the current status of all requisitions, POs, and invoices." },
    { label: "Overdue items", icon: <AlertTriangle size={12} />, prompt: "Which P2P items are overdue and need attention?" },
    { label: "Create requisition", icon: <Zap size={12} />, prompt: "Guide me through creating a new requisition." },
  ],
  approvals: [
    { label: "Pending count", icon: <FileText size={12} />, prompt: "How many items are pending my approval and what are they?" },
    { label: "High value items", icon: <TrendingUp size={12} />, prompt: "Show me the highest value items awaiting approval." },
    { label: "Approval guide", icon: <BookOpen size={12} />, prompt: "What is the approval workflow for budget drafts?" },
  ],
  "budget-draft": [
    { label: "How to submit", icon: <CheckCircle size={12} />, prompt: "What are the steps to submit a budget draft for approval?" },
    { label: "Explain DOA", icon: <BookOpen size={12} />, prompt: "Explain the Delegation of Authority (DOA) approval process." },
    { label: "Draft from doc", icon: <FileText size={12} />, prompt: "How do I auto-fill a budget draft from an uploaded document?" },
  ],
  default: [
    { label: "Portfolio summary", icon: <BarChart2 size={12} />, prompt: "Give me a financial health summary of our full portfolio." },
    { label: "Top overruns", icon: <AlertTriangle size={12} />, prompt: "Show me the projects with the worst cost overruns." },
    { label: "How to use", icon: <BookOpen size={12} />, prompt: "How do I use SentinelFi to track project budgets?" },
  ],
};

export default AIAssistantRoot;
