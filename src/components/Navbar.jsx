import { CalendarPlus, ChevronDown, ChevronUp, FileText, Gauge, LayoutGrid, LogOut, Minus, Plus, TrendingUp, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logoEvora from '../assets/logoEvora.svg';
import { useAuth } from '../context/AuthContext';
import { useCargaDiaria } from '../context/CargaDiariaContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, userDisplayName } = useAuth();
  const { limiteDiarioMax, incrementarLimite, decrementarLimite } = useCargaDiaria();
  
  const [mostrarModalLogout, setMostrarModalLogout] = useState(false);
  const [mostrarPopoverCarga, setMostrarPopoverCarga] = useState(false);
  const popoverRef = useRef(null);

  // Cerrar popover al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setMostrarPopoverCarga(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const obtenerNombreMostrado = () => {
    // 1. Intentamos leer desde el estado global 'user'
    if (user) {
      const firstName = user.first_name || user.firstName || '';
      const lastName = user.last_name || user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) return fullName;
      if (user.first_name && user.first_name.trim() !== '') return user.first_name;
      if (user.fullName && !user.fullName.includes('@')) return user.fullName;
      if (user.name && !user.name.includes('@')) return user.name;
      if (user.username && !user.username.includes('@')) return user.username;
      if (user.email) return user.email.split('@')[0];
    }

    // 2. Respaldo de seguridad leyendo directamente de localStorage ('user')
    try {
      const localUserStr = localStorage.getItem('user');
      if (localUserStr) {
        const localUser = JSON.parse(localUserStr);
        const name = localUser.first_name || localUser.username || localUser.email;
        if (name) {
          return name.includes('@') ? name.split('@')[0] : name;
        }
      }
    } catch (e) {
      console.error('Error al leer usuario de localStorage:', e);
    }

    // 3. Respaldo adicional con userDisplayName
    if (userDisplayName) {
      return userDisplayName.includes('@') ? userDisplayName.split('@')[0] : userDisplayName;
    }

    return 'Usuario';
  };

  const solicitarLogout = () => setMostrarModalLogout(true);
  const confirmarLogout = () => {
    setMostrarModalLogout(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200/80 px-6 h-16 flex items-center justify-between text-slate-800 font-sans shadow-xs relative z-40">
        {/* Lado Izquierdo: Brand + Separador + Navegación */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-200/90 h-8 flex-shrink-0">
            <img src={logoEvora} alt="Evora Logo" className="w-8 h-8 rounded-xl object-cover shadow-xs flex-shrink-0" />
            <span className="font-extrabold text-lg text-slate-900 tracking-tight flex-shrink-0">Evora</span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/hoy" className={({ isActive }) => `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${isActive ? 'bg-purple-100/70 text-purple-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>
              <LayoutGrid className="w-4 h-4" /> <span>Hoy</span>
            </NavLink>
            <NavLink to="/crear" className={({ isActive }) => `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${isActive ? 'bg-purple-100/70 text-purple-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>
              <CalendarPlus className="w-4 h-4" /> <span>Crear Evento</span>
            </NavLink>
            <NavLink to="/detalle-evento" className={({ isActive }) => `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${isActive ? 'bg-purple-100/70 text-purple-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>
              <FileText className="w-4 h-4" /> <span>Detalle Evento</span>
            </NavLink>
            <NavLink to="/progreso" className={({ isActive }) => `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${isActive ? 'bg-purple-100/70 text-purple-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}>
              <TrendingUp className="w-4 h-4" /> <span>Progreso</span>
            </NavLink>
          </nav>
        </div>

        {/* Lado Derecho: Menú Usuario y Carga Diaria */}
        <div className="flex items-center gap-4 relative" ref={popoverRef}>
          {/* Botón desplegable Usuario */}
          <button
            onClick={() => setMostrarPopoverCarga(!mostrarPopoverCarga)}
            className={`flex items-center gap-2 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              mostrarPopoverCarga
                ? 'bg-purple-100/80 text-purple-950 shadow-2xs'
                : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-purple-200/70 text-purple-900 flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
            <span>{obtenerNombreMostrado()}</span>
            {mostrarPopoverCarga ? (
              <ChevronUp className="w-4 h-4 text-purple-900" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* POPOVER DE CARGA DIARIA  */}
          {mostrarPopoverCarga && (
            <div className="absolute right-16 top-12 w-80 bg-slate-50 border border-slate-200/90 rounded-3xl p-5 shadow-xl space-y-4 z-50 transition-all animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-5 h-5" />
                </div>
                <div className='text-left'>
                  <h4 className="font-bold text-slate-900 text-sm">Carga diaria</h4>
                  <p className="text-xs text-slate-500 leading-snug">
                    Define cuántas horas puedes dedicar a tus subtareas cada día.
                  </p>
                </div>
              </div>

              {/* Selector de Horas */}
              <div className="bg-slate-100/80 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
                <button
                  onClick={decrementarLimite}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 text-purple-700 hover:bg-slate-50 font-bold flex items-center justify-center shadow-2xs transition cursor-pointer"
                  title="Reducir horas"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <span className="block text-base font-extrabold text-slate-900">
                    {limiteDiarioMax.toFixed(1)} h
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">por día</span>
                </div>

                <button
                  onClick={incrementarLimite}
                  className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center shadow-xs transition cursor-pointer"
                  title="Aumentar horas"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-tight">
                El cambio se refleja automáticamente en la vista Hoy.
              </p>
            </div>
          )}

          <button
            onClick={solicitarLogout}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Modal Logout (sin cambios) */}
      {mostrarModalLogout && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left">
            <h3 className="text-lg font-bold text-slate-900">Cerrar Sesión</h3>
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas salir de la plataforma, <strong>{obtenerNombreMostrado()}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setMostrarModalLogout(false)} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer">Cancelar</button>
              <button onClick={confirmarLogout} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition cursor-pointer">Sí, salir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;