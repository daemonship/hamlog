import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clearToken } from '../auth';

const navStyles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    height: '44px',
    background: '#0d1117',
    borderBottom: '1px solid #1e2d3d',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    gap: '0',
  },
  brand: {
    fontFamily: "'Orbitron', monospace",
    fontWeight: 900,
    fontSize: '0.95rem',
    letterSpacing: '0.2em',
    color: '#39d353',
    textDecoration: 'none',
    textShadow: '0 0 8px rgba(57,211,83,0.4)',
    marginRight: '32px',
    textTransform: 'uppercase',
  },
  separator: {
    color: '#1e2d3d',
    margin: '0 4px',
    fontFamily: 'monospace',
  },
  links: {
    display: 'flex',
    gap: '0',
    flex: 1,
  },
  link: (active) => ({
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: active ? '#39d353' : '#475569',
    textDecoration: 'none',
    padding: '0 14px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: active ? '2px solid #39d353' : '2px solid transparent',
    transition: 'all 120ms ease',
  }),
  logoutBtn: {
    marginLeft: 'auto',
    fontFamily: "'Orbitron', monospace",
    fontWeight: 700,
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#475569',
    background: 'transparent',
    border: '1px solid #1e2d3d',
    padding: '5px 12px',
    cursor: 'pointer',
    transition: 'all 120ms ease',
  },
  status: {
    fontSize: '0.6rem',
    color: '#39d353',
    fontFamily: 'monospace',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  dot: {
    width: '6px',
    height: '6px',
    background: '#39d353',
    borderRadius: '50%',
    boxShadow: '0 0 6px rgba(57,211,83,0.8)',
    animation: 'blink 2s step-end infinite',
  },
};

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  const isLog = location.pathname === '/log';
  const isNew = location.pathname === '/log/new';

  return (
    <nav style={navStyles.nav}>
      <Link to="/log" style={navStyles.brand}>HamLog</Link>
      <span style={navStyles.separator}>│</span>
      <div style={navStyles.links}>
        <Link to="/log" style={navStyles.link(isLog)}>Log</Link>
        <Link to="/log/new" style={navStyles.link(isNew)}>New Contact</Link>
      </div>
      <div style={navStyles.status}>
        <span style={navStyles.dot} />
        <span>QRV</span>
      </div>
      <button
        style={navStyles.logoutBtn}
        onClick={handleLogout}
        onMouseEnter={e => { e.target.style.color = '#ef4444'; e.target.style.borderColor = '#ef4444'; }}
        onMouseLeave={e => { e.target.style.color = '#475569'; e.target.style.borderColor = '#1e2d3d'; }}
      >
        De-Auth
      </button>
    </nav>
  );
}
