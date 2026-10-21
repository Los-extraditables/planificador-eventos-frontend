import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  FileText,
  Gauge,
  LayoutGrid,
  LogOut,
  Menu,
  Minus,
  Plus,
  TrendingUp,
  User,
  X
} from 'lucide-react';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';

import logoEvora from '../assets/logoEvora.svg';
import { useAuth } from '../context/AuthContext';
import { useCargaDiaria } from '../context/CargaDiariaContext';
// Ajusta la ruta a donde esté tu archivo OnboardingTour.jsx
import { reiniciarTour } from './OnboardingTour';

// Anillo de foco visible y consistente.
const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2';

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Enlaces con identificadores para el tour interactivo.
const ENLACES = [
  {
    to: '/hoy',
    icono: LayoutGrid,
    texto: 'Hoy',
    id: 'nav-hoy'
  },
  {
    to: '/crear',
    icono: CalendarPlus,
    texto: 'Crear Evento',
    id: 'nav-crear'
  },
  {
    to: '/detalle-evento',
    icono: FileText,
    texto: 'Detalle Evento',
    id: 'nav-detalle'
  },
  {
    to: '/progreso',
    icono: TrendingUp,
    texto: 'Progreso',
    id: 'nav-progreso'
  }
];

// Estilos de los enlaces de navegación.
const claseEnlace = ({ isActive }) =>
  `flex items-center gap-2 px-3.5 py-3 md:py-1.5 rounded-xl text-sm font-semibold transition-all ${FOCO} ${
    isActive
      ? 'bg-purple-100/70 text-purple-900 shadow-2xs underline underline-offset-4 decoration-2'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
  }`;

