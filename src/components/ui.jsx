// src/components/ui.jsx
// Única fuente de estilos para Hoy, CrearEvento, DetalleEvento y Progreso.
// Si quieres cambiar una letra, tamaño o color, cámbialo aquí y se actualizan las 4 pantallas.
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/* ============================ Clases base ============================ */
export const UI = {
  // Contenedor de página (mismo ancho, margen y fondo en todas)
  pagina: 'p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen text-slate-800 text-left font-sans',

  // Texto
  h1: 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight',
  subtitulo: 'text-xs sm:text-sm text-slate-500 mt-1',
  h2: 'text-base sm:text-lg font-extrabold text-slate-900 tracking-tight',
  modalTitulo: 'text-2xl font-semibold text-[#1e2b4d]',
  modalSubtitulo: 'text-sm text-slate-500 mt-1',
  ayuda: 'text-xs text-slate-500 font-medium',
  error: 'text-xs text-red-600 mt-2 font-medium',

  // Tarjetas
  tarjeta: 'bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm',
  modal: 'bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 text-left',

  // Formularios
  label: 'block text-sm font-medium text-slate-700 mb-2',
  input:
    'w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition',
  inputError:
    'w-full px-4 py-3.5 bg-red-50/70 border border-red-400 rounded-xl text-sm text-slate-800 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 transition',

  // Botones
  btnPrimario:
    'inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer disabled:opacity-60',
  btnSecundario:
    'inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition cursor-pointer disabled:opacity-60',
  btnPeligro:
    'inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer disabled:opacity-60',
  btnSecundarioSm:
    'inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-800 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm cursor-pointer',
  btnAgregarSm:
    'inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 font-bold text-xs sm:text-sm rounded-xl transition shadow-sm cursor-pointer',
  btnEnlace: 'text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer',
  // Botones dentro de cada subtarea (Hecha / Posponer)
  btnHecha: 'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60',
  btnHechaPendiente: 'bg-purple-700 hover:bg-purple-800 text-white',
  btnHechaListo: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  btnPosponer:
    'px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition cursor-pointer disabled:opacity-60',

  // Selector de filtro (arriba a la derecha)
  filtro: 'flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-sm w-fit',
  filtroSelect: 'bg-transparent text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer',

  // Estados
  cargandoContenedor: 'py-12 px-4 flex flex-col items-center justify-center space-y-8',
  cargandoTitulo: 'text-lg font-extrabold text-slate-900 tracking-tight',
  cargandoTexto: 'text-sm text-slate-500 max-w-sm'
};

/* ============================ Componentes ============================ */

// Encabezado idéntico en todas las pantallas: título + subtítulo a la izquierda, acciones a la derecha.
export const EncabezadoPagina = ({ titulo, subtitulo, children, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      <h1 className={UI.h1}>{titulo}</h1>
      {subtitulo && <p className={UI.subtitulo}>{subtitulo}</p>}
    </div>
    {children && <div className="flex items-center gap-3 flex-wrap">{children}</div>}
  </div>
);

// Aviso flotante arriba a la derecha (reemplaza los banners en línea y los toasts distintos).
// Uso: {mensaje.texto && <Aviso tipo={mensaje.tipo} texto={mensaje.texto} />}
export const Aviso = ({ tipo, texto }) => (
  <div
    role={tipo === 'exito' ? 'status' : 'alert'}
    className={`fixed top-5 right-5 z-[60] max-w-sm flex items-start gap-2.5 px-5 py-4 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
      tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'
    }`}
  >
    {tipo === 'exito' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
    <span>{texto}</span>
  </div>
);

// Pantalla de carga idéntica en todas las pantallas.
export const PantallaCarga = ({ icono: Icono, titulo, texto }) => (
  <div className={UI.cargandoContenedor} role="status" aria-live="polite">
    <div className="flex flex-col items-center text-center space-y-3">
      <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
        <Icono className="w-8 h-8 animate-pulse" />
      </div>
      <div className="space-y-1">
        <h3 className={UI.cargandoTitulo}>{titulo}</h3>
        <p className={UI.cargandoTexto}>{texto}</p>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 animate-pulse">
          <div className="h-4 bg-slate-200 rounded-full w-3/4"></div>
          <div className="h-3 bg-slate-100 rounded-full w-1/2"></div>
        </div>
      ))}
    </div>
  </div>
);

/* ============================ Fechas ============================ */
// Un solo formato de fecha en toda la app: dd/mm/aaaa
export const limpiarFecha = (f) => (f || '').toString().split('T')[0].split(' ')[0];
export const formatearFechaDisplay = (valor) => {
  const p = limpiarFecha(valor).split('-');
  return p.length < 3 ? limpiarFecha(valor) : `${p[2]}/${p[1]}/${p[0]}`;
};