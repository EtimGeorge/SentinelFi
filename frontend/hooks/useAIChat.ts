import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "../lib/api";
import {
  AIChatMessage,
  AIChatScope,
  SuggestionChip,
  ProactiveInsight,
  RichContent,
  AIChatSession,
} from "../components/ai/types";

const STORAGE_PREFIX = "sentinelfi:chat:";
const MAX_HISTORY_LENGTH = 100;

interface UseAIChatOptions {
  currentPage?: string;
  projectId?: string;
  entityType?: string;
  entityId?: string;
  tenantId?: string;
  userId?: string;
  onActionHint?: (action: string) => void;
}

interface UseAIChatReturn {
  messages: AIChatMessage[];
  scope: AIChatScope;
  isStreaming: boolean;
  proactiveInsight: ProactiveInsight | null;
  unreadCount: number;
  sessionHistory: AIChatSession[];
  sendMessage: (content: string, richContent?: RichContent) => Promise<void>;
  clearHistory: () => void;
  setScope: (scope: Partial<AIChatScope>) => void;
  markAsRead: () => void;
  dismissProactiveInsight: () => void;
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const {
    currentPage = "default",
    projectId,
    entityType,
    entityId,
    tenantId = "default",
    userId = "default",
    onActionHint,
  } = options;

  const storageKey = `${STORAGE_PREFIX}${tenantId}:${userId}`;

  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    } catch (e) {
      console.warn("[useAIChat] Failed to load chat history:", e);
    }
    return [];
  });

  const [scope, setScopeState] = useState<AIChatScope>({
    page: currentPage,
    entityType,
    entityId,
    projectId,
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [proactiveInsight, setProactiveInsight] =
    useState<ProactiveInsight | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<AIChatSession[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdCounter = useRef(0);

  // Persist messages to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const toStore = messages.slice(-MAX_HISTORY_LENGTH);
      localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch (e) {
      console.warn("[useAIChat] Failed to persist chat history:", e);
    }
  }, [messages, storageKey]);

  // Load session history
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const historyKey = `${storageKey}:sessions`;
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSessionHistory(
          parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            messages: s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          })),
        );
      }
    } catch (e) {
      console.warn("[useAIChat] Failed to load session history:", e);
    }
  }, [storageKey]);

  // Update scope when page changes
  useEffect(() => {
    setScopeState((prev) => ({ ...prev, page: currentPage }));
  }, [currentPage]);

  // Auto-scroll handling would be in the component

  const generateId = useCallback(
    () => `msg_${Date.now()}_${++messageIdCounter.current}`,
    [],
  );

  const sendMessage = useCallback(
    async (content: string, richContent?: RichContent) => {
      if (isStreaming) return;

      const userMessage: AIChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setUnreadCount(0);

      // Create streaming assistant message
      const assistantMessageId = generateId();
      const assistantMessage: AIChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch("/api/v1/ai/chat/stream", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
            scope: { ...scope, page: currentPage },
            conversation_history: messages.slice(-10).map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content:
                typeof m.content === "string"
                  ? m.content
                  : JSON.stringify(m.content),
            })),
            project_id: projectId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        let richContentBuffer: RichContent | null = null;

        if (!reader) throw new Error("No response body");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          // Try to parse as SSE or JSON chunks
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulatedContent = data.content;
                }
                if (data.rich_content) {
                  richContentBuffer = data.rich_content;
                }
                if (data.suggestions) {
                  // Handle suggestions
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }

          // Update streaming message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: accumulatedContent || chunk,
                    streaming: true,
                  }
                : m,
            ),
          );
        }

        // Finalize message
        const finalContent = richContentBuffer
          ? richContentBuffer
          : accumulatedContent;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: finalContent, streaming: false }
              : m,
          ),
        );

        // Check for proactive insights in response
        if (accumulatedContent.includes("proactive_insight")) {
          try {
            const insightMatch = accumulatedContent.match(
              /proactive_insight[:\s]*({.*?})/,
            );
            if (insightMatch) {
              const insight = JSON.parse(insightMatch[1]);
              setProactiveInsight({
                id: generateId(),
                type: insight.type || "info",
                severity: insight.severity || "info",
                title: insight.title || "AI Insight",
                message: insight.message || "",
                entityType: insight.entityType,
                entityId: insight.entityId,
                actionPrompt: insight.actionPrompt,
                dismissible: true,
                createdAt: new Date(),
              });
            }
          } catch (e) {
            // Ignore insight parsing errors
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;

        console.error("[useAIChat] Send message error:", error);

        // Replace streaming message with error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    "I encountered an error processing your request. Please try again.",
                  streaming: false,
                  metadata: { source: "error" },
                }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [currentPage, messages, projectId, scope, isStreaming, generateId],
  );

  const clearHistory = useCallback(() => {
    if (messages.length > 0) {
      // Archive current session
      const session: AIChatSession = {
        id: generateId(),
        tenantId,
        userId,
        scope,
        messages: [...messages],
        createdAt: messages[0]?.timestamp || new Date(),
        updatedAt: new Date(),
      };

      setSessionHistory((prev) => [session, ...prev.slice(0, 19)]); // Keep last 20 sessions

      try {
        const historyKey = `${storageKey}:sessions`;
        localStorage.setItem(
          historyKey,
          JSON.stringify([session, ...sessionHistory.slice(0, 19)]),
        );
      } catch (e) {
        console.warn("[useAIChat] Failed to save session:", e);
      }
    }

    setMessages([]);
    setUnreadCount(0);
    setProactiveInsight(null);

    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn("[useAIChat] Failed to clear storage:", e);
    }
  }, [
    messages,
    scope,
    tenantId,
    userId,
    sessionHistory,
    storageKey,
    generateId,
  ]);

  const setScope = useCallback(
    (newScope: Partial<AIChatScope>) => {
      setScopeState((prev) => ({ ...prev, ...newScope }));

      // Add context change acknowledgment message
      if (newScope.page && newScope.page !== scope.page) {
        const contextMessage: AIChatMessage = {
          id: generateId(),
          role: "assistant",
          content: `Context switched to **${newScope.page}**. How can I help you here?`,
          timestamp: new Date(),
          metadata: { source: "context_change" },
        };
        setMessages((prev) => [...prev, contextMessage]);
      }
    },
    [scope.page, generateId],
  );

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const dismissProactiveInsight = useCallback(() => {
    setProactiveInsight(null);
  }, []);

  return {
    messages,
    scope,
    isStreaming,
    proactiveInsight,
    unreadCount,
    sessionHistory,
    sendMessage,
    clearHistory,
    setScope,
    markAsRead,
    dismissProactiveInsight,
  };
}

export default useAIChat;
