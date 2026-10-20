import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

/* ============================== API ============================== */
const rawApiUrl = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
const API_URL = rawApiUrl.replace(/\/+$/, '');
const getToken = () => authService.getToken() || localStorage.getItem('token');
const errorSesion = () => Object.assign(new Error('Sesión expirada.'), { sesionExpirada: true });

const request = async (ruta, { method = 'GET', body } = {}) => {
  const token = getToken();
  if (!token) throw errorSesion();
  const res = await fetch(`${API_URL}${ruta}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 || res.status === 403) throw errorSesion();
  if (!res.ok) throw new Error('Error del servidor.');
  return res.status === 204 ? null : res.json().catch(() => null);
};

/* ============================ Utilidades ============================ */
const gestionesDe = (ev) => ev?.gestiones || ev?.gestiones_plan || [];
const esCompletado = (ev) => String(ev?.estado || '').toLowerCase().startsWith('completad');
const esPospuesta = (g) =>
  !g.completada && Boolean(g.nota_pospuesto || g.estado === 'pospuesto' || g.pospuesto || g.reprogramado);

// Misma fórmula en /hoy, /progreso y el detalle del evento
const calcularProgreso = (gestiones = []) => {
  const total = gestiones.length;
  const completadas = gestiones.filter((g) => g.completada).length;
  return {
    total,
    completadas,
    pospuestas: gestiones.filter(esPospuesta).length,
    porcentaje: total > 0 ? Math.round((completadas / total) * 100) : 0
  };
};

/* ========================= Barra de progreso ========================= */
const ALTURAS = { sm: 'h-2', md: 'h-2.5', lg: 'h-3' };

const BarraProgreso = ({ completadas, total, pospuestas = 0, titulo, tamano = 'md', ocultarTitulo = false, ocultarCabecera = false, className = '' }) => {
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {!ocultarCabecera && (
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
          <span className={ocultarTitulo ? 'sr-only' : ''}>{titulo}</span>
          <span className="text-slate-900 font-extrabold ml-auto">
            {completadas}/{total} subtareas <span className="text-purple-700 ml-1">{porcentaje}%</span>
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={titulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        aria-valuetext={`${completadas} de ${total} subtareas, ${porcentaje}%`}
        className={`w-full bg-slate-100 rounded-full overflow-hidden ${ALTURAS[tamano]}`}
      >
        <div className="h-full bg-[#7E22CE] rounded-full transition-all duration-500 motion-reduce:transition-none" style={{ width: `${porcentaje}%` }} />
      </div>
      {pospuestas > 0 && (
        <p className="text-[11px] font-medium text-amber-700">
          {pospuestas} {pospuestas === 1 ? 'pospuesta' : 'pospuestas'}
        </p>
      )}
    </div>
  );
};

/* ===================== Modal de confirmación de eliminación ===================== */
const ModalConfirmarEliminar = ({ titulo, descripcion, eliminando, onConfirmar, onCancelar }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !eliminando && onCancelar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [eliminando, onCancelar]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !eliminando && onCancelar()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-eliminar"
        aria-describedby="desc-eliminar"
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 text-left"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 id="titulo-eliminar" className="text-xl font-semibold text-[#1e2b4d]">{titulo}</h3>
            <p id="desc-eliminar" className="text-sm text-slate-500 mt-1.5 leading-relaxed">{descripcion}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancelar}
            disabled={eliminando}
            autoFocus
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition cursor-pointer disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={eliminando}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <Trash2 className="w-4 h-4" />
            {eliminando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================================ Página ================================ */
const Progreso = () => {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const timerMensaje = useRef(null);
  const [eventoAEliminar, setEventoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const handleSesionExpirada = () => {
    authService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const mostrarMensaje = (tipo, texto) => {
    clearTimeout(timerMensaje.current);
    setMensaje({ tipo, texto });
    timerMensaje.current = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };
  useEffect(() => () => clearTimeout(timerMensaje.current), []);

  const obtenerDatos = async () => {
    try {
      setCargando(true);
      setError(null);

      const data = await request('/eventos/');

      // Si el 100% de las subtareas están hechas, el evento pasa a "Completado"
      const procesados = await Promise.all(
        (Array.isArray(data) ? data : []).map(async (ev) => {
          const { total, completadas } = calcularProgreso(gestionesDe(ev));
          if (total > 0 && total === completadas && !esCompletado(ev)) {
            try {
              await request(`/eventos/${ev.id}/`, { method: 'PATCH', body: { estado: 'Completado' } });
              return { ...ev, estado: 'Completado' };
            } catch (err) {
              if (err.sesionExpirada) throw err;
              console.error('Error al auto-completar evento:', err);
            }
          }
          return ev;
        })
      );

      setEventos(procesados);
    } catch (err) {
      if (err.sesionExpirada) return handleSesionExpirada();
      console.error(err);
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmarEliminarEvento = async () => {
    if (!eventoAEliminar) return;
    setEliminando(true);
    try {
      await request(`/eventos/${eventoAEliminar.id}/`, { method: 'DELETE' });
      setEventos((prev) => prev.filter((e) => e.id !== eventoAEliminar.id));
      mostrarMensaje('exito', 'Evento eliminado correctamente.');
      setEventoAEliminar(null);
    } catch (err) {
      setEventoAEliminar(null);
      if (err.sesionExpirada) return handleSesionExpirada();
      mostrarMensaje('error', err.message);
    } finally {
      setEliminando(false);
    }
  };

  const eventosFiltrados = useMemo(
    () =>
      eventos.filter((ev) => {
        if (filtroEstado === 'en_preparacion') return !esCompletado(ev);
        if (filtroEstado === 'completados') return esCompletado(ev);
        return true;
      }),
    [eventos, filtroEstado]
  );

  const { eventosCalculados, global } = useMemo(
    () => ({
      eventosCalculados: eventosFiltrados.map((ev) => ({ ...ev, progreso: calcularProgreso(gestionesDe(ev)) })),
      global: calcularProgreso(eventosFiltrados.flatMap(gestionesDe))
    }),
    [eventosFiltrados]
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen text-slate-800 text-left font-sans">
      {mensaje.texto && (
        <div
          role="status"
          className={`p-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 shadow-sm transition-all ${
            mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {cargando && (
        <div className="py-16 px-4 flex flex-col items-center justify-center space-y-8" role="status" aria-live="polite">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <BarChart3 className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Calculando progreso</h3>
              <p className="text-sm text-slate-500 max-w-sm">Procesando el avance de tus eventos y subtareas...</p>
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
      )}

      {error && !cargando && (
        <div className="p-5 text-red-600 bg-red-50/80 rounded-2xl text-sm border border-red-200 flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{error}</span>
          </div>
          <button onClick={obtenerDatos} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">Progreso de eventos</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Consulta el avance de tus eventos y subtareas.</p>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-sm w-fit">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                aria-label="Filtrar eventos"
                className="bg-transparent text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos los eventos</option>
                <option value="en_preparacion">En preparación</option>
                <option value="completados">Completados</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00B4D8] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Eventos mostrados</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{eventosCalculados.length}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Subtareas completadas</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {global.completadas} <span className="text-xl text-slate-400 font-medium">/ {global.total}</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7E22CE] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Cumplimiento global</span>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{global.porcentaje}%</p>
                <BarraProgreso completadas={global.completadas} total={global.total} pospuestas={global.pospuestas} titulo="Cumplimiento global" tamano="sm" ocultarCabecera />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight">Detalle por evento</h2>

            {eventosCalculados.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-sm">
                No hay eventos registrados que coincidan con este filtro.
              </div>
            ) : (
              <div className="space-y-3">
                {eventosCalculados.map((evento) => (
                  <div key={evento.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-extrabold text-slate-900">{evento.nombre}</h3>
                          <span className="px-3 py-0.5 bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] rounded-full text-[11px] font-bold">
                            {evento.estado || 'En preparación'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{evento.categoria || evento.tipo || 'Social'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/detalle-evento/${evento.id}`)}
                          className="inline-flex items-center gap-1 bg-[#F3E8FF]/60 hover:bg-[#F3E8FF] text-[#7E22CE] font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                        >
                          <span>Ver detalle</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventoAEliminar(evento)}
                          className="p-2 text-slate-400 hover:text-red-600 transition cursor-pointer rounded-lg hover:bg-red-50"
                          title="Eliminar evento"
                          aria-label={`Eliminar ${evento.nombre}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <BarraProgreso
                      completadas={evento.progreso.completadas}
                      total={evento.progreso.total}
                      pospuestas={evento.progreso.pospuestas}
                      titulo={`Progreso de ${evento.nombre}`}
                      ocultarTitulo
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {eventoAEliminar && (
        <ModalConfirmarEliminar
          titulo="Eliminar evento"
          descripcion={`Vas a eliminar "${eventoAEliminar.nombre}"${
            gestionesDe(eventoAEliminar).length > 0 ? ` y sus ${gestionesDe(eventoAEliminar).length} subtareas` : ''
          }. Esta acción no se puede deshacer.`}
          eliminando={eliminando}
          onConfirmar={confirmarEliminarEvento}
          onCancelar={() => setEventoAEliminar(null)}
        />
      )}
    </div>
  );
};

export default Progreso;