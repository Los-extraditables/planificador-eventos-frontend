import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import OnboardingTour from '../components/OnboardingTour';
import { useAuth } from '../context/AuthContext';

// Título de la pestaña según la ruta.
const TITULOS = [
  ['/hoy', 'Hoy'],
  ['/crear', 'Crear evento'],
  ['/progreso', 'Progreso de eventos'],
  ['/detalle-evento', 'Detalle del evento'],
  ['/evento', 'Detalle del evento']
];

const tituloDeRuta = (pathname) => {
  const coincide = TITULOS.find(
    ([ruta]) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );

  return coincide ? `${coincide[1]} – Evora` : 'Evora';
};

export const MainLayout = () => {
  const { pathname } = useLocation();
  const { user, loading, marcarTourVisto } = useAuth();
  const mainRef = useRef(null);
  const primeraCarga = useRef(true);

  // El tour sale solo cuando el perfil ya cargó y el backend dice explícitamente false.
  const cuentaNueva = !loading && user?.tour_visto === false;

  const alTerminarTour = (_motivo, { manual } = {}) => {
    if (manual) return; // repetido desde "Ayuda": no toca el backend
    marcarTourVisto();
  };

  // Actualiza el título y mueve el foco al contenido al cambiar de ruta.
  useEffect(() => {
    document.title = tituloDeRuta(pathname);

    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }

    // Durante el tour, el foco lo maneja la tarjeta del recorrido.
    if (document.body.classList.contains('evora-tour-ocupado')) return;

    mainRef.current?.focus();
  }, [pathname]);

  const saltarAlContenido = (e) => {
    e.preventDefault();
    mainRef.current?.focus();
    mainRef.current?.scrollIntoView();
  };

  return (
    <>
      {/* Acceso directo al contenido principal para teclado y lectores de pantalla */}
      <a
        href="#contenido-principal"
        onClick={saltarAlContenido}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-purple-800 focus:font-semibold focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-purple-700"
      >
        Saltar al contenido
      </a>

      <Navbar />

      {/* Tutorial interactivo: se monta una sola vez en el diseño principal */}
      <OnboardingTour cuentaNueva={cuentaNueva} onTerminar={alTerminarTour} />

      <main
        id="contenido-principal"
        ref={mainRef}
        tabIndex={-1}
        className="focus:outline-none"
      >
        <Outlet />
      </main>
    </>
  );
};

export default MainLayout;