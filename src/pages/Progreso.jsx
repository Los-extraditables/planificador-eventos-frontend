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
import { Aviso, EncabezadoPagina, PantallaCarga, UI } from '../components/ui';
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

/* ===================== Etiqueta de pospuestas (igual que en Hoy y Detalle) ===================== */
const EtiquetaPospuestas = ({ cantidad, texto }) => {
  if (!cantidad && !texto) return null;
  return (
    <span className="inline-flex items-center bg-amber-100 text-amber-800 border border-amber-200 text-[10px] leading-4 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
      {texto || `${cantidad} ${cantidad === 1 ? 'pospuesta' : 'pospuestas'}`}
    </span>
  );
};

/* ========================= Barra de progreso (igual que en Detalle) ========================= */
const ALTURAS = { sm: 'h-2', md: 'h-2.5', lg: 'h-3' };

const BarraProgreso = ({ completadas, total, pospuestas = 0, titulo, tamano = 'md', ocultarTitulo = false, ocultarCabecera = false, className = '' }) => {
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {!ocultarCabecera && (
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2 min-w-0">
            <span className={ocultarTitulo ? 'sr-only' : ''}>{titulo}</span>
            <EtiquetaPospuestas cantidad={pospuestas} />
          </div>
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
    </div>
  );
};

/* ===================== Modal de confirmación de eliminación (igual que en Detalle) ===================== */
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
            <h3 id="titulo-eliminar" className={UI.modalTitulo}>{titulo}</h3>
            <p id="desc-eliminar" className={`${UI.modalSubtitulo} leading-relaxed`}>{descripcion}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
          <button type="button" onClick={onCancelar} disabled={eliminando} autoFocus className={UI.btnSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={eliminando} className={UI.btnPeligro}>
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
    <div className={UI.pagina}>
      {mensaje.texto && <Aviso tipo={mensaje.tipo} texto={mensaje.texto} />}

      {cargando && (
        <PantallaCarga
          icono={BarChart3}
          titulo="Calculando progreso"
          texto="Procesando el avance de tus eventos y subtareas..."
        />
      )}

      {error && !cargando && (
        <div className="p-5 text-red-600 bg-red-50/80 rounded-2xl text-sm border border-red-200 flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{error}</span>
          </div>
          <button onClick={obtenerDatos} className={UI.btnPrimario}>
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && (
        <>
          <EncabezadoPagina titulo="Progreso de eventos" subtitulo="Consulta el avance de tus eventos y subtareas.">
            <div className={UI.filtro}>
              <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                aria-label="Filtrar eventos"
                className={UI.filtroSelect}
              >
                <option value="todos">Todos los eventos</option>
                <option value="en_preparacion">En preparación</option>
                <option value="completados">Completados</option>
              </select>
            </div>
          </EncabezadoPagina>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`${UI.tarjeta} flex flex-col justify-between space-y-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00B4D8] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Eventos mostrados</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{eventosCalculados.length}</div>
            </div>

            <div className={`${UI.tarjeta} flex flex-col justify-between space-y-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Subtareas completadas</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {global.completadas} <span className="text-xl text-slate-400 font-medium">/ {global.total}</span>
              </div>
            </div>

            <div className={`${UI.tarjeta} flex flex-col justify-between space-y-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7E22CE] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Cumplimiento global</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{global.porcentaje}%</div>
                  <EtiquetaPospuestas cantidad={global.pospuestas} />
                </div>
                <BarraProgreso completadas={global.completadas} total={global.total} titulo="Cumplimiento global" tamano="sm" ocultarCabecera />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-2">
            <h2 className={UI.h2}>Detalle por evento</h2>

            {eventosCalculados.length === 0 ? (
              <div className={`${UI.tarjeta} p-8 text-center text-slate-400 text-sm`}>
                No hay eventos registrados que coincidan con este filtro.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {eventosCalculados.map((evento) => (
                  <div key={evento.id} className={`${UI.tarjeta} flex flex-col gap-4 hover:shadow-md transition-all`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-extrabold text-slate-900">{evento.nombre}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] rounded-full text-[10px] leading-4 font-bold whitespace-nowrap">
                            {evento.estado || 'En preparación'}
                          </span>
                          <EtiquetaPospuestas cantidad={evento.progreso.pospuestas} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{evento.categoria || evento.tipo || 'Social'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/detalle-evento/${evento.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#7E22CE] bg-purple-50 hover:bg-[#7E22CE] hover:text-white px-3.5 py-2 rounded-xl transition whitespace-nowrap cursor-pointer"
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