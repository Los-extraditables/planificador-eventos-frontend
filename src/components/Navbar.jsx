import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, userDisplayName } = useAuth();
  const [mostrarModalLogout, setMostrarModalLogout] = useState(false);

  // Obtener exclusivamente el nombre de usuario o nombre de pila (NUNCA el correo)
  const obtenerNombreMostrado = () => {
    if (user) {
      if (user.first_name && user.first_name.trim() !== '') {
        return user.first_name;
      }
      if (user.username && !user.username.includes('@')) {
        return user.username;
      }
      if (user.name && !user.name.includes('@')) {
        return user.name;
      }
      if (user.fullName && !user.fullName.includes('@')) {
        return user.fullName.split(' ')[0];
      }
    }

    if (userDisplayName && !userDisplayName.includes('@')) {
      return userDisplayName;
    }

    return 'Usuario';
  };

  const solicitarLogout = () => {
    setMostrarModalLogout(true);
  };

  const confirmarLogout = () => {
    setMostrarModalLogout(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <header style={styles.header}>
        {/* Brand / Logo (Evora) */}
        <div style={styles.brand}>
          <div style={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  ...
                </svg>
            
          </div>
          <span style={styles.brandName}>Evora</span>
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
          <div style={styles.userBadge}>
            <span style={styles.userAvatar}>👤</span>
            <span style={styles.userName}>{obtenerNombreMostrado()}</span>
          </div>

          <button 
            onClick={solicitarLogout} 
            style={styles.logoutButton} 
            title="Cerrar Sesión"
            aria-label="Cerrar sesión"
          >
            🚪 Salir
          </button>
        </div>
      </header>

      {/* MODAL DE CONFIRMACIÓN AL CERRAR SESIÓN */}
      {mostrarModalLogout && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>Cerrar Sesión</h3>
            <p style={styles.modalText}>
              ¿Estás seguro de que deseas salir de la plataforma, <strong>{obtenerNombreMostrado()}</strong>?
            </p>
            <div style={styles.modalActions}>
              <button 
                onClick={() => setMostrarModalLogout(false)} 
                style={styles.cancelBtn}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarLogout} 
                style={styles.confirmBtn}
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    height: '64px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    color: '#0f172a',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  logoIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #2E1065 0%, #0284C7 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  brandName: {
    fontWeight: '800',
    fontSize: '1.25rem',
    color: '#0F172A',
    letterSpacing: '-0.025em'
  },
  nav: {
    display: 'flex',
    gap: '1.5rem',
    height: '100%',
    alignItems: 'center'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: '#64748b',
    fontWeight: '500',
    fontSize: '0.9rem',
    borderBottom: '3px solid transparent',
    padding: '0.5rem 0.25rem',
    transition: 'all 0.2s ease'
  },
  activeLink: {
    color: '#3B0764',
    fontWeight: '700',
    borderBottom: '3px solid #3B0764'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#f8fafc',
    padding: '6px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  },
  userAvatar: {
    fontSize: '0.85rem'
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155'
  },
  logoutButton: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '6px 12px',
    fontSize: '0.85rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    textAlign: 'left'
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#0f172a'
  },
  modalText: {
    margin: '0.75rem 0 1.25rem 0',
    fontSize: '0.875rem',
    color: '#475569',
    lineHeight: '1.4'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem'
  },
  cancelBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer'
  },
  confirmBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default Navbar;