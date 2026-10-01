import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-gray-800">
      {/* SECCIÓN IZQUIERDA: Formulario (Alineado a la izquierda) */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white overflow-y-auto">
        {/* Logo superior */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-cyan-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            <span className="text-xl">≡</span>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Evora</span>
        </div>

        {/* Contenido dinámico (Login, Registro, ForgotPassword) */}
        <div className="w-full max-w-md mx-0 my-auto py-4">
          <Outlet />
        </div>

        {/* Footer izquierdo opcional/espacio */}
        <div className="pt-6 text-xs text-gray-400">
          {/* Espacio reservado para mantener la estructura vertical */}
        </div>
      </div>

      {/* SECCIÓN DERECHA: Banner Morado Evora */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#2D0B5A] relative flex-col items-center justify-between p-12 overflow-hidden select-none">
        {/* Fondo decorativo con gradiente suave */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3B0A64] via-[#2A084E] to-[#1E053A] z-0" />

        {/* Gráficos / Ilustración simulada de tarjetas */}
        <div className="relative z-10 w-full max-w-md my-auto flex flex-col items-center text-center">
          {/* Replicación visual de las tarjetas del Figma */}
          <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl mb-10 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <div className="h-2 w-24 bg-white/30 rounded"></div>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-medium">OCT 15</span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-2.5 w-full bg-white/20 rounded"></div>
              <div className="h-2.5 w-3/4 bg-white/20 rounded"></div>
            </div>
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-purple-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-pink-400 inline-block"></span>
            </div>
          </div>

          {/* Texto principal del banner */}
          <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
            Crea, organiza y celebra eventos inolvidables.
          </h2>
          <p className="text-sm text-purple-200/80 mb-8 max-w-sm">
            Gestiona invitados, fechas y detalles desde una sola plataforma diseñada para hacer cada evento especial.
          </p>

          {/* Badges / Etiquetas */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs border border-white/10 flex items-center gap-1">
              ✨ Gestión de eventos
            </span>
            <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs border border-white/10 flex items-center gap-1">
              👥 Lista de invitados
            </span>
            <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs border border-white/10 flex items-center gap-1">
              📅 Calendario inteligente
            </span>
          </div>

          {/* Badge de usuarios */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full flex items-center gap-3">
            <div className="flex -space-x-1">
              <span className="w-5 h-5 rounded-full bg-cyan-400 text-[9px] font-bold text-white flex items-center justify-center">A</span>
              <span className="w-5 h-5 rounded-full bg-emerald-400 text-[9px] font-bold text-white flex items-center justify-center">M</span>
              <span className="w-5 h-5 rounded-full bg-rose-400 text-[9px] font-bold text-white flex items-center justify-center">R</span>
            </div>
            <span className="text-xs text-white font-medium">
              +12,000 planificadores <span className="text-purple-300 font-normal">confían en Evora</span>
            </span>
          </div>
        </div>

        {/* Footer del panel derecho */}
        <div className="relative z-10 text-xs text-purple-300/60 font-medium">
          Evora · 2026
        </div>
      </div>
    </div>
  );
};