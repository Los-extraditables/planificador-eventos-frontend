import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

// Título de la pestaña según la ruta: es lo primero que anuncia un lector de pantalla al navegar.
const TITULOS = [
  ['/hoy', 'Hoy'],
  ['/crear', 'Crear evento'],
  ['/progreso', 'Progreso de eventos'],
  ['/detalle-evento', 'Detalle del evento'],
  ['/evento', 'Detalle del evento']
];

const tituloDeRuta = (pathname) => {
  const coincide = TITULOS.find(([ruta]) => pathname === ruta || pathname.startsWith(`${ruta}/`));
  return coincide ? `${coincide[1]} – Evora` : 'Evora';
};

export const MainLayout = () => {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const primeraCarga = useRef(true);

  // Al cambiar de ruta: actualiza el título y mueve el foco al contenido
  // (en una SPA el navegador no lo hace solo, y el usuario de teclado quedaría en el menú).
  useEffect(() => {
    document.title = tituloDeRuta(pathname);
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  const saltarAlContenido = (e) => {
    e.preventDefault(); // evita que el router interprete el # como navegación
    mainRef.current?.focus();
    mainRef.current?.scrollIntoView();
  };

  return (
    <>
      {/* Primer elemento enfocable: solo se ve al recibir foco con Tab */}
      <a
        href="#contenido-principal"
        onClick={saltarAlContenido}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-purple-800 focus:font-semibold focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-purple-700"
      >
        Saltar al contenido
      </a>

      <Navbar />

      <main id="contenido-principal" ref={mainRef} tabIndex={-1} className="focus:outline-none">
        <Outlet />
      </main>
    </>
  );
};

export default MainLayout;