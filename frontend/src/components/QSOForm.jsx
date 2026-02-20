import { useState, useEffect, useRef, useCallback } from 'react';

const BANDS = ['160m','80m','60m','40m','30m','20m','17m','15m','12m','10m','6m','2m','70cm'];
const MODES = ['SSB','CW','FT8','FT4','RTTY','PSK31','AM','FM','DIGI','OTHER'];

function utcDateStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function utcTimeStr() {
  return new Date().toISOString().slice(11, 16); // HH:MM
}

const DEFAULTS = {
  call: '',
  qso_date: utcDateStr(),
  time_on: utcTimeStr(),
  band: '20m',
  freq: '',
  mode: 'SSB',
  rst_sent: '59',
  rst_rcvd: '59',
  name: '',
  qth: '',
  grid: '',
  dxcc: '',
  notes: '',
};

// Merge initialValues over defaults; track which keys came from AI
function buildInitial(initialValues) {
  if (!initialValues) return { values: { ...DEFAULTS }, aiFields: new Set() };
  const aiFields = new Set();
  const values = { ...DEFAULTS };
  for (const [k, v] of Object.entries(initialValues)) {
    if (v !== null && v !== undefined && v !== '') {
      values[k] = v;
      // Only mark as AI-populated if this key has a value from the parser
      aiFields.add(k);
    }
  }
  return { values, aiFields };
}

const css = {
  form: {
    display: 'grid',
    gap: '0',
  },
  // Section header
  section: {
    fontFamily: "'Orbitron', monospace",
    fontSize: '0.55rem',
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#2a3f52',
    padding: '8px 0 5px 0',
    borderBottom: '1px solid #1e2d3d',
    marginBottom: '10px',
    marginTop: '16px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  // Main grid
  grid: (cols) => ({
    display: 'grid',
    gridTemplateColumns: cols,
    gap: '8px',
    marginBottom: '8px',
  }),
  fieldGroup: (aiHighlight) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    position: 'relative',
  }),
  label: {
    fontFamily: "'Orbitron', monospace",
    fontSize: '0.55rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  required: {
    color: '#f59e0b',
  },
  aiBadge: {
    fontSize: '0.5rem',
    fontFamily: "'Orbitron', monospace",
    color: '#f59e0b',
    letterSpacing: '0.08em',
    background: 'rgba(245,158,11,0.12)',
    padding: '1px 4px',
    border: '1px solid rgba(245,158,11,0.3)',
  },
  input: (focused, aiHighlight) => ({
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.88rem',
    color: '#e2e8f0',
    background: aiHighlight ? 'rgba(245,158,11,0.08)' : (focused ? '#161e28' : '#0d1117'),
    border: `1px solid ${aiHighlight ? 'rgba(245,158,11,0.4)' : (focused ? '#39d353' : '#1e2d3d')}`,
    padding: '6px 9px',
    outline: 'none',
    borderRadius: 0,
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 120ms ease',
    boxShadow: focused
      ? (aiHighlight
          ? '0 0 0 2px rgba(245,158,11,0.15)'
          : '0 0 0 2px rgba(57,211,83,0.15), inset 0 0 0 1px rgba(30,122,48,0.5)')
      : 'none',
  }),
  callInput: (focused, aiHighlight) => ({
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '1.15rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: '#39d353',
    textTransform: 'uppercase',
    background: aiHighlight ? 'rgba(245,158,11,0.08)' : (focused ? '#0a1a0f' : '#060d08'),
    border: `1px solid ${aiHighlight ? 'rgba(245,158,11,0.5)' : (focused ? '#39d353' : '#1a3020')}`,
    padding: '9px 12px',
    outline: 'none',
    borderRadius: 0,
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 120ms ease',
    boxShadow: focused
      ? '0 0 12px rgba(57,211,83,0.2), inset 0 0 0 1px rgba(30,122,48,0.5)'
      : 'none',
  }),
  select: (focused, aiHighlight) => ({
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.88rem',
    color: '#e2e8f0',
    background: aiHighlight ? 'rgba(245,158,11,0.08)' : (focused ? '#161e28' : '#0d1117'),
    border: `1px solid ${aiHighlight ? 'rgba(245,158,11,0.4)' : (focused ? '#39d353' : '#1e2d3d')}`,
    padding: '6px 28px 6px 9px',
    outline: 'none',
    borderRadius: 0,
    width: '100%',
    boxSizing: 'border-box',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2339d353'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 9px center',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    boxShadow: focused ? '0 0 0 2px rgba(57,211,83,0.15)' : 'none',
  }),
  textarea: (focused, aiHighlight) => ({
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.85rem',
    color: '#e2e8f0',
    background: aiHighlight ? 'rgba(245,158,11,0.08)' : (focused ? '#161e28' : '#0d1117'),
    border: `1px solid ${aiHighlight ? 'rgba(245,158,11,0.4)' : (focused ? '#39d353' : '#1e2d3d')}`,
    padding: '6px 9px',
    outline: 'none',
    borderRadius: 0,
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '60px',
    resize: 'vertical',
    transition: 'all 120ms ease',
    boxShadow: focused ? '0 0 0 2px rgba(57,211,83,0.15)' : 'none',
  }),
  submitRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid #1e2d3d',
    alignItems: 'center',
  },
  submitBtn: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    background: '#1e7a30',
    color: '#39d353',
    border: '1px solid #39d353',
    padding: '9px 24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 120ms ease',
    borderRadius: 0,
  },
  hint: {
    fontFamily: 'monospace',
    fontSize: '0.65rem',
    color: '#2a3f52',
    marginLeft: 'auto',
  },
};

