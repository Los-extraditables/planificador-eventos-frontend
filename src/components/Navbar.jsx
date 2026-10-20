import { CalendarPlus, ChevronDown, ChevronUp, FileText, Gauge, LayoutGrid, LogOut, Minus, Plus, TrendingUp, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logoEvora from '../assets/logoEvora.svg';
import { useAuth } from '../context/AuthContext';
import { useCargaDiaria } from '../context/CargaDiariaContext';

// Anillo de foco visible y consistente (contraste >= 3:1)
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2';

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ENLACES = [
  { to: '/hoy', icono: LayoutGrid, texto: 'Hoy' },
  { to: '/crear', icono: CalendarPlus, texto: 'Crear Evento' },
  { to: '/detalle-evento', icono: FileText, texto: 'Detalle Evento' },
  { to: '/progreso', icono: TrendingUp, texto: 'Progreso' }
];

// Enlace activo: además del color de fondo se subraya, para no depender solo del color (WCAG 1.4.1).
// NavLink añade aria-current="page" automáticamente al enlace activo.
const claseEnlace = ({ isActive }) =>
  `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${FOCO} ${
    isActive
      ? 'bg-purple-100/70 text-purple-900 shadow-2xs underline underline-offset-4 decoration-2'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
  }`;

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, userDisplayName } = useAuth();
  const { limiteDiarioMax, incrementarLimite, decrementarLimite } = useCargaDiaria();

  const [mostrarModalLogout, setMostrarModalLogout] = useState(false);
  const [mostrarPopoverCarga, setMostrarPopoverCarga] = useState(false);
  const popoverRef = useRef(null);
  const botonUsuarioRef = useRef(null);
  const dialogoRef = useRef(null);
  const botonSalirRef = useRef(null);

  // Cierra el popover al hacer clic fuera o cuando el foco sale de él
  useEffect(() => {
    if (!mostrarPopoverCarga) return undefined;
    const fuera = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setMostrarPopoverCarga(false);
      }
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('focusin', fuera);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('focusin', fuera);
    };
  }, [mostrarPopoverCarga]);

  // Esc cierra el popover y devuelve el foco al botón de usuario
  const onKeyDownPopover = (e) => {
    if (e.key === 'Escape' && mostrarPopoverCarga) {
      e.stopPropagation();
      setMostrarPopoverCarga(false);
      botonUsuarioRef.current?.focus();
    }
  };

  // Diálogo de cierre de sesión: foco inicial, Esc, Tab atrapado y foco devuelto al abrir/cerrar
  useEffect(() => {
    if (!mostrarModalLogout) return undefined;
    const cont = dialogoRef.current;
    cont?.querySelector('[data-autofocus]')?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMostrarModalLogout(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const enfocables = cont?.querySelectorAll(SELECTOR_FOCO);
      if (!enfocables || enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const boton = botonSalirRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      boton?.focus();
    };
  }, [mostrarModalLogout]);

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

  const nombre = obtenerNombreMostrado();

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
            {/* El texto "Evora" ya nombra la marca: la imagen es decorativa */}
            <img src={logoEvora} alt="" className="w-8 h-8 rounded-xl object-cover shadow-xs flex-shrink-0" />
            <span className="font-extrabold text-lg text-slate-900 tracking-tight flex-shrink-0">Evora</span>
          </div>

          <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
            {ENLACES.map(({ to, icono: Icono, texto }) => (
              <NavLink key={to} to={to} className={claseEnlace}>
                <Icono className="w-4 h-4" aria-hidden="true" /> <span>{texto}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Lado Derecho: Menú Usuario y Carga Diaria */}
        <div className="flex items-center gap-4 relative" ref={popoverRef} onKeyDown={onKeyDownPopover}>
          {/* Botón desplegable Usuario */}
          <button
            ref={botonUsuarioRef}
            type="button"
            onClick={() => setMostrarPopoverCarga(!mostrarPopoverCarga)}
            aria-expanded={mostrarPopoverCarga}
            aria-controls="popover-carga"
            aria-label={`${nombre}: ajustar carga diaria`}
            className={`flex items-center gap-2 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${FOCO} ${
              mostrarPopoverCarga
                ? 'bg-purple-100/80 text-purple-950 shadow-2xs'
                : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-purple-200/70 text-purple-900 flex items-center justify-center">
              <User className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <span>{nombre}</span>
            {mostrarPopoverCarga ? (
              <ChevronUp className="w-4 h-4 text-purple-900" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" aria-hidden="true" />
            )}
          </button>

          {/* POPOVER DE CARGA DIARIA */}
          {mostrarPopoverCarga && (
            <div
              id="popover-carga"
              role="region"
              aria-labelledby="popover-carga-titulo"
              className="absolute right-16 top-12 w-80 bg-slate-50 border border-slate-200/90 rounded-3xl p-5 shadow-xl space-y-4 z-50 transition-all animate-in fade-in zoom-in-95 motion-reduce:animate-none"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p id="popover-carga-titulo" className="font-bold text-slate-900 text-sm">Carga diaria</p>
                  <p className="text-xs text-slate-600 leading-snug">
                    Define cuántas horas puedes dedicar a tus subtareas cada día.
                  </p>
                </div>
              </div>

              {/* Selector de Horas */}
              <div className="bg-slate-100/80 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={decrementarLimite}
                  className={`w-10 h-10 rounded-xl bg-white border border-slate-300 text-purple-700 hover:bg-slate-50 font-bold flex items-center justify-center shadow-2xs transition cursor-pointer ${FOCO}`}
                  aria-label="Reducir horas por día"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>

                {/* Se anuncia el nuevo valor cada vez que cambia */}
                <div className="text-center" role="status" aria-live="polite">
                  <span className="block text-base font-extrabold text-slate-900">
                    <span aria-hidden="true">{limiteDiarioMax.toFixed(1)} h</span>
                    <span className="sr-only">{limiteDiarioMax.toFixed(1)} horas por día</span>
                  </span>
                  <span aria-hidden="true" className="text-xs text-slate-600 font-medium">por día</span>
                </div>

                <button
                  type="button"
                  onClick={incrementarLimite}
                  className={`w-10 h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center justify-center shadow-xs transition cursor-pointer ${FOCO}`}
                  aria-label="Aumentar horas por día"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <p className="text-xs text-slate-600 text-center leading-tight">
                El cambio se refleja automáticamente en la vista Hoy.
              </p>
            </div>
          )}

          <button
            ref={botonSalirRef}
            type="button"
            onClick={solicitarLogout}
            aria-haspopup="dialog"
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-red-700 transition-colors p-1.5 rounded-lg cursor-pointer ${FOCO}`}
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Modal Logout */}
      {mostrarModalLogout && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setMostrarModalLogout(false)}
        >
          <div
            ref={dialogoRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-logout"
            aria-describedby="desc-logout"
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left"
          >
            <h2 id="titulo-logout" className="text-lg font-bold text-slate-900">Cerrar Sesión</h2>
            <p id="desc-logout" className="text-sm text-slate-600">
              ¿Estás seguro de que deseas salir de la plataforma, <strong>{nombre}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                data-autofocus
                onClick={() => setMostrarModalLogout(false)}
                className={`px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer ${FOCO}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarLogout}
                className={`px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition cursor-pointer ${FOCO}`}
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

export default Navbar;