import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import OnboardingTour from '../components/OnboardingTour';

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
  const mainRef = useRef(null);
  const primeraCarga = useRef(true);

  // Actualiza el título y mueve el foco al contenido al cambiar de ruta.
  useEffect(() => {
    document.title = tituloDeRuta(pathname);

    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }

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
      <OnboardingTour />

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