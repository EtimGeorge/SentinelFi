import { useState, useCallback, useRef, useEffect } from 'react';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  blocked?: boolean;
  blockReason?: string;
  suggestions?: string[];
  actionHints?: { label: string; action: string }[];
  isLoading?: boolean;
}

export interface UseAiAssistantOptions {
  currentPage?: string;
  projectId?: string;
  onActionHint?: (action: string) => void;
}

const API_BASE = '/api/v1/ai';

let sessionCounter = 0;
function generateSessionId(): string {
  sessionCounter++;
  return `sentinel-session-${Date.now()}-${sessionCounter}`;
}

/**
 * Central hook for all AI Assistant interactions.
 * - Manages conversation history and session state
 * - Provides chat, explain, forecast, and analyze methods
 * - Handles errors gracefully with user-friendly messaging
 */
export function useAiAssistant(options: UseAiAssistantOptions = {}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  // Reset session when page changes (clears irrelevant context)
  useEffect(() => {
    sessionIdRef.current = generateSessionId();
    setMessages([]);
    setError(null);
  }, [options.currentPage]);

  const addAssistantMessage = useCallback((
    content: string,
    extras?: Partial<AiChatMessage>
  ) => {
    const msg: AiChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      ...extras,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const addUserMessage = useCallback((content: string) => {
    const msg: AiChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  /**
   * Sends a chat message and receives an AI response.
   */
  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!message.trim()) return;
    setError(null);

    const userMsg = addUserMessage(message);

    // Add loading placeholder
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }]);
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter(m => !m.isLoading)
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message,
          sessionId: sessionIdRef.current,
          history: historyPayload,
          currentPage: options.currentPage,
          projectId: options.projectId,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }

      const data = await res.json();

      // Replace loading placeholder with response
      setMessages(prev => prev
        .filter(m => m.id !== loadingId)
        .concat({
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.response ?? 'No response received.',
          timestamp: new Date(),
          blocked: data.blocked ?? false,
          blockReason: data.blockReason,
          suggestions: data.suggestions ?? [],
          actionHints: data.actionHints ?? [],
        })
      );

    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      const errMsg = 'I\'m having trouble connecting right now. Please try again.';
      addAssistantMessage(errMsg);
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [messages, options.currentPage, options.projectId, addUserMessage, addAssistantMessage]);

  /**
   * Fetches an AI explanation of a specific section.
   * Returns the explanation string directly (for inline use).
   */
  const explainSection = useCallback(async (sectionKey: string, additionalContext?: string): Promise<string> => {
    try {
      const res = await fetch(`${API_BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sectionKey, additionalContext }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.explanation ?? 'Explanation unavailable.';
    } catch {
      return 'Explanation temporarily unavailable.';
    }
  }, []);

  /**
   * Fetches an AI budget forecast.
   */
  const fetchForecast = useCallback(async (projectId?: string): Promise<any | null> => {
    try {
      const res = await fetch(`${API_BASE}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  /**
   * Fetches an AI dashboard analysis narrative.
   */
  const analyzeDashboard = useCallback(async (
    scope: 'capex' | 'opex' | 'full',
    projectId?: string
  ): Promise<{ narrative: string; sections: Record<string, string> } | null> => {
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scope, projectId }),
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  /**
   * Generates branded AI report narrative.
   */
  const generateNarrative = useCallback(async (params: {
    reportType: 'variance' | 'capex' | 'opex' | 'executive';
    projectName?: string;
    periodLabel?: string;
    currency?: string;
  }): Promise<{ narrative: string; generatedAt: string } | null> => {
    try {
      const res = await fetch(`${API_BASE}/generate-narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  /**
   * Uploads a document and extracts structured form data.
   */
  const extractFormData = useCallback(async (
    file: File,
    targetForm: 'requisition' | 'live-expense' | 'invoice' | 'purchase-order' | 'wbs-budget',
    projectName: string
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetForm', targetForm);
      formData.append('projectName', projectName);

      const res = await fetch(`${API_BASE}/fill-form`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) throw new Error(`Extraction failed: ${res.status}`);
      return await res.json();
    } catch (err: any) {
      setError(err.message || 'Failed to extract data from document.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fires a quick contextual question into the chat and opens the widget.
   */
  const askQuick = useCallback((message: string) => {
    sendMessage(message);
  }, [sendMessage]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    sessionIdRef.current = generateSessionId();
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    explainSection,
    fetchForecast,
    analyzeDashboard,
    generateNarrative,
    extractFormData,
    askQuick,
    clearHistory,
    sessionId: sessionIdRef.current,
    messageCount: messages.filter(m => !m.isLoading).length,
  };
}
