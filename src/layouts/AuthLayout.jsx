import { Outlet } from 'react-router-dom';
import logoEvora from '../assets/logoEvora.svg';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 font-sans text-gray-800 p-4 sm:p-6 lg:p-8">
      {/* Contenedor centralizado de autenticación */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 flex flex-col">
        {/* Logo superior centrado */}
        <div className="flex items-center justify-left gap-3 mb-8">
          <div className="flex items-center gap-3 h-8 flex-shrink-0">
            <img 
            src={logoEvora} 
            alt="Evora Logo" 
            className="w-8 h-8 rounded-xl object-cover shadow-xs flex-shrink-0" 
          />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Evora</span>
        </div>

        {/* Contenido dinámico (Login, Registro, ForgotPassword, etc.) */}
        <div className="w-full">
          <Outlet />
        </div>
      </div>

      {/* Footer inferior sutil */}
      <div className="mt-6 text-xs text-gray-400 font-medium">
        Evora · 2026
      </div>
    </div>
  );
};

export default AuthLayout;