// A single controlled field with focus tracking
function Field({ label, required, aiField, children }) {
  return (
    <div style={css.fieldGroup(aiField)}>
      <span style={css.label}>
        {label}
        {required && <span style={css.required}>*</span>}
        {aiField && <span style={css.aiBadge}>AI</span>}
      </span>
      {children}
    </div>
  );
}

export default function QSOForm({ initialValues, aiPopulated, onSave, loading, error }) {
  const { values: initVals, aiFields } = buildInitial(initialValues);
  const [vals, setVals] = useState(initVals);
  const [focused, setFocused] = useState(null);
  const callRef = useRef(null);

  // Re-init if initialValues changes (AI parse result comes in)
  useEffect(() => {
    const { values, aiFields: newAI } = buildInitial(initialValues);
    setVals(values);
  }, [initialValues]);

  useEffect(() => {
    callRef.current?.focus();
  }, []);

  const set = (key) => (e) => {
    const v = e.target.value;
    setVals(prev => ({ ...prev, [key]: key === 'call' ? v.toUpperCase() : v }));
  };

  // Ctrl+Enter from any field triggers save
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }, [vals]);

  function handleSave(e) {
    if (e) e.preventDefault();
    if (!vals.call.trim()) return;

    // Build payload — convert empty strings to null for optional fields
    const payload = {
      call: vals.call.trim(),
      qso_date: vals.qso_date || null,
      time_on: vals.time_on ? vals.time_on + ':00' : null, // HH:MM → HH:MM:SS
      band: vals.band || null,
      freq: vals.freq !== '' && vals.freq !== null ? parseFloat(vals.freq) : null,
      mode: vals.mode || null,
      rst_sent: vals.rst_sent || null,
      rst_rcvd: vals.rst_rcvd || null,
      name: vals.name || null,
      qth: vals.qth || null,
      grid: vals.grid || null,
      dxcc: vals.dxcc || null,
      notes: vals.notes || null,
    };
    onSave(payload);
  }

  const isAI = (key) => aiPopulated && aiFields.has(key);

  const inputProps = (key) => ({
    value: vals[key],
    onChange: set(key),
    onFocus: () => setFocused(key),
    onBlur: () => setFocused(null),
    onKeyDown: handleKeyDown,
    style: css.input(focused === key, isAI(key)),
  });

  const selectProps = (key) => ({
    value: vals[key],
    onChange: set(key),
    onFocus: () => setFocused(key),
    onBlur: () => setFocused(null),
    onKeyDown: handleKeyDown,
    style: css.select(focused === key, isAI(key)),
  });

  return (
    <form onSubmit={handleSave} style={css.form}>

      {/* ── Row 1: Callsign (wide) ── */}
      <div style={{ marginBottom: '8px' }}>
        <Field label="Callsign" required aiField={isAI('call')}>
          <input
            ref={callRef}
            type="text"
            tabIndex={1}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="W1AW"
            value={vals.call}
            onChange={set('call')}
            onFocus={() => setFocused('call')}
            onBlur={() => setFocused(null)}
            onKeyDown={handleKeyDown}
            style={css.callInput(focused === 'call', isAI('call'))}
          />
        </Field>
      </div>

      {/* ── Row 2: Date, Time ── */}
      <div style={css.grid('1fr 1fr')}>
        <Field label="Date (UTC)" aiField={isAI('qso_date')}>
          <input type="date" tabIndex={2} {...inputProps('qso_date')} />
        </Field>
        <Field label="Time (UTC)" aiField={isAI('time_on')}>
          <input type="time" tabIndex={3} {...inputProps('time_on')} />
        </Field>
      </div>

      {/* ── Row 3: Band, Freq, Mode ── */}
      <div style={css.grid('1fr 1fr 1fr')}>
        <Field label="Band" aiField={isAI('band')}>
          <select tabIndex={4} {...selectProps('band')}>
            <option value="">— select —</option>
            {BANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Freq (MHz)" aiField={isAI('freq')}>
          <input
            type="number"
            tabIndex={5}
            step="0.001"
            min="0"
            max="450000"
            placeholder="14.205"
            {...inputProps('freq')}
          />
        </Field>
        <Field label="Mode" aiField={isAI('mode')}>
          <select tabIndex={6} {...selectProps('mode')}>
            <option value="">— select —</option>
            {MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Row 4: RST Sent, RST Rcvd ── */}
      <div style={css.grid('1fr 1fr')}>
        <Field label="RST Sent" aiField={isAI('rst_sent')}>
          <input
            type="text"
            tabIndex={7}
            maxLength={10}
            placeholder="59"
            {...inputProps('rst_sent')}
          />
        </Field>
        <Field label="RST Rcvd" aiField={isAI('rst_rcvd')}>
          <input
            type="text"
            tabIndex={8}
            maxLength={10}
            placeholder="59"
            {...inputProps('rst_rcvd')}
          />
        </Field>
      </div>

      {/* ── Section: Contact Info ── */}
      <div style={css.section}>
        <span>Contact Info</span>
        <span>optional</span>
      </div>

      {/* ── Row 5: Name, QTH ── */}
      <div style={css.grid('1fr 1fr')}>
        <Field label="Name" aiField={isAI('name')}>
          <input type="text" tabIndex={9} placeholder="John" {...inputProps('name')} />
        </Field>
        <Field label="QTH" aiField={isAI('qth')}>
          <input type="text" tabIndex={10} placeholder="Springfield, IL" {...inputProps('qth')} />
        </Field>
      </div>

      {/* ── Row 6: Grid, DXCC ── */}
      <div style={css.grid('1fr 1fr')}>
        <Field label="Grid" aiField={isAI('grid')}>
          <input
            type="text"
            tabIndex={11}
            maxLength={8}
            placeholder="FN42"
            {...inputProps('grid')}
            onChange={e => setVals(prev => ({ ...prev, grid: e.target.value.toUpperCase() }))}
          />
        </Field>
        <Field label="DXCC Entity" aiField={isAI('dxcc')}>
          <input type="text" tabIndex={12} placeholder="United States" {...inputProps('dxcc')} />
        </Field>
      </div>

      {/* ── Row 7: Notes (full width) ── */}
      <div style={{ marginTop: '4px' }}>
        <Field label="Notes" aiField={isAI('notes')}>
          <textarea
            tabIndex={13}
            placeholder="Excellent conditions, rag-chewed for 20 min..."
            value={vals.notes}
            onChange={set('notes')}
            onFocus={() => setFocused('notes')}
            onBlur={() => setFocused(null)}
            onKeyDown={handleKeyDown}
            style={css.textarea(focused === 'notes', isAI('notes'))}
          />
        </Field>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderLeft: '3px solid #ef4444', color: '#ef4444', padding: '8px 12px', fontSize: '0.75rem', marginTop: '10px', fontFamily: 'monospace' }}>
          ERR: {error}
        </div>
      )}

      {/* ── Submit ── */}
      <div style={css.submitRow}>
        <button
          type="submit"
          tabIndex={14}
          disabled={loading || !vals.call.trim()}
          style={css.submitBtn}
          onMouseEnter={e => {
            if (!loading && vals.call.trim()) {
              e.currentTarget.style.background = '#39d353';
              e.currentTarget.style.color = '#080c0e';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#1e7a30';
            e.currentTarget.style.color = '#39d353';
          }}
        >
          {loading
            ? <><span style={{ width: 12, height: 12, border: '2px solid #1e2d3d', borderTopColor: '#39d353', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Saving...</>
            : '▶ Log QSO'}
        </button>
        <span style={css.hint}>Ctrl+Enter to save</span>
      </div>
    </form>
  );
}
