import React, { memo, useState } from 'react';
import { Bot, User, Sparkles, Copy, Check, AlertTriangle, ChevronRight } from 'lucide-react';
import { AiChatMessage } from '../../hooks/useAiAssistant';

interface AiChatMessageBubbleProps {
  message: AiChatMessage;
  onQuickAction?: (message: string) => void;
}

/**
 * Renders a single AI or user message bubble.
 * Supports markdown-ish formatting, action hints, suggestion chips,
 * loading animation, and copy-to-clipboard.
 */
export const AiChatMessageBubble: React.FC<AiChatMessageBubbleProps> = memo(({ message, onQuickAction }) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // ─── Loading bubble ─────────────────────────────────────────────────────────
  if (message.isLoading) {
    return (
      <div
        className="sentinelai-msg-appear"
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={12} color="#fff" />
        </div>
        <div style={{
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '4px 16px 16px 16px',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <span className="sentinelai-dot" />
          <span className="sentinelai-dot" />
          <span className="sentinelai-dot" />
        </div>
      </div>
    );
  }

  // ─── Blocked message ────────────────────────────────────────────────────────
  if (message.blocked) {
    return (
      <div
        className="sentinelai-msg-appear"
        style={{
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}
      >
        <AlertTriangle size={14} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
          {message.content}
        </p>
      </div>
    );
  }

  // ─── User bubble ────────────────────────────────────────────────────────────
  if (!isAssistant) {
    return (
      <div
        className="sentinelai-msg-appear"
        style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'flex-end' }}
      >
        <div style={{
          maxWidth: '82%',
          padding: '10px 13px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '16px 4px 16px 16px',
          fontSize: 13, color: '#e0e7ff', lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {message.content}
        </div>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={13} color="rgba(255,255,255,0.7)" />
        </div>
      </div>
    );
  }

  // ─── Assistant bubble ───────────────────────────────────────────────────────
  return (
    <div className="sentinelai-msg-appear" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
      }}>
        <Sparkles size={12} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Main content bubble */}
        <div
          style={{
            padding: '10px 13px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px 16px 16px 16px',
            position: 'relative',
            maxWidth: '100%',
          }}
        >
          {/* Rendered content */}
          <MarkdownContent content={message.content} />

          {/* Copy button */}
          <button
            onClick={handleCopy}
            title="Copy response"
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.25)', padding: 3, borderRadius: 4,
              display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>

          {/* Timestamp */}
          <div style={{ marginTop: 4, fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
            {message.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Action hints */}
        {message.actionHints && message.actionHints.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {message.actionHints.map((hint, i) => (
              <button
                key={i}
                className="sentinelai-action-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 8, padding: '5px 10px',
                  color: '#a5b4fc', fontSize: 11, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <ChevronRight size={10} />
                {hint.label}
              </button>
            ))}
          </div>
        )}

        {/* Suggestion chips */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 5px', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
              FOLLOW-UP
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {message.suggestions.slice(0, 3).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onQuickAction?.(suggestion)}
                  className="sentinelai-chip"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8, padding: '6px 10px',
                    color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <ChevronRight size={10} style={{ color: '#818cf8', flexShrink: 0 }} />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AiChatMessageBubble.displayName = 'AiChatMessageBubble';

// ─── Minimal inline Markdown renderer ─────────────────────────────────────────

interface MarkdownContentProps { content: string; }

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, wordBreak: 'break-word' }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Blank line → small spacer
        if (!trimmed) return <div key={i} style={{ height: 4 }} />;

        // ### Heading
        if (/^###\s/.test(trimmed)) {
          return <p key={i} style={{ margin: '8px 0 3px', fontSize: 12, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{trimmed.replace(/^###\s+/, '')}</p>;
        }
        // ## Heading
        if (/^##\s/.test(trimmed)) {
          return <p key={i} style={{ margin: '10px 0 4px', fontSize: 13, fontWeight: 700, color: '#e0e7ff' }}>{trimmed.replace(/^##\s+/, '')}</p>;
        }
        // # Heading
        if (/^#\s/.test(trimmed)) {
          return <p key={i} style={{ margin: '10px 0 5px', fontSize: 14, fontWeight: 700, color: '#fff' }}>{trimmed.replace(/^#\s+/, '')}</p>;
        }

        // Bullet: - or *
        if (/^[-*•]\s/.test(trimmed)) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, paddingLeft: 4 }}>
              <span style={{ color: '#818cf8', fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>•</span>
              <span>{renderInline(trimmed.replace(/^[-*•]\s+/, ''))}</span>
            </div>
          );
        }

        // Numbered list: 1.
        if (/^\d+\.\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\./)?.[1];
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, paddingLeft: 4 }}>
              <span style={{ color: '#818cf8', fontWeight: 700, fontSize: 12, lineHeight: '20px', minWidth: 16, flexShrink: 0 }}>{num}.</span>
              <span>{renderInline(trimmed.replace(/^\d+\.\s+/, ''))}</span>
            </div>
          );
        }

        // Regular paragraph
        return <p key={i} style={{ margin: '0 0 4px' }}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
};

/** Renders inline markdown: bold, italic, backtick code */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] || match[3]) {
      // Bold
      parts.push(<strong key={key++} style={{ color: '#fff', fontWeight: 700 }}>{match[2] || match[3]}</strong>);
    } else if (match[4]) {
      // Italic
      parts.push(<em key={key++} style={{ color: '#c4b5fd', fontStyle: 'italic' }}>{match[4]}</em>);
    } else if (match[5]) {
      // Inline code
      parts.push(
        <code key={key++} style={{
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 4, padding: '1px 5px', fontSize: 11, color: '#a5b4fc', fontFamily: 'monospace',
        }}>{match[5]}</code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
