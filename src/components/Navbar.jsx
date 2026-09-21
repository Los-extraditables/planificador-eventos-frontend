import { NavLink } from 'react-router-dom';

const Navbar = () => {
  return (
    <header style={styles.header}>
      {/* Brand / Logo */}
      <div style={styles.brand}>
        <div style={styles.logoIcon}>
          <span style={{ fontSize: '1.2rem' }}>📅</span>
        </div>
        <span style={styles.brandName}>Organizador de Eventos</span>
      </div>

      {/* Navigation links */}
      <nav style={styles.nav}>
        <NavLink
          to="/hoy"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          <span style={styles.linkIcon}>㗊</span>
          Hoy
        </NavLink>
        <NavLink
          to="/crear"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          <span style={styles.linkIcon}>+</span>
          Crear Evento
        </NavLink>
        <NavLink
          to="/evento/1"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          <span style={styles.linkIcon}>📋</span>
          Detalle Evento
        </NavLink>
        <NavLink
          to="/progreso"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          <span style={styles.linkIcon}>📈</span>
          Progreso
        </NavLink>
      </nav>

      {/* User Profile */}
      <div style={styles.userSection}>
        <button style={styles.userButton} aria-label="perfil de usuario">
          👤
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
    borderBottom: '1px solid #e5e7eb',
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
    borderRadius: '10px',
    backgroundColor: '#6366f1',
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
    alignItems: 'center',
    gap: '0.75rem'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: '#475569',
    fontWeight: '500',
    fontSize: '0.95rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease'
  },
  activeLink: {
    color: '#4f46e5',
    backgroundColor: '#eeeffe',
    fontWeight: '600'
  },
  linkIcon: {
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center'
  },
  userButton: {
    background: '#a855f7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1rem'
  }
};

export default Navbar;