import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listQSOs, deleteQSO } from '../api';

const s = {
  page: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px 20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  title: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#39d353',
    flex: 1,
  },
  newBtn: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    background: '#1e7a30',
    color: '#39d353',
    border: '1px solid #39d353',
    padding: '7px 16px',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 120ms ease',
    borderRadius: 0,
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '14px',
    alignItems: 'center',
  },
  searchInput: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.88rem',
    color: '#e2e8f0',
    background: '#0d1117',
    border: '1px solid #1e2d3d',
    padding: '6px 10px',
    outline: 'none',
    borderRadius: 0,
    width: '220px',
    boxSizing: 'border-box',
    transition: 'all 120ms ease',
    textTransform: 'uppercase',
  },
  total: {
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    color: '#2a3f52',
    marginLeft: 'auto',
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid #1e2d3d',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.82rem',
  },
  th: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.55rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#475569',
    padding: '8px 10px',
    background: '#111820',
    borderBottom: '1px solid #1e2d3d',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '7px 10px',
    borderBottom: '1px solid #111820',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  tdCall: {
    padding: '7px 10px',
    borderBottom: '1px solid #111820',
    color: '#39d353',
    fontWeight: 600,
    letterSpacing: '0.08em',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
  },
  trEven: { background: '#0d1117' },
  trOdd:  { background: '#0a0f14' },
  deleteBtn: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.55rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    background: 'transparent',
    color: '#2a3f52',
    border: '1px solid #1e2d3d',
    padding: '3px 8px',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    borderRadius: 0,
  },
  empty: {
    padding: '48px 20px',
    textAlign: 'center',
    color: '#2a3f52',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    borderTop: '1px solid #1e2d3d',
  },
  loadingRow: {
    padding: '24px',
    textAlign: 'center',
    color: '#2a3f52',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderLeft: '3px solid #ef4444',
    color: '#ef4444',
    padding: '8px 12px',
    fontSize: '0.75rem',
    marginBottom: '12px',
    fontFamily: 'monospace',
  },
};

function fmt(val, fallback = '—') {
  return val ?? fallback;
}

function fmtRST(sent, rcvd) {
  if (!sent && !rcvd) return '—';
  return `${sent ?? '?'}/${rcvd ?? '?'}`;
}

export default function LogList() {
  const [qsos, setQsos] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchQSOs = useCallback(async (callFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await listQSOs({ call: callFilter || undefined, limit: 200 });
      setQsos(data.items);
      setTotal(data.total);
    } catch {
      setError('Failed to load QSO log. Check connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQSOs(''); }, [fetchQSOs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchQSOs(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, fetchQSOs]);

  async function handleDelete(id) {
    try {
      await deleteQSO(id);
      setQsos(prev => prev.filter(q => q.id !== id));
      setTotal(prev => prev - 1);
    } catch {
      setError('Failed to delete QSO.');
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Contact Log</h2>
        <Link
          to="/log/new"
          style={s.newBtn}
          onMouseEnter={e => { e.currentTarget.style.background = '#39d353'; e.currentTarget.style.color = '#080c0e'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1e7a30'; e.currentTarget.style.color = '#39d353'; }}
        >
          + New Contact
        </Link>
      </div>

      {error && <div style={s.error}>ERR: {error}</div>}

      <div style={s.searchRow}>
        <input
          type="text"
          placeholder="Search callsign..."
          value={search}
          onChange={e => setSearch(e.target.value.toUpperCase())}
          style={s.searchInput}
          onFocus={e => { e.target.style.borderColor = '#39d353'; e.target.style.boxShadow = '0 0 0 2px rgba(57,211,83,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#1e2d3d'; e.target.style.boxShadow = 'none'; }}
        />
        <span style={s.total}>
          {loading ? 'Loading...' : `${total} QSO${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Date</th>
              <th style={s.th}>Time (UTC)</th>
              <th style={s.th}>Call</th>
              <th style={s.th}>Band</th>
              <th style={s.th}>Mode</th>
              <th style={s.th}>RST S/R</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>QTH</th>
              <th style={s.th}>Notes</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} style={s.loadingRow}>Loading log...</td></tr>
            )}
            {!loading && qsos.length === 0 && (
              <tr>
                <td colSpan={10} style={s.empty}>
                  No contacts logged yet.{' '}
                  <Link to="/log/new" style={{ color: '#39d353' }}>Log your first QSO →</Link>
                </td>
              </tr>
            )}
            {!loading && qsos.map((q, i) => (
              <tr
                key={q.id}
                style={i % 2 === 0 ? s.trEven : s.trOdd}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2430'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#0d1117' : '#0a0f14'}
              >
                <td style={s.td}>{fmt(q.qso_date)}</td>
                <td style={s.td}>{q.time_on ? q.time_on.slice(0, 5) : '—'}</td>
                <td style={s.tdCall}>{q.call}</td>
                <td style={s.td}>{fmt(q.band)}</td>
                <td style={s.td}>{fmt(q.mode)}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{fmtRST(q.rst_sent, q.rst_rcvd)}</td>
                <td style={s.td}>{fmt(q.name)}</td>
                <td style={s.td}>{fmt(q.qth)}</td>
                <td style={{ ...s.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fmt(q.notes)}
                </td>
                <td style={s.td}>
                  {confirmDelete === q.id ? (
                    <span style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        onClick={() => handleDelete(q.id)}
                        style={{ ...s.deleteBtn, color: '#ef4444', borderColor: '#ef4444' }}
                        onMouseEnter={e => { e.target.style.background = '#ef4444'; e.target.style.color = '#080c0e'; }}
                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#ef4444'; }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={s.deleteBtn}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(q.id)}
                      style={s.deleteBtn}
                      onMouseEnter={e => { e.target.style.color = '#ef4444'; e.target.style.borderColor = '#ef4444'; }}
                      onMouseLeave={e => { e.target.style.color = '#2a3f52'; e.target.style.borderColor = '#1e2d3d'; }}
                    >
                      Del
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
