import { Outlet } from 'react-router-dom';
import logoEvora from '../assets/logoEvora.svg';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 font-sans text-gray-800 p-4 sm:p-6 lg:p-8">
      {/* Contenedor centralizado de autenticación */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 flex flex-col">
        {/* Logo superior. El texto "Evora" ya nombra la marca, así que la imagen es decorativa (alt vacío) */}
        <header className="flex items-center justify-start gap-3 mb-8">
          <img
            src={logoEvora}
            alt=""
            className="w-8 h-8 rounded-xl object-cover shadow-xs flex-shrink-0"
          />
          <span className="text-xl font-bold text-gray-900 tracking-tight">Evora</span>
        </header>

        {/* Contenido dinámico (Login, Registro, ForgotPassword, etc.).
            <main> es el landmark principal: permite a los lectores de pantalla saltar directo al formulario. */}
        <main id="contenido-principal" className="w-full">
          <Outlet />
        </main>
      </div>

      {/* Footer inferior: gray-600 para cumplir contraste 4.5:1 (gray-400 daba ~2.5:1) */}
      <footer className="mt-6 text-xs text-gray-600 font-medium">
        Evora · 2026
      </footer>
    </div>
  );
};

export default AuthLayout;