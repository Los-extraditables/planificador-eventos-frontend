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
import { createPortal } from 'react-dom';
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
// Anillo de foco visible y consistente para los controles definidos en este archivo
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2';

// Áreas táctiles de 44px en móvil/tablet; en escritorio se mantiene el tamaño original
const TACTIL = 'min-h-[44px] md:min-h-0';

// Select: 16px en móvil (evita el zoom automático de iOS) y sin desbordar su contenedor
const CAMPO = 'w-full min-w-0 !text-base sm:!text-sm';

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

/* ===================== Diálogo accesible (foco, Esc, Tab) ===================== */
// Al abrir: foco en [data-autofocus] (o el primer control). Al cerrar: devuelve el foco a quien lo abrió.
// Si ese elemento ya no existe (p. ej. se eliminó el evento), el foco pasa al encabezado #foco-fallback.
const useDialogo = (onCerrar, bloqueado) => {
  const ref = useRef(null);
  const cerrarRef = useRef(onCerrar);
  const bloqueadoRef = useRef(bloqueado);
  cerrarRef.current = onCerrar;
  bloqueadoRef.current = bloqueado;

  useEffect(() => {
    const previo = document.activeElement;
    const cont = ref.current;
    const inicial = cont?.querySelector('[data-autofocus]') || cont?.querySelector(SELECTOR_FOCO);
    inicial?.focus();

    // La página de fondo no se desplaza mientras hay un diálogo abierto (importante en móvil)
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflowPrevio;
      if (previo && previo.isConnected && typeof previo.focus === 'function') previo.focus();
      else document.getElementById('foco-fallback')?.focus();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!bloqueadoRef.current) cerrarRef.current();
      return;
    }
    if (e.key !== 'Tab') return;
    const enfocables = ref.current?.querySelectorAll(SELECTOR_FOCO);
    if (!enfocables || enfocables.length === 0) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  return { ref, onKeyDown };
};

