import React, { useState, useEffect, useCallback, memo } from 'react';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Target, Lightbulb } from 'lucide-react';
import { useAiAssistant } from '../../hooks/useAiAssistant';

interface AiNarrativePanelProps {
  scope: 'capex' | 'opex' | 'full';
  projectId?: string;
  /** Auto-loads on mount when true */
  autoLoad?: boolean;
}

/**
 * Embeds an AI-generated narrative analysis panel directly into dashboard pages.
 * Shows a collapsible panel with executive summary, insights, alerts, and recommendations.
 * World-class premium aesthetic, branded with Indigo/Violet gradient.
 */
export const AiNarrativePanel: React.FC<AiNarrativePanelProps> = memo(({ scope, projectId, autoLoad = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [narrative, setNarrative] = useState<{
    narrative: string;
    sections: Record<string, string>;
    generatedAt?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ai = useAiAssistant({ currentPage: `${scope}-dashboard` });

  const loadAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await ai.analyzeDashboard(scope, projectId);
    if (result) {
      setNarrative(result);
      setIsExpanded(true);
    } else {
      setError('Could not generate analysis. Please try again.');
    }
    setIsLoading(false);
  }, [ai, scope, projectId]);

  useEffect(() => {
    if (autoLoad) loadAnalysis();
  }, [autoLoad]);

  const scopeLabel = scope === 'capex' ? 'CAPEX Portfolio' : scope === 'opex' ? 'OPEX Operations' : 'Full Financial';

  const sectionConfig = [
    { key: 'executive_summary', label: 'Executive Summary', icon: <Target size={13} />, color: '#6366f1' },
    { key: 'key_insights', label: 'Key Insights', icon: <TrendingUp size={13} />, color: '#0ea5e9' },
    { key: 'anomalies', label: 'Alerts & Anomalies', icon: <AlertTriangle size={13} />, color: '#f59e0b' },
    { key: 'recommendations', label: 'Recommendations', icon: <Lightbulb size={13} />, color: '#22c55e' },
  ];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      {/* ── Panel Header ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(14,165,233,0.06) 100%)',
          borderBottom: narrative && isExpanded ? '1px solid rgba(255,255,255,0.06)' : 'none',
          cursor: 'pointer',
        }}
        onClick={() => narrative && setIsExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 10px rgba(99,102,241,0.4)',
          }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'block' }}>
              AI {scopeLabel} Analysis
            </span>
            {narrative?.generatedAt && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                Generated {new Date(narrative.generatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Load / Refresh button */}
          <button
            id={`ai-analyze-${scope}`}
            onClick={(e) => { e.stopPropagation(); loadAnalysis(); }}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 8, padding: '6px 12px',
              color: '#a5b4fc', fontSize: 11, cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1, transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={11} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            {narrative ? 'Refresh' : 'Analyze with AI'}
          </button>

          {/* Toggle chevron */}
          {narrative && (
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
        </div>
      </div>

      {/* ── Loading state ────────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{
          padding: '24px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          color: 'rgba(255,255,255,0.5)', fontSize: 12,
        }}>
          <span className="sentinelai-dot" /><span className="sentinelai-dot" /><span className="sentinelai-dot" />
          <span>Analyzing financial data…</span>
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────────── */}
      {error && !isLoading && (
        <div style={{ padding: '14px 18px', fontSize: 12, color: '#f87171', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* ── Narrative content ────────────────────────────────────────────────── */}
      {narrative && isExpanded && !isLoading && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sectionConfig.map(({ key, label, icon, color }) => {
            const content = narrative.sections?.[key] || (key === 'executive_summary' ? narrative.narrative : null);
            if (!content) return null;
            return (
              <div key={key}>
                {/* Section header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginBottom: 7,
                }}>
                  <span style={{ color }}>{icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                </div>
                {/* Section content */}
                <div style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65,
                  paddingLeft: 19, borderLeft: `2px solid ${color}22`,
                  whiteSpace: 'pre-wrap',
                }}>
                  {content}
                </div>
              </div>
            );
          })}

          {/* Timestamp footer */}
          <div style={{
            paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: 10, color: 'rgba(255,255,255,0.2)',
          }}>
            AI analysis • {scopeLabel} • {narrative.generatedAt ? new Date(narrative.generatedAt).toLocaleString() : 'Just now'}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});

AiNarrativePanel.displayName = 'AiNarrativePanel';
