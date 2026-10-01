import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Navbar = () => {
  const navigate = useNavigate();
  const usuario = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header style={styles.header}>
      {/* Brand / Logo */}
      <div style={styles.brand}>
        <div style={styles.logoIcon}>
          <span style={{ fontSize: '1.1rem' }}>📋</span>
        </div>
        <span style={styles.brandName}>Event Organizer</span>
      </div>

      {/* Links de Navegación */}
      <nav style={styles.nav}>
        <NavLink
          to="/hoy"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          Hoy
        </NavLink>
        <NavLink
          to="/crear"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          Crear Evento
        </NavLink>
        <NavLink
          to="/detalle-evento"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          Detalle Evento
        </NavLink>
        <NavLink
          to="/progreso"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          Progreso
        </NavLink>
      </nav>

      {/* Usuario y Cierre de Sesión */}
      <div style={styles.userSection}>
        <span style={styles.userName}>{usuario?.username || 'Usuario'}</span>
        <button 
          onClick={handleLogout} 
          style={styles.logoutButton} 
          title="Cerrar Sesión"
          aria-label="Cerrar sesión"
        >
          🚪 Salir
        </button>
      </div>
    </header>
  );
};

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    height: '64px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    color: '#0f172a',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff'
  },
  brandName: {
    fontWeight: '700',
    fontSize: '1.1rem',
    color: '#0f172a'
  },
  nav: {
    display: 'flex',
    gap: '2rem',
    height: '100%'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: '#64748b',
    fontWeight: '500',
    fontSize: '0.95rem',
    borderBottom: '3px solid transparent',
    padding: '0 0.25rem',
    transition: 'all 0.2s ease'
  },
  activeLink: {
    color: '#2563eb',
    fontWeight: '600',
    borderBottom: '3px solid #2563eb'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#334155'
  },
  logoutButton: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '0.85rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer'
  }
};

export default Navbar;