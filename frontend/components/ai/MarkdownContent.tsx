import React from "react";

interface MarkdownContentProps {
  content: string;
  /** Compact variant for constrained surfaces (mobile sheet). */
  compact?: boolean;
}

/**
 * Minimal, dependency-free markdown renderer for AI assistant output.
 * Handles headings, bullets, numbered lists, bold/italic/inline-code.
 * Extracted from the legacy widget stack so the live FAB panel renders
 * markdown instead of raw "##" / "**" artifacts.
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, compact = false }) => {
  const lines = content.split("\n");

  return (
    <div
      className="text-white/90"
      style={{ fontSize: compact ? 12 : 13, lineHeight: 1.6, wordBreak: "break-word" }}
    >
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Blank line → small spacer
        if (!trimmed) return <div key={i} style={{ height: 4 }} />;

        // ### Heading
        if (/^###\s/.test(trimmed)) {
          return (
            <p
              key={i}
              style={{
                margin: "8px 0 3px",
                fontSize: 12,
                fontWeight: 700,
                color: "#c4b5fd",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {trimmed.replace(/^###\s+/, "")}
            </p>
          );
        }
        // ## Heading
        if (/^##\s/.test(trimmed)) {
          return (
            <p key={i} style={{ margin: "10px 0 4px", fontSize: 13, fontWeight: 700, color: "#e0e7ff" }}>
              {trimmed.replace(/^##\s+/, "")}
            </p>
          );
        }
        // # Heading
        if (/^#\s/.test(trimmed)) {
          return (
            <p key={i} style={{ margin: "10px 0 5px", fontSize: 14, fontWeight: 700, color: "#fff" }}>
              {trimmed.replace(/^#\s+/, "")}
            </p>
          );
        }

        // Bullet: - or *
        if (/^[-*•]\s/.test(trimmed)) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3, paddingLeft: 4 }}>
              <span style={{ color: "#818cf8", fontSize: 14, lineHeight: "20px", flexShrink: 0 }}>•</span>
              <span>{renderInline(trimmed.replace(/^[-*•]\s+/, ""))}</span>
            </div>
          );
        }

        // Numbered list: 1.
        if (/^\d+\.\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\./)?.[1];
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3, paddingLeft: 4 }}>
              <span
                style={{
                  color: "#818cf8",
                  fontWeight: 700,
                  fontSize: 12,
                  lineHeight: "20px",
                  minWidth: 16,
                  flexShrink: 0,
                }}
              >
                {num}.
              </span>
              <span>{renderInline(trimmed.replace(/^\d+\.\s+/, ""))}</span>
            </div>
          );
        }

        // Regular paragraph
        return <p key={i} style={{ margin: "0 0 4px" }}>{renderInline(trimmed)}</p>;
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
      parts.push(
        <strong key={key++} style={{ color: "#fff", fontWeight: 700 }}>
          {match[2] || match[3]}
        </strong>,
      );
    } else if (match[4]) {
      parts.push(
        <em key={key++} style={{ color: "#e0e7ff" }}>
          {match[4]}
        </em>,
      );
    } else if (match[5]) {
      parts.push(
        <code
          key={key++}
          style={{
            background: "rgba(99,102,241,0.15)",
            color: "#c7d2fe",
            padding: "1px 4px",
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {match[5]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export default MarkdownContent;
