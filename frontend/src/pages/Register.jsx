import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api';

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: '#080c0e',
  },
  container: {
    width: '100%',
    maxWidth: '360px',
  },
  header: {
    marginBottom: '28px',
    textAlign: 'center',
  },
  title: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 900,
    fontSize: '2rem',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: '#39d353',
    textShadow: '0 0 20px rgba(57,211,83,0.5)',
    marginBottom: '4px',
  },
  subtitle: {
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    color: '#475569',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  form: {
    background: '#111820',
    border: '1px solid #1e2d3d',
    padding: '24px',
  },
  formHeader: {
    fontFamily: "'Orbitron', monospace",
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#475569',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid #1e2d3d',
    display: 'flex',
    justifyContent: 'space-between',
  },
  fieldGroup: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontFamily: "'Orbitron', monospace",
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#475569',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.85rem',
    color: '#e2e8f0',
    background: '#0d1117',
    border: '1px solid #1e2d3d',
    padding: '8px 10px',
    outline: 'none',
    borderRadius: 0,
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    marginTop: '20px',
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    background: '#1e7a30',
    color: '#39d353',
    border: '1px solid #39d353',
    padding: '10px 20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 120ms ease',
    borderRadius: 0,
  },
  footer: {
    marginTop: '16px',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: '#475569',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderLeft: '3px solid #ef4444',
    color: '#ef4444',
    padding: '8px 12px',
    fontSize: '0.75rem',
    marginBottom: '14px',
    fontFamily: 'monospace',
  },
  success: {
    background: 'rgba(57,211,83,0.08)',
    border: '1px solid #39d353',
    borderLeft: '3px solid #39d353',
    color: '#39d353',
    padding: '8px 12px',
    fontSize: '0.75rem',
    marginBottom: '14px',
    fontFamily: 'monospace',
  },
};

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      setSuccess('Account created. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join('; '));
      } else {
        setError(detail || 'Registration failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyFocus(e) {
    e.target.style.borderColor = '#39d353';
    e.target.style.boxShadow = '0 0 0 2px rgba(57,211,83,0.15)';
    e.target.style.background = '#161e28';
  }
  function handleKeyBlur(e) {
    e.target.style.borderColor = '#1e2d3d';
    e.target.style.boxShadow = 'none';
    e.target.style.background = '#0d1117';
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.title}>HamLog</div>
          <div style={s.subtitle}>New Operator Registration</div>
        </div>

        <form style={s.form} onSubmit={handleSubmit}>
          <div style={s.formHeader}>
            <span>Create Account</span>
            <span style={{ color: '#39d353' }}>█</span>
          </div>

          {error && <div style={s.error}>ERR: {error}</div>}
          {success && <div style={s.success}>OK: {success}</div>}

          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              autoFocus
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input}
              onFocus={handleKeyFocus}
              onBlur={handleKeyBlur}
              placeholder="operator@example.com"
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={s.input}
              onFocus={handleKeyFocus}
              onBlur={handleKeyBlur}
              placeholder="Min. 8 characters"
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={s.input}
              onFocus={handleKeyFocus}
              onBlur={handleKeyBlur}
              placeholder="Repeat password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={s.submitBtn}
            onMouseEnter={e => {
              if (!loading) {
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
              ? <><span style={{ width: 14, height: 14, border: '2px solid #1e2d3d', borderTopColor: '#39d353', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Creating...</>
              : '→ Register'}
          </button>

          <div style={s.footer}>
            Already registered?{' '}
            <Link to="/login" style={{ color: '#39d353' }}>Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