const Modal = ({ onCerrar, bloqueado = false, labelledBy, describedBy, role = 'dialog', z = 'z-50', className, children }) => {
  const { ref, onKeyDown } = useDialogo(onCerrar, bloqueado);
  // Se monta en <body>: así ningún contenedor padre (overflow, transform, z-index) lo recorta ni lo tapa.
  // La capa exterior hace scroll si el diálogo es más alto que la pantalla (teclado abierto, pantallas bajas).
  return createPortal(
    <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm overflow-y-auto overscroll-contain ${z}`}>
      <div
        className="flex min-h-full items-center justify-center p-3 sm:p-4"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
        }}
        onMouseDown={(e) => e.target === e.currentTarget && !bloqueado && onCerrar()}
      >
        <div
          ref={ref}
          role={role}
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          onKeyDown={onKeyDown}
          className={className}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ===================== Etiqueta de pospuestas (igual que en Hoy y Detalle) ===================== */
const EtiquetaPospuestas = ({ cantidad, texto }) => {
  if (!cantidad && !texto) return null;
  return (
    <span className="inline-flex items-center bg-amber-100 text-amber-800 border border-amber-200 text-xs leading-4 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
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
        <div className="flex items-center justify-between gap-x-3 gap-y-1 flex-wrap text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
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
const ModalConfirmarEliminar = ({ titulo, descripcion, eliminando, onConfirmar, onCancelar }) => (
  <Modal
    role="alertdialog"
    z="z-[70]"
    bloqueado={eliminando}
    onCerrar={onCancelar}
    labelledBy="titulo-eliminar"
    describedBy="desc-eliminar"
    className="bg-white rounded-3xl p-5 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 text-left"
  >
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h2 id="titulo-eliminar" className={UI.modalTitulo}>{titulo}</h2>
        <p id="desc-eliminar" className={`${UI.modalSubtitulo} leading-relaxed break-words`}>{descripcion}</p>
      </div>
    </div>

    {/* En móvil los botones se apilan a ancho completo (acción principal arriba) */}
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-5 sm:pt-6 mt-5 sm:mt-6 border-t border-slate-100">
      <button type="button" onClick={onCancelar} disabled={eliminando} data-autofocus className={`${UI.btnSecundario} ${FOCO} w-full sm:w-auto justify-center ${TACTIL}`}>
        Cancelar
      </button>
      <button type="button" onClick={onConfirmar} disabled={eliminando} className={`${UI.btnPeligro} ${FOCO} w-full sm:w-auto justify-center ${TACTIL}`}>
        <Trash2 className="w-4 h-4" aria-hidden="true" />
        {eliminando ? 'Eliminando...' : 'Eliminar'}
      </button>
    </div>
  </Modal>
);

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

  const listo = !cargando && !error;
  const cantidadEventos = eventosCalculados.length;

  // El filtro solo se muestra cuando ya cargó y existe al menos un evento (sin importar el filtro activo)
  const hayEventos = listo && eventos.length > 0;

  return (
    <div className={`${UI.pagina} min-w-0 max-w-full overflow-x-hidden`}>
      {/* Aviso visible (oculto al lector de pantalla para no duplicar) */}
      {mensaje.texto && (
        <div aria-hidden="true" className="break-words">
          <Aviso tipo={mensaje.tipo} texto={mensaje.texto} />
        </div>
      )}
      {/* Regiones en vivo siempre presentes */}
      <div role="status" aria-live="polite" className="sr-only">
        {mensaje.tipo !== 'error' ? mensaje.texto : ''}
      </div>
      <div role="alert" className="sr-only">
        {mensaje.tipo === 'error' ? mensaje.texto : ''}
      </div>

      {/* El encabezado (h1) siempre está presente, también durante la carga y ante un error */}
      <EncabezadoPagina titulo="Progreso de eventos" subtitulo="Consulta el avance de tus eventos y subtareas.">
        {hayEventos && (
          <div className="w-full sm:w-auto">
            <div className={`${UI.filtro} w-full sm:w-auto`}>
              <SlidersHorizontal className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                aria-label="Filtrar eventos"
                className={`${UI.filtroSelect} ${FOCO} ${CAMPO} ${TACTIL}`}
              >
                <option value="todos">Todos los eventos</option>
                <option value="en_preparacion">En preparación</option>
                <option value="completados">Completados</option>
              </select>
            </div>
          </div>
        )}
      </EncabezadoPagina>

      {cargando && (
        <div role="status" aria-live="polite">
          <PantallaCarga
            icono={BarChart3}
            titulo="Calculando progreso"
            texto="Procesando el avance de tus eventos y subtareas..."
          />
        </div>
      )}

      {error && !cargando && (
        <div role="alert" className="p-4 sm:p-5 text-red-700 bg-red-50/80 rounded-2xl text-sm border border-red-200 flex flex-col items-stretch sm:items-start gap-3">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="font-bold break-words min-w-0">{error}</span>
          </div>
          <button type="button" onClick={obtenerDatos} className={`${UI.btnPrimario} ${FOCO} w-full sm:w-auto justify-center ${TACTIL}`}>
            Reintentar
          </button>
        </div>
      )}

      {listo && (
        <>
          {/* Anuncia cuántos eventos quedan al cambiar el filtro */}
          <p role="status" aria-live="polite" className="sr-only">
            Mostrando {cantidadEventos} {cantidadEventos === 1 ? 'evento' : 'eventos'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className={`${UI.tarjeta} flex flex-col justify-between space-y-3 sm:space-y-4 min-w-0`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-700 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <BarChart3 className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-slate-600">Eventos mostrados</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{cantidadEventos}</div>
            </div>

            <div className={`${UI.tarjeta} flex flex-col justify-between space-y-3 sm:space-y-4 min-w-0`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-slate-600">Subtareas completadas</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {global.completadas}{' '}
                <span className="text-lg sm:text-xl text-slate-600 font-medium">
                  <span className="sr-only">de </span>
                  <span aria-hidden="true">/ </span>
                  {global.total}
                </span>
              </div>
            </div>

            <div className={`${UI.tarjeta} flex flex-col justify-between space-y-3 sm:space-y-4 min-w-0`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7E22CE] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <TrendingUp className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-slate-600">Cumplimiento global</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{global.porcentaje}%</div>
                  <EtiquetaPospuestas cantidad={global.pospuestas} />
                </div>
                <BarraProgreso completadas={global.completadas} total={global.total} titulo="Cumplimiento global" tamano="sm" ocultarCabecera />
              </div>
            </div>
          </div>

          <section aria-labelledby="foco-fallback" className="flex flex-col gap-4 pt-2">
            <h2 id="foco-fallback" tabIndex={-1} className={`${UI.h2} focus:outline-none`}>Detalle por evento</h2>

            {cantidadEventos === 0 ? (
              <div className={`${UI.tarjeta} p-6 sm:p-8 text-center text-slate-600 text-sm`}>
                {eventos.length === 0
                  ? 'Aún no tienes eventos registrados.'
                  : 'No hay eventos registrados que coincidan con este filtro.'}
              </div>
            ) : (
              <ul className="flex flex-col gap-3 sm:gap-4">
                {eventosCalculados.map((evento) => (
                  <li key={evento.id} className={`${UI.tarjeta} flex flex-col gap-4 hover:shadow-md transition-all min-w-0`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-extrabold text-slate-900 break-words min-w-0">{evento.nombre}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] rounded-full text-xs leading-4 font-bold whitespace-nowrap">
                            <span className="sr-only">Estado: </span>
                            {evento.estado || 'En preparación'}
                          </span>
                          <EtiquetaPospuestas cantidad={evento.progreso.pospuestas} />
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{evento.categoria || evento.tipo || 'Social'}</p>
                      </div>

                      {/* En móvil "Ver detalle" ocupa el ancho disponible junto al botón de eliminar */}
                      <div className="flex items-stretch md:items-center gap-2 w-full md:w-auto">
                        <button
                          type="button"
                          onClick={() => navigate(`/detalle-evento/${evento.id}`)}
                          aria-label={`Ver detalle de ${evento.nombre}`}
                          className={`inline-flex items-center justify-center gap-1 flex-1 md:flex-none text-xs font-bold text-[#7E22CE] bg-purple-50 hover:bg-[#7E22CE] hover:text-white px-3.5 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${TACTIL} ${FOCO}`}
                        >
                          <span>Ver detalle</span>
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventoAEliminar(evento)}
                          className={`inline-flex items-center justify-center p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 text-slate-600 hover:text-red-700 transition cursor-pointer rounded-lg hover:bg-red-50 ${FOCO}`}
                          aria-label={`Eliminar ${evento.nombre}`}
                          aria-haspopup="dialog"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <BarraProgreso
                      completadas={evento.progreso.completadas}
                      total={evento.progreso.total}
                      titulo={`Progreso de ${evento.nombre}`}
                      ocultarTitulo
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
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