import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listQSOs, deleteQSO, exportADIF } from '../api';

// ── Column definitions ────────────────────────────────────────────────────────

const COLS = [
  { key: 'qso_date', label: 'Date',      sortable: true  },
  { key: 'time_on',  label: 'UTC',        sortable: true  },
  { key: 'call',     label: 'Callsign',   sortable: true  },
  { key: 'band',     label: 'Band',       sortable: true  },
  { key: 'mode',     label: 'Mode',       sortable: true  },
  { key: 'rst',      label: 'RST S/R',    sortable: false },
  { key: 'name',     label: 'Name',       sortable: true  },
  { key: 'qth',      label: 'QTH',        sortable: true  },
  { key: 'notes',    label: 'Notes',      sortable: false },
];

// Band ordering for smarter band sort
const BAND_ORDER = ['160m','80m','60m','40m','30m','20m','17m','15m','12m','10m','6m','2m','70cm'];

function bandRank(b) {
  const i = BAND_ORDER.indexOf(b);
  return i === -1 ? 99 : i;
}

function sortQSOs(qsos, col, dir) {
  if (!col) return qsos;
  const mul = dir === 'asc' ? 1 : -1;
  return [...qsos].sort((a, b) => {
    let av, bv;
    if (col === 'band') {
      av = bandRank(a.band);
      bv = bandRank(b.band);
    } else {
      av = a[col] ?? '';
      bv = b[col] ?? '';
    }
    if (av < bv) return -1 * mul;
    if (av > bv) return  1 * mul;
    return 0;
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
  },
  title: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.8rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#39d353',
    flex: 1,
  },
  headerBtn: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    border: '1px solid',
    padding: '6px 14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 120ms ease',
    borderRadius: 0,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  newBtn: {
    background: '#1e7a30',
    color: '#39d353',
    borderColor: '#39d353',
  },
  exportBtn: {
    background: 'transparent',
    color: '#f59e0b',
    borderColor: '#92600a',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    alignItems: 'center',
  },
  searchInput: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.85rem',
    color: '#e2e8f0',
    background: '#0d1117',
    border: '1px solid #1e2d3d',
    padding: '6px 10px',
    outline: 'none',
    borderRadius: 0,
    width: '200px',
    boxSizing: 'border-box',
    transition: 'all 120ms ease',
    textTransform: 'uppercase',
  },
  total: {
    fontFamily: 'monospace',
    fontSize: '0.68rem',
    color: '#2a3f52',
    marginLeft: 'auto',
    userSelect: 'none',
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
    fontSize: '0.5rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#475569',
    padding: '8px 10px',
    background: '#111820',
    borderBottom: '1px solid #1e2d3d',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  thSortable: {
    cursor: 'pointer',
    transition: 'color 100ms ease',
  },
  thActive: {
    color: '#39d353',
  },
  sortArrow: {
    display: 'inline-block',
    marginLeft: '4px',
    opacity: 0.9,
    fontSize: '0.6rem',
  },
  td: {
    padding: '6px 10px',
    borderBottom: '1px solid #111820',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  tdCall: {
    padding: '6px 10px',
    borderBottom: '1px solid #111820',
    color: '#39d353',
    fontWeight: 600,
    letterSpacing: '0.1em',
    fontSize: '0.88rem',
    whiteSpace: 'nowrap',
  },
  tdMono: {
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.05em',
  },
  tdTruncate: {
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  trEven:  { background: '#0d1117' },
  trOdd:   { background: '#0a0f14' },
  delBtn: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.5rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'transparent',
    color: '#2a3f52',
    border: '1px solid #1e2d3d',
    padding: '3px 7px',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    borderRadius: 0,
    whiteSpace: 'nowrap',
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
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid #ef4444',
    borderLeft: '3px solid #ef4444',
    color: '#ef4444',
    padding: '7px 12px',
    fontSize: '0.75rem',
    marginBottom: '10px',
    fontFamily: 'monospace',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val) { return val ?? '—'; }
function fmtRST(sent, rcvd) {
  if (!sent && !rcvd) return '—';
  return `${sent ?? '?'}/${rcvd ?? '?'}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LogList() {
  const [qsos,          setQsos]          = useState([]);
  const [total,         setTotal]         = useState(0);
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sortCol,       setSortCol]       = useState('qso_date');
  const [sortDir,       setSortDir]       = useState('desc');
  const [exporting,     setExporting]     = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────

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

  // Debounced callsign search
  useEffect(() => {
    const timer = setTimeout(() => fetchQSOs(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, fetchQSOs]);

  // ── Sorting ─────────────────────────────────────────────────────────────────

  const displayed = useMemo(() => sortQSOs(qsos, sortCol, sortDir), [qsos, sortCol, sortDir]);

  function handleSort(colKey) {
    if (sortCol === colKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  }

  function sortIndicator(colKey) {
    if (sortCol !== colKey) return <span style={{ ...s.sortArrow, opacity: 0.18 }}>⇅</span>;
    return <span style={s.sortArrow}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  // ── ADIF Export ─────────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      const blob = await exportADIF();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href     = url;
      a.download = `hamlog_${date}.adi`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('ADIF export failed. Check connection.');
    } finally {
      setExporting(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h2 style={s.title}>Contact Log</h2>

        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          style={{ ...s.headerBtn, ...s.exportBtn }}
          onMouseEnter={e => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = '#f59e0b';
              e.currentTarget.style.color = '#080c0e';
              e.currentTarget.style.borderColor = '#f59e0b';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#f59e0b';
            e.currentTarget.style.borderColor = '#92600a';
          }}
        >
          {exporting ? '⋯' : '↓'} Export ADIF
        </button>

        <Link
          to="/log/new"
          style={{ ...s.headerBtn, ...s.newBtn }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#39d353';
            e.currentTarget.style.color = '#080c0e';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#1e7a30';
            e.currentTarget.style.color = '#39d353';
          }}
        >
          + New Contact
        </Link>
      </div>

      {error && <div style={s.error}>ERR: {error}</div>}

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input
          type="text"
          placeholder="Search callsign..."
          value={search}
          onChange={e => setSearch(e.target.value.toUpperCase())}
          style={s.searchInput}
          onFocus={e => {
            e.target.style.borderColor = '#39d353';
            e.target.style.boxShadow = '0 0 0 2px rgba(57,211,83,0.1)';
          }}
          onBlur={e => {
            e.target.style.borderColor = '#1e2d3d';
            e.target.style.boxShadow = 'none';
          }}
        />
        <span style={s.total}>
          {loading ? 'Loading...' : `${total} QSO${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {COLS.map(col => {
                const isActive = sortCol === col.key;
                const thStyle = {
                  ...s.th,
                  ...(col.sortable ? s.thSortable : {}),
                  ...(isActive ? s.thActive : {}),
                };
                return (
                  <th
                    key={col.key}
                    style={thStyle}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    {col.label}
                    {col.sortable && sortIndicator(col.key)}
                  </th>
                );
              })}
              <th style={s.th} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} style={s.loadingRow}>Loading log...</td></tr>
            )}
            {!loading && displayed.length === 0 && (
              <tr>
                <td colSpan={10} style={s.empty}>
                  {search
                    ? `No contacts matching "${search}".`
                    : <>No contacts logged yet.{' '}
                        <Link to="/log/new" style={{ color: '#39d353' }}>Log your first QSO →</Link>
                      </>
                  }
                </td>
              </tr>
            )}
            {!loading && displayed.map((q, i) => (
              <tr
                key={q.id}
                style={i % 2 === 0 ? s.trEven : s.trOdd}
                onMouseEnter={e => e.currentTarget.style.background = '#141c26'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#0d1117' : '#0a0f14'}
              >
                <td style={s.td}>{fmt(q.qso_date)}</td>
                <td style={{ ...s.td, ...s.tdMono }}>
                  {q.time_on ? q.time_on.slice(0, 5) : '—'}
                </td>
                <td style={s.tdCall}>{q.call}</td>
                <td style={s.td}>{fmt(q.band)}</td>
                <td style={s.td}>{fmt(q.mode)}</td>
                <td style={{ ...s.td, ...s.tdMono }}>
                  {fmtRST(q.rst_sent, q.rst_rcvd)}
                </td>
                <td style={s.td}>{fmt(q.name)}</td>
                <td style={s.td}>{fmt(q.qth)}</td>
                <td style={{ ...s.td, ...s.tdTruncate }}>{fmt(q.notes)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  {confirmDelete === q.id ? (
                    <span style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        onClick={() => handleDelete(q.id)}
                        style={{ ...s.delBtn, color: '#ef4444', borderColor: '#ef4444' }}
                        onMouseEnter={e => {
                          e.target.style.background = '#ef4444';
                          e.target.style.color = '#080c0e';
                        }}
                        onMouseLeave={e => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#ef4444';
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={s.delBtn}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(q.id)}
                      style={s.delBtn}
                      onMouseEnter={e => {
                        e.target.style.color = '#ef4444';
                        e.target.style.borderColor = '#ef4444';
                      }}
                      onMouseLeave={e => {
                        e.target.style.color = '#2a3f52';
                        e.target.style.borderColor = '#1e2d3d';
                      }}
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
