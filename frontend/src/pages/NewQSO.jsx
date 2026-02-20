import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QSOForm from '../components/QSOForm';
import { createQSO, parseQSO, lookupCallsign } from '../api';

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence * 100);
  const segments = 10;
  const filled = Math.round(confidence * segments);
  const color =
    confidence >= 0.8 ? '#39d353' : confidence >= 0.5 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: '0.5rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#475569',
          whiteSpace: 'nowrap',
        }}
      >
        Confidence
      </span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            style={{
              width: '9px',
              height: '11px',
              background: i < filled ? color : '#1e2d3d',
              transition: 'background 200ms ease',
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.78rem',
          color,
          fontWeight: 600,
          minWidth: '2.8rem',
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '24px 20px',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid #1e2d3d',
  },
  title: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#39d353',
  },
  timestamp: {
    fontFamily: 'monospace',
    fontSize: '0.65rem',
    color: '#2a3f52',
  },
  successBanner: {
    background: 'rgba(57,211,83,0.08)',
    border: '1px solid #39d353',
    borderLeft: '3px solid #39d353',
    color: '#39d353',
    padding: '10px 14px',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  // ── AI parse panel ──────────────────────────────────────
  aiPanel: {
    border: '1px solid rgba(245,158,11,0.25)',
    borderLeft: '3px solid rgba(245,158,11,0.55)',
    marginBottom: '24px',
    background: 'rgba(245,158,11,0.02)',
  },
  aiPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(245,158,11,0.12)',
    userSelect: 'none',
  },
  aiPanelTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#f59e0b',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  aiPanelMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  aiPanelSub: {
    fontFamily: 'monospace',
    fontSize: '0.6rem',
    color: '#2a3f52',
  },
  aiPanelBody: {
    padding: '12px',
  },
  aiTextarea: (focused) => ({
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.82rem',
    color: '#e2e8f0',
    background: focused ? '#0d1117' : '#080c0e',
    border: `1px solid ${focused ? 'rgba(245,158,11,0.5)' : '#1e2d3d'}`,
    padding: '10px 12px',
    outline: 'none',
    borderRadius: 0,
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '82px',
    resize: 'vertical',
    lineHeight: 1.55,
    boxShadow: focused ? '0 0 0 2px rgba(245,158,11,0.1)' : 'none',
    transition: 'all 120ms ease',
  }),
  aiFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
    flexWrap: 'wrap',
  },
  parseBtn: (active) => ({
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.62rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    background: 'rgba(245,158,11,0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.45)',
    padding: '7px 18px',
    cursor: active ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: 0,
    transition: 'all 120ms ease',
    opacity: active ? 0.65 : 1,
  }),
  clearBtn: {
    fontFamily: 'monospace',
    fontSize: '0.65rem',
    color: '#2a3f52',
    background: 'transparent',
    border: '1px solid #1e2d3d',
    padding: '6px 12px',
    cursor: 'pointer',
    borderRadius: 0,
    transition: 'all 120ms ease',
  },
  charCount: {
    fontFamily: 'monospace',
    fontSize: '0.6rem',
    color: '#2a3f52',
    marginLeft: 'auto',
  },
  parseSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginTop: '10px',
    padding: '8px 10px',
    background: 'rgba(245,158,11,0.04)',
    border: '1px solid rgba(245,158,11,0.15)',
  },
  parseSuccessNote: {
    fontFamily: 'monospace',
    fontSize: '0.62rem',
    color: '#2a3f52',
  },
  parseError: {
    background: 'rgba(239,68,68,0.07)',
    border: '1px solid rgba(239,68,68,0.5)',
    borderLeft: '3px solid #ef4444',
    color: '#ef4444',
    padding: '8px 12px',
    fontSize: '0.72rem',
    marginTop: '10px',
    fontFamily: 'monospace',
  },
  parseErrorNote: {
    display: 'block',
    marginTop: '4px',
    color: 'rgba(239,68,68,0.55)',
    fontSize: '0.62rem',
  },
  chevron: (expanded) => ({
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: 'rgba(245,158,11,0.4)',
    transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
    transition: 'transform 150ms ease',
    display: 'inline-block',
  }),
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewQSO() {
  const navigate = useNavigate();

  // Save state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedCall, setSavedCall] = useState('');

  // AI parse state
  const [nlText, setNlText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState('');
  const [aiPopulated, setAiPopulated] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [textFocused, setTextFocused] = useState(false);

  // Callsign lookup state
  const [lookupResult, setLookupResult] = useState(null);       // merged into form
  const [callsignLookupStatus, setCallsignLookupStatus] = useState(null);
  const lastLookedUp = useRef('');  // avoid re-fetching same call twice

  async function handleParse() {
    if (!nlText.trim() || parsing) return;
    setParsing(true);
    setParseError('');
    try {
      const result = await parseQSO(nlText.trim());
      setParseResult(result);
      setAiPopulated(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setParseError(detail || 'Parse failed. Check your connection or try rephrasing.');
      setParseResult(null);
      setAiPopulated(false);
    } finally {
      setParsing(false);
    }
  }

  function handleClear() {
    setNlText('');
    setParseResult(null);
    setParseError('');
    setAiPopulated(false);
  }

  async function handleCallsignBlur(callsign) {
    const upper = callsign.toUpperCase();
    if (upper === lastLookedUp.current) return;
    lastLookedUp.current = upper;

    setCallsignLookupStatus({ type: 'loading' });
    try {
      const data = await lookupCallsign(upper);
      if (data.source === 'none') {
        setCallsignLookupStatus({ type: 'not_found' });
        setLookupResult(null);
        return;
      }
      // Build a label from whatever fields came back
      const parts = [data.name, data.qth, data.dxcc].filter(Boolean);
      setCallsignLookupStatus({ type: 'found', label: parts.join(' · ') || upper });
      // Only keep non-null fields so they don't overwrite user edits
      const merged = {};
      if (data.name) merged.name = data.name;
      if (data.qth)  merged.qth  = data.qth;
      if (data.grid) merged.grid = data.grid;
      if (data.dxcc) merged.dxcc = data.dxcc;
      setLookupResult(Object.keys(merged).length ? merged : null);
    } catch {
      setCallsignLookupStatus({ type: 'error' });
      setLookupResult(null);
    }
  }

  function handleTextKeyDown(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleParse();
    }
  }

  async function handleSave(payload) {
    setError('');
    setLoading(true);
    try {
      const qso = await createQSO(payload);
      setSavedCall(qso.call);
      setTimeout(() => navigate('/log'), 1200);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || JSON.stringify(d)).join('; '));
      } else {
        setError(detail || 'Failed to save QSO. Check connection.');
      }
    } finally {
      setLoading(false);
    }
  }

  const parsedFieldCount = parseResult
    ? Object.values(parseResult.parsed).filter(v => v !== null && v !== undefined && v !== '').length
    : 0;

  return (
    <div style={s.page}>
      {/* ── Page header ── */}
      <div style={s.header}>
        <h2 style={s.title}>Log New Contact</h2>
        <span style={s.timestamp}>{new Date().toUTCString()}</span>
      </div>

      {savedCall && (
        <div style={s.successBanner}>
          <span>✓</span>
          <span>QSO with {savedCall} logged. Returning to log...</span>
        </div>
      )}

      {/* ── AI Parse Panel ── */}
      <div style={s.aiPanel}>
        {/* Header / toggle */}
        <div
          style={s.aiPanelHeader}
          onClick={() => setPanelExpanded(e => !e)}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={s.aiPanelTitle}>
            <span style={{ fontSize: '0.75rem' }}>⚡</span>
            AI Parse
          </span>
          <div style={s.aiPanelMeta}>
            <span style={s.aiPanelSub}>natural language input</span>
            <span style={s.chevron(panelExpanded)}>▾</span>
          </div>
        </div>

        {/* Collapsible body */}
        {panelExpanded && (
          <div style={s.aiPanelBody}>
            <textarea
              value={nlText}
              onChange={e => setNlText(e.target.value)}
              onFocus={() => setTextFocused(true)}
              onBlur={() => setTextFocused(false)}
              onKeyDown={handleTextKeyDown}
              placeholder="Worked W1AW on 20m SSB, gave him 59 got 57, name Art from CT..."
              style={s.aiTextarea(textFocused)}
              spellCheck={false}
              maxLength={2000}
            />

            {/* Action row */}
            <div style={s.aiFooter}>
              <button
                onClick={handleParse}
                disabled={!nlText.trim() || parsing}
                style={s.parseBtn(parsing)}
                onMouseEnter={e => {
                  if (!parsing && nlText.trim()) {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.18)';
                    e.currentTarget.style.borderColor = '#f59e0b';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(245,158,11,0.45)';
                }}
              >
                {parsing ? (
                  <>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        border: '2px solid rgba(245,158,11,0.25)',
                        borderTopColor: '#f59e0b',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Parsing...
                  </>
                ) : (
                  '⚡ Parse'
                )}
              </button>

              {(nlText || parseResult) && (
                <button
                  onClick={handleClear}
                  style={s.clearBtn}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = '#2a3f52';
                    e.currentTarget.style.borderColor = '#1e2d3d';
                  }}
                >
                  clear
                </button>
              )}

              <span style={s.charCount}>{nlText.length}/2000 · Ctrl+Enter to parse</span>
            </div>

            {/* Parse success summary */}
            {parseResult && !parseError && (
              <div style={s.parseSuccess}>
                <ConfidenceBar confidence={parseResult.confidence} />
                <span style={s.parseSuccessNote}>
                  {parsedFieldCount} field{parsedFieldCount !== 1 ? 's' : ''} extracted · review and correct below
                </span>
              </div>
            )}

            {/* Parse error */}
            {parseError && (
              <div style={s.parseError}>
                ERR: {parseError}
                <span style={s.parseErrorNote}>
                  Form is available below for manual entry.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── QSO Form ── */}
      <QSOForm
        initialValues={{ ...(parseResult?.parsed ?? {}), ...(lookupResult ?? {}) }}
        aiPopulated={aiPopulated}
        onSave={handleSave}
        loading={loading}
        error={error}
        onCallsignBlur={handleCallsignBlur}
        callsignLookupStatus={callsignLookupStatus}
      />
    </div>
  );
}
