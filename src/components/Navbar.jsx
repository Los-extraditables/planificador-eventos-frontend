import { NavLink } from 'react-router-dom';

const Navbar = () => {
  return (
    <header style={styles.header}>
      {/* Brand / Logo */}
      <div style={styles.brand}>
        <div style={styles.logoIcon}>
          <span style={{ frontSize: '1:1rem' }}>📋</span>
        </div>
        <span style={styles.brandName}>Event Organizer</span>
      </div>

      {/* Navigation links */}
      <nav style={styles.nav}>
        <NavLink
        to="/hoy"
        style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          Hoy
        </NavLink>
        <NavLink
        to="/crear"
        style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink }: styles.link)}
        >
          Crear Evento
        </NavLink>
        <NavLink
        to="/evento/:id"
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
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e5e7eb',
    color: '#1f2937',
    fontFamily: 'sans-serif'
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
    backgroundColor: '#0f172a',
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
    color: '#6b7280',
    fontWeight: '500',
    fontSize: '0.95rem',
    borderBottom: '3px solid transparent',
    padding: '0 0.25rem',
    transition: 'all 0.2s ease'
  },
  activeLink: {
    color: '#0f172a',
    fontWeight: '600',
    borderBottom: '3px solid #0f172a'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center'
  },
  userButton: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
}

export default Navbar;