const Navbar = () => {
  const navigate = useNavigate();

  const { user, logout, userDisplayName } = useAuth();

  const {
    limiteDiarioMax,
    incrementarLimite,
    decrementarLimite
  } = useCargaDiaria();

  const [mostrarModalLogout, setMostrarModalLogout] = useState(false);
  const [mostrarPopoverCarga, setMostrarPopoverCarga] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const headerRef = useRef(null);
  const popoverRef = useRef(null);
  const botonUsuarioRef = useRef(null);
  const botonMenuRef = useRef(null);
  const dialogoRef = useRef(null);
  const botonSalirRef = useRef(null);

  // Cierra el popover al hacer clic fuera o cuando el foco sale de él.
  useEffect(() => {
    if (!mostrarPopoverCarga) return undefined;

    const fuera = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
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

  // Cierra el menú móvil al hacer clic fuera o pulsar Escape.
  useEffect(() => {
    if (!menuAbierto) return undefined;

    const fuera = (event) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target)
      ) {
        setMenuAbierto(false);
      }
    };

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuAbierto(false);
        botonMenuRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', fuera);
    document.addEventListener('touchstart', fuera);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('touchstart', fuera);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuAbierto]);

  // Cierra el menú desplegable al pasar a tablet o escritorio.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');

    const alCambiar = (event) => {
      if (event.matches) {
        setMenuAbierto(false);
      }
    };

    mq.addEventListener('change', alCambiar);

    return () => {
      mq.removeEventListener('change', alCambiar);
    };
  }, []);

  // Cierra el popover con Escape y devuelve el foco al botón.
  const onKeyDownPopover = (event) => {
    if (event.key === 'Escape' && mostrarPopoverCarga) {
      event.stopPropagation();
      setMostrarPopoverCarga(false);
      botonUsuarioRef.current?.focus();
    }
  };

  // Obtiene el nombre del usuario desde las fuentes disponibles.
  const obtenerNombreMostrado = () => {
    if (user) {
      const firstName = user.first_name || user.firstName || '';
      const lastName = user.last_name || user.lastName || '';

      const fullName = `${firstName} ${lastName}`.trim();

      if (fullName) return fullName;

      if (
        user.first_name &&
        user.first_name.trim() !== ''
      ) {
        return user.first_name;
      }

      if (user.fullName && !user.fullName.includes('@')) {
        return user.fullName;
      }

      if (user.name && !user.name.includes('@')) {
        return user.name;
      }

      if (user.username && !user.username.includes('@')) {
        return user.username;
      }

      if (user.email) {
        return user.email.split('@')[0];
      }
    }

    // Respaldo leyendo el usuario de localStorage.
    try {
      const localUserStr = localStorage.getItem('user');

      if (localUserStr) {
        const localUser = JSON.parse(localUserStr);

        const name =
          localUser.first_name ||
          localUser.username ||
          localUser.email;

        if (name) {
          return name.includes('@')
            ? name.split('@')[0]
            : name;
        }
      }
    } catch (error) {
      console.error(
        'Error al leer usuario de localStorage:',
        error
      );
    }

    // Respaldo adicional desde el contexto de autenticación.
    if (userDisplayName) {
      return userDisplayName.includes('@')
        ? userDisplayName.split('@')[0]
        : userDisplayName;
    }

    return 'Usuario';
  };

  const nombre = obtenerNombreMostrado();

  const solicitarLogout = () => {
    setMenuAbierto(false);
    setMostrarPopoverCarga(false);
    setMostrarModalLogout(true);
  };

  const confirmarLogout = () => {
    setMostrarModalLogout(false);
    logout();
    navigate('/login');
  };

  // Lanza el recorrido de bienvenida cuando el usuario quiera.
  const verRecorrido = () => {
    setMenuAbierto(false);
    setMostrarPopoverCarga(false);
    reiniciarTour();
  };

  const alternarMenu = () => {
    setMostrarPopoverCarga(false);
    setMenuAbierto((valor) => !valor);
  };

  const alternarPopover = () => {
    setMenuAbierto(false);
    setMostrarPopoverCarga((valor) => !valor);
  };

  return (
    <>
      <header
        ref={headerRef}
        className="bg-white border-b border-slate-200/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-2 text-slate-800 font-sans shadow-xs relative z-40"
      >
        {/* Marca y navegación principal */}
        <div className="flex items-center gap-2 lg:gap-6 min-w-0">
          <div className="flex items-center gap-3 md:pr-6 md:border-r border-slate-200/90 h-8 flex-shrink-0">
            <img
              src={logoEvora}
              alt=""
              className="w-8 h-8 rounded-xl object-cover shadow-xs flex-shrink-0"
            />

            <span className="font-extrabold text-lg text-slate-900 tracking-tight flex-shrink-0">
              Evora
            </span>
          </div>

          {/* Navegación responsive */}
          <nav
            id="menu-principal"
            aria-label="Principal"
            className={`${
              menuAbierto ? 'flex' : 'hidden'
            } md:flex flex-col md:flex-row md:items-center gap-1 lg:gap-2
              absolute md:static top-full left-0 right-0 md:inset-auto
              bg-white md:bg-transparent border-b md:border-0 border-slate-200/80 shadow-lg md:shadow-none
              p-3 md:p-0 z-50`}
          >
            {ENLACES.map(
              ({ to, icono: Icono, texto, id }) => (
                <NavLink
                  key={to}
                  to={to}
                  id={id}
                  title={texto}
                  onClick={() => setMenuAbierto(false)}
                  className={claseEnlace}
                >
                  <Icono
                    className="w-5 h-5 md:w-4 md:h-4 flex-shrink-0"
                    aria-hidden="true"
                  />

                  <span className="md:sr-only lg:not-sr-only whitespace-nowrap">
                    {texto}
                  </span>
                </NavLink>
              )
            )}
          </nav>
        </div>

        {/* Usuario, carga diaria, ayuda, salir y menú móvil */}
        <div
          className="flex items-center gap-1 sm:gap-3 lg:gap-4 relative min-w-0"
          ref={popoverRef}
          onKeyDown={onKeyDownPopover}
        >
          {/* Botón de usuario */}
          <button
            ref={botonUsuarioRef}
            type="button"
            onClick={alternarPopover}
            aria-expanded={mostrarPopoverCarga}
            aria-controls="popover-carga"
            aria-label={`${nombre}: ajustar carga diaria`}
            className={`flex items-center gap-2 text-sm font-semibold px-2 sm:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-0 rounded-xl transition-all cursor-pointer min-w-0 ${FOCO} ${
              mostrarPopoverCarga
                ? 'bg-purple-100/80 text-purple-950 shadow-2xs'
                : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-purple-200/70 text-purple-900 flex items-center justify-center flex-shrink-0">
              <User
                className="w-3.5 h-3.5"
                aria-hidden="true"
              />
            </div>

            <span className="hidden sm:inline truncate max-w-[7rem] md:max-w-[9rem] lg:max-w-[14rem]">
              {nombre}
            </span>

            {mostrarPopoverCarga ? (
              <ChevronUp
                className="w-4 h-4 text-purple-900 flex-shrink-0"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="w-4 h-4 text-slate-600 flex-shrink-0"
                aria-hidden="true"
              />
            )}
          </button>

          {/* Popover de carga diaria */}
          {mostrarPopoverCarga && (
            <div
              id="popover-carga"
              role="region"
              aria-labelledby="popover-carga-titulo"
              className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-slate-50 border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4 z-50 transition-all animate-in fade-in zoom-in-95 motion-reduce:animate-none"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <Gauge
                    className="w-5 h-5"
                    aria-hidden="true"
                  />
                </div>

                <div className="text-left min-w-0">
                  <p
                    id="popover-carga-titulo"
                    className="font-bold text-slate-900 text-sm"
                  >
                    Carga diaria
                  </p>

                  <p className="text-xs text-slate-600 leading-snug">
                    Define cuántas horas puedes dedicar a tus
                    subtareas cada día.
                  </p>
                </div>
              </div>

              {/* Selector de horas */}
              <div className="bg-slate-100/80 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={decrementarLimite}
                  className={`w-11 h-11 md:w-10 md:h-10 rounded-xl bg-white border border-slate-300 text-purple-700 hover:bg-slate-50 font-bold flex items-center justify-center shadow-2xs transition cursor-pointer ${FOCO}`}
                  aria-label="Reducir horas por día"
                >
                  <Minus
                    className="w-4 h-4"
                    aria-hidden="true"
                  />
                </button>

                <div
                  className="text-center"
                  role="status"
                  aria-live="polite"
                >
                  <span className="block text-base font-extrabold text-slate-900">
                    <span aria-hidden="true">
                      {limiteDiarioMax.toFixed(1)} h
                    </span>

                    <span className="sr-only">
                      {limiteDiarioMax.toFixed(1)} horas por día
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-xs text-slate-600 font-medium"
                  >
                    por día
                  </span>
                </div>

                <button
                  type="button"
                  onClick={incrementarLimite}
                  className={`w-11 h-11 md:w-10 md:h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center justify-center shadow-xs transition cursor-pointer ${FOCO}`}
                  aria-label="Aumentar horas por día"
                >
                  <Plus
                    className="w-4 h-4"
                    aria-hidden="true"
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 text-center leading-tight">
                El cambio se refleja automáticamente en la vista Hoy.
              </p>
            </div>
          )}

          {/* Botón recorrido de bienvenida */}
          <button
            type="button"
            onClick={verRecorrido}
            aria-label="Ver recorrido de bienvenida"
            title="Ver recorrido de bienvenida"
            className={`flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-purple-800 transition-colors p-2.5 md:p-1.5 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-lg cursor-pointer ${FOCO}`}
          >
            <CircleHelp
              className="w-5 h-5 sm:w-4 sm:h-4"
              aria-hidden="true"
            />

            <span className="hidden lg:inline">Ayuda</span>
          </button>

          {/* Botón salir */}
          <button
            ref={botonSalirRef}
            type="button"
            onClick={solicitarLogout}
            aria-haspopup="dialog"
            aria-label="Salir"
            className={`flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-red-700 transition-colors p-2.5 md:p-1.5 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-lg cursor-pointer ${FOCO}`}
          >
            <LogOut
              className="w-5 h-5 sm:w-4 sm:h-4"
              aria-hidden="true"
            />

            <span className="hidden sm:inline">Salir</span>
          </button>

          {/* Menú móvil */}
          <button
            ref={botonMenuRef}
            type="button"
            onClick={alternarMenu}
            aria-expanded={menuAbierto}
            aria-controls="menu-principal"
            aria-label={
              menuAbierto ? 'Cerrar menú' : 'Abrir menú'
            }
            className={`md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer ${FOCO}`}
          >
            {menuAbierto ? (
              <X
                className="w-6 h-6"
                aria-hidden="true"
              />
            ) : (
              <Menu
                className="w-6 h-6"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </header>

      {/* Modal de cierre de sesión */}
      {mostrarModalLogout &&
        createPortal(
          <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs overflow-y-auto overscroll-contain">
            <div
              className="flex min-h-full items-center justify-center p-4"
              style={{
                paddingTop: 'max(1rem, env(safe-area-inset-top))',
                paddingBottom:
                  'max(1rem, env(safe-area-inset-bottom))'
              }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setMostrarModalLogout(false);
                }
              }}
            >
              <div
                ref={dialogoRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="titulo-logout"
                aria-describedby="desc-logout"
                className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-left"
              >
                <h2
                  id="titulo-logout"
                  className="text-lg font-bold text-slate-900"
                >
                  Cerrar Sesión
                </h2>

                <p
                  id="desc-logout"
                  className="text-sm text-slate-600 break-words"
                >
                  ¿Estás seguro de que deseas salir de la plataforma,{' '}
                  <strong>{nombre}</strong>?
                </p>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    data-autofocus
                    onClick={() => setMostrarModalLogout(false)}
                    className={`px-4 py-2 min-h-[44px] sm:min-h-0 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer ${FOCO}`}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={confirmarLogout}
                    className={`px-4 py-2 min-h-[44px] sm:min-h-0 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition cursor-pointer ${FOCO}`}
                  >
                    Sí, salir
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Navbar;