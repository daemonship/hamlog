import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QSOForm from '../components/QSOForm';
import { createQSO } from '../api';

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
};

export default function NewQSO() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedCall, setSavedCall] = useState('');

  async function handleSave(payload) {
    setError('');
    setLoading(true);
    try {
      const qso = await createQSO(payload);
      setSavedCall(qso.call);
      // Brief success flash, then go to log
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

  return (
    <div style={s.page}>
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

      <QSOForm
        onSave={handleSave}
        loading={loading}
        error={error}
      />
    </div>
  );
}
