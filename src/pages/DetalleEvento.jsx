import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Edit3,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Aviso, EncabezadoPagina, PantallaCarga, UI, formatearFechaDisplay, limpiarFecha } from '../components/ui';
import { authService } from '../services/authService';

/* ============================== API ============================== */
const rawApiUrl = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
const API_URL = rawApiUrl.replace(/\/+$/, '');
const getToken = () => authService.getToken() || localStorage.getItem('token');
const errorSesion = () => Object.assign(new Error('Sesión expirada.'), { sesionExpirada: true });

const formatearError = (obj) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(formatearError).join(', ');
  if (typeof obj === 'object') return Object.entries(obj).map(([k, v]) => `${k}: ${formatearError(v)}`).join(' | ');
  return String(obj);
};

const request = async (ruta, { method = 'GET', body } = {}) => {
  const token = getToken();
  if (!token) throw errorSesion();
  const res = await fetch(`${API_URL}${ruta}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 || res.status === 403) throw errorSesion();
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw Object.assign(new Error(formatearError(data) || 'Error del servidor.'), { status: res.status });
  }
  return res.status === 204 ? null : res.json().catch(() => null);
};

/* ============================ Utilidades ============================ */
const NOTA_POR_DEFECTO = 'Pospuesto sin nota';

// Anillo de foco visible y consistente para los controles definidos en este archivo
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2';

// Áreas táctiles de 44px en móvil/tablet; en escritorio se mantiene el tamaño original
const TACTIL = 'min-h-[44px] md:min-h-0';

// Campos: 16px en móvil (evita el zoom automático de iOS) y sin desbordar su contenedor
const CAMPO = 'w-full min-w-0 !text-base sm:!text-sm';

// Estilo del diálogo definido aquí (no depende de UI.modal): padding y ancho adaptados a cada pantalla
const CLASE_MODAL = 'bg-white rounded-3xl p-5 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100 text-left';

// Pie de los diálogos: botones apilados a ancho completo en móvil (acción principal arriba), en fila desde sm
const PIE_DIALOGO = 'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-5 border-t border-slate-100';
const BTN_DIALOGO = `w-full sm:w-auto justify-center ${TACTIL}`;

// Safari/iOS: el input de fecha ignora el ancho del contenedor y se sale del diálogo mientras conserve su apariencia nativa.
// appearance-none + min-w-0 lo obliga a respetar el ancho; min-h evita que colapse cuando está vacío.
const FECHA_IOS = 'appearance-none block min-w-0 max-w-full min-h-[3.25rem] sm:min-h-0 [&::-webkit-date-and-time-value]:text-left';

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIN_ERROR = { campo: '', texto: '' };

const fechaOffsetStr = (dias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const gestionesDe = (ev) => ev?.gestiones || ev?.gestiones_plan || [];
const esCompletado = (ev) => String(ev?.estado || '').toLowerCase().startsWith('completad');
const esPospuesta = (g) =>
  !g.completada && Boolean(g.nota_pospuesto || g.estado === 'pospuesto' || g.pospuesto || g.reprogramado);

const sumarHoras = (gestiones, excluirId = null) =>
  gestiones.reduce((acc, g) => {
    if (excluirId !== null && g.id === excluirId) return acc;
    const h = parseFloat(g.horas_estimadas);
    return acc + (!isNaN(h) && h > 0 ? h : 0);
  }, 0);

// Misma fórmula en /hoy, /progreso y aquí
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

const armarCambio = (accion, { fecha, nota } = {}) => {
  if (accion === 'hecho') return { cambios: { completada: true, pospuesto: false }, body: { completada: true, pospuesto: false } };
  if (accion === 'pendiente') return { cambios: { completada: false }, body: { completada: false } };
  const notaFinal = (nota || '').trim() || NOTA_POR_DEFECTO;
  return {
    cambios: { plazo: fecha, fecha, estado: 'pospuesto', nota_pospuesto: notaFinal, pospuesto: true, completada: false },
    body: { plazo: fecha, estado: 'pospuesto', nota_pospuesto: notaFinal, pospuesto: true }
  };
};

// Atributos de accesibilidad de un campo con posible error dentro de un formulario
const attrsCampo = (err, campo, id, extraDescribedBy) => {
  const conError = err.campo === campo;
  const ids = [extraDescribedBy, conError ? `${id}-error` : null].filter(Boolean).join(' ');
  return {
    id,
    'aria-invalid': conError ? 'true' : undefined,
    'aria-describedby': ids || undefined
  };
};

const MensajeCampo = ({ id, texto }) =>
  texto ? (
    <p id={id} role="alert" className={`${UI.error} break-words`}>
      {texto}
    </p>
  ) : null;

const Asterisco = () => (
  <>
    <span className="text-red-700" aria-hidden="true">*</span>
    <span className="sr-only"> (obligatorio)</span>
  </>
);

/* ===================== Diálogo accesible (foco, Esc, Tab) ===================== */
// Al abrir: foco en [data-autofocus] (o el primer control). Al cerrar: devuelve el foco a quien lo abrió.
// Si ese elemento ya no existe (p. ej. se eliminó la subtarea), el foco pasa al encabezado #foco-fallback.
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

const BotonCerrar = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 -m-1 sm:p-1 sm:m-0 rounded text-slate-600 hover:text-slate-800 transition cursor-pointer flex-shrink-0 ${FOCO}`}
    aria-label="Cerrar diálogo"
  >
    <X className="w-5 h-5" aria-hidden="true" />
  </button>
);

/* ===================== Etiqueta de pospuestas (igual que en Hoy y Progreso) ===================== */
const EtiquetaPospuestas = ({ cantidad, texto }) => {
  if (!cantidad && !texto) return null;
  return (
    <span className="inline-flex items-center bg-amber-100 text-amber-800 border border-amber-200 text-xs leading-4 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
      {texto || `${cantidad} ${cantidad === 1 ? 'pospuesta' : 'pospuestas'}`}
    </span>
  );
};

/* ========================= Barra de progreso (igual que en Progreso) ========================= */
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

/* ===================== Control Hecha / Posponer (igual que en Hoy) ===================== */
const RegistroAvance = ({ gestion, eventoFecha, onRegistrar }) => {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ fecha: '', nota: '' });
  const [errorFecha, setErrorFecha] = useState('');
  const [guardando, setGuardando] = useState(false);
  const inputFechaRef = useRef(null);

  const completada = Boolean(gestion.completada);
  const minFecha = fechaOffsetStr(1);
  const limiteEvento = limpiarFecha(eventoFecha);
  const maxFecha = limiteEvento && limiteEvento >= minFecha ? limiteEvento : undefined;

  const cerrar = () => {
    setAbierto(false);
    setErrorFecha('');
  };

  const ejecutar = async (accion, datos) => {
    setGuardando(true);
    try {
      return await onRegistrar(accion, datos);
    } finally {
      setGuardando(false);
    }
  };

  const fallar = (texto) => {
    setErrorFecha(texto);
    inputFechaRef.current?.focus(); // el foco va al campo inválido
  };

  const confirmarPosponer = async (e) => {
    e.preventDefault();
    if (!form.fecha) return fallar('Selecciona la nueva fecha.');
    if (form.fecha < minFecha) return fallar('La nueva fecha debe ser posterior a hoy.');
    if (maxFecha && form.fecha > maxFecha) return fallar('La fecha no puede superar la fecha límite del evento.');
    cerrar();
    await ejecutar('pospuesto', { fecha: form.fecha, nota: form.nota });
  };

  const describedFecha = [errorFecha ? 'posponer-fecha-error' : null, maxFecha && !errorFecha ? 'posponer-fecha-ayuda' : null]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/* En móvil los botones ocupan todo el ancho de la fila; desde sm quedan a su tamaño */}
      <div className="flex items-stretch sm:items-center gap-2 w-full sm:w-auto flex-shrink-0">
        <button
          type="button"
          onClick={() => ejecutar(completada ? 'pendiente' : 'hecho')}
          disabled={guardando}
          aria-label={completada ? `Completada. Marcar como pendiente: ${gestion.descripcion}` : `Marcar como hecha: ${gestion.descripcion}`}
          className={`${UI.btnHecha} ${completada ? UI.btnHechaListo : UI.btnHechaPendiente} ${FOCO} ${TACTIL} flex-1 sm:flex-none justify-center`}
        >
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{completada ? 'Completada' : 'Hecha'}</span>
        </button>

        {!completada && (
          <button
            type="button"
            onClick={() => {
              setForm({ fecha: '', nota: '' });
              setErrorFecha('');
              setAbierto(true);
            }}
            disabled={guardando}
            aria-label={`Posponer: ${gestion.descripcion}`}
            aria-haspopup="dialog"
            className={`${UI.btnPosponer} ${FOCO} ${TACTIL} flex-1 sm:flex-none justify-center`}
          >
            Posponer
          </button>
        )}
      </div>

      {abierto && (
        <Modal onCerrar={cerrar} labelledBy="titulo-posponer" describedBy="descripcion-posponer" className={CLASE_MODAL}>
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="titulo-posponer" className={UI.modalTitulo}>Posponer subtarea</h2>
                <p id="descripcion-posponer" className={`${UI.modalSubtitulo} truncate`}>{gestion.descripcion}</p>
              </div>
            </div>
            <BotonCerrar onClick={cerrar} />
          </div>

          <form onSubmit={confirmarPosponer} noValidate className="mt-5 sm:mt-6 space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="posponer-fecha" className={UI.label}>
                Nueva fecha <Asterisco />
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  ref={inputFechaRef}
                  id="posponer-fecha"
                  data-autofocus
                  type="date"
                  min={minFecha}
                  max={maxFecha}
                  aria-required="true"
                  aria-invalid={errorFecha ? 'true' : 'false'}
                  aria-describedby={describedFecha || undefined}
                  value={form.fecha}
                  onChange={(e) => {
                    setForm({ ...form, fecha: e.target.value });
                    setErrorFecha('');
                  }}
                  className={`${errorFecha ? UI.inputError : UI.input} ${CAMPO} ${FECHA_IOS} pl-11 ${FOCO}`}
                />
              </div>
              <MensajeCampo id="posponer-fecha-error" texto={errorFecha} />
              {maxFecha && !errorFecha && (
                <p id="posponer-fecha-ayuda" className="text-xs text-slate-600 mt-1.5">Puedes elegir hasta la fecha límite del evento.</p>
              )}
            </div>

            <div>
              <label htmlFor="posponer-nota" className={UI.label}>
                Nota <span className="text-slate-600 font-normal">(opcional)</span>
              </label>
              <textarea
                id="posponer-nota"
                rows={3}
                maxLength={300}
                placeholder="Ej. Esperando respuesta del proveedor"
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
                aria-describedby="posponer-nota-contador"
                className={`${UI.input} ${CAMPO} resize-none ${FOCO}`}
              />
              <p id="posponer-nota-contador" className="text-xs text-slate-600 mt-1 text-right">
                {form.nota.length}/300<span className="sr-only"> caracteres</span>
              </p>
            </div>

            <div className={PIE_DIALOGO}>
              <button type="button" onClick={cerrar} className={`${UI.btnSecundario} ${FOCO} ${BTN_DIALOGO}`}>
                Cancelar
              </button>
              <button type="submit" className={`${UI.btnPrimario} ${FOCO} ${BTN_DIALOGO}`}>
                Posponer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

/* ============================ Campo de fecha ============================ */
// Siempre type="date" (antes cambiaba de tipo al enfocar y abría el selector solo, lo que desorienta
// a quien navega con teclado o lector de pantalla).
const DateField = ({ invalido = false, ...props }) => (
  <div className="relative">
    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
    <input type="date" {...props} className={`${invalido ? UI.inputError : UI.input} ${CAMPO} ${FECHA_IOS} pl-11 ${FOCO}`} />
  </div>
);

/* ===================== Modal de confirmación de eliminación (igual que en Progreso) ===================== */
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

    <div className={`${PIE_DIALOGO} mt-6`}>
      <button type="button" onClick={onCancelar} disabled={eliminando} data-autofocus className={`${UI.btnSecundario} ${FOCO} ${BTN_DIALOGO}`}>
        Cancelar
      </button>
      <button type="button" onClick={onConfirmar} disabled={eliminando} className={`${UI.btnPeligro} ${FOCO} ${BTN_DIALOGO}`}>
        <Trash2 className="w-4 h-4" aria-hidden="true" />
        {eliminando ? 'Eliminando...' : 'Eliminar'}
      </button>
    </div>
  </Modal>
);

/* ================================ Página ================================ */
const GESTION_VACIA = { descripcion: '', plazo: '', horas_estimadas: '' };
const MODAL_GESTION_CERRADO = { abierto: false, modo: 'crear', gestionId: null };

const DetalleEvento = () => {
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const hoyStr = fechaOffsetStr(0);

  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState(null);
  const [eventoSeleccionadoId, setEventoSeleccionadoId] = useState(urlId || 'todos');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const [modalGestion, setModalGestion] = useState(MODAL_GESTION_CERRADO);
  const [formGestion, setFormGestion] = useState(GESTION_VACIA);
  const [errGestion, setErrGestion] = useState(SIN_ERROR);
  const [modalEvento, setModalEvento] = useState(false);
  const [formEvento, setFormEvento] = useState({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
  const [errEvento, setErrEvento] = useState(SIN_ERROR);

  const enVuelo = useRef(0);
  const timerMensaje = useRef(null);
  const [gestionAEliminar, setGestionAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const mostrarMensaje = (tipo, texto) => {
    clearTimeout(timerMensaje.current);
    setMensaje({ tipo, texto });
    timerMensaje.current = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };
  useEffect(() => () => clearTimeout(timerMensaje.current), []);

  const handleSesionExpirada = () => {
    authService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  // Si hay un diálogo abierto, el error se muestra dentro de él (el aviso de página quedaría detrás del fondo)
  const manejarError = (err, setErr) => {
    if (err.sesionExpirada) return handleSesionExpirada();
    if (setErr) setErr({ campo: 'general', texto: err.message });
    else mostrarMensaje('error', err.message);
  };

  const fallarEvento = (campo, texto) => {
    setErrEvento({ campo, texto });
    document.getElementById(`evento-${campo}`)?.focus();
  };

  const fallarGestion = (campo, texto) => {
    setErrGestion({ campo, texto });
    if (campo !== 'general') document.getElementById(`gestion-${campo}`)?.focus();
  };

  const cargar = async (silencioso = false) => {
    try {
      if (!silencioso) {
        setCargando(true);
        setError(null);
      }
      let data;
      try {
        data = await request('/eventos/');
      } catch (err) {
        if (err.sesionExpirada) throw err;
        await new Promise((r) => setTimeout(r, silencioso ? 500 : 2000)); // un reintento (servidor frío)
        data = await request('/eventos/');
      }
      if (silencioso && enVuelo.current > 0) return;
      setEventos(Array.isArray(data) ? data : []);
      setCargado(true);
    } catch (err) {
      if (err.sesionExpirada) return handleSesionExpirada();
      console.error('Error al obtener eventos:', err);
      if (!silencioso) setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setEventoSeleccionadoId(urlId || 'todos');
  }, [urlId]);

  const eventoActivo = eventoSeleccionadoId !== 'todos' ? eventos.find((e) => String(e.id) === String(eventoSeleccionadoId)) : null;
  const seleccion = eventoActivo ? eventoSeleccionadoId : 'todos';

  const aplicarCambio = (gestionId, cambios) =>
    setEventos((prev) =>
      prev.map((ev) => {
        const mapear = (lista) => (Array.isArray(lista) ? lista.map((g) => (g.id === gestionId ? { ...g, ...cambios } : g)) : lista);
        return { ...ev, gestiones: mapear(ev.gestiones), gestiones_plan: mapear(ev.gestiones_plan) };
      })
    );

  // --- Registrar avance (Hecha / Pendiente / Pospuesta): optimista + PATCH a DRF ---
  const registrar = async (gestion, accion, datos = {}) => {
    const { cambios, body } = armarCambio(accion, datos);
    const anterior = Object.fromEntries(Object.keys(cambios).map((k) => [k, gestion[k]]));
    const evento = eventos.find((e) => gestionesDe(e).some((g) => g.id === gestion.id));

    enVuelo.current += 1;
    aplicarCambio(gestion.id, cambios);

    try {
      await request(`/gestiones/${gestion.id}/`, { method: 'PATCH', body });

      if (evento) {
        let nuevoEstado = null;
        if (accion === 'hecho' && !esCompletado(evento) && gestionesDe(evento).every((g) => g.id === gestion.id || g.completada)) {
          nuevoEstado = 'Completado';
        } else if (accion !== 'hecho' && esCompletado(evento)) {
          nuevoEstado = 'En preparación';
        }
        if (nuevoEstado) {
          try {
            await request(`/eventos/${evento.id}/`, { method: 'PATCH', body: { estado: nuevoEstado } });
            setEventos((prev) => prev.map((e) => (e.id === evento.id ? { ...e, estado: nuevoEstado } : e)));
          } catch (err) {
            console.error('No se pudo actualizar el estado del evento:', err);
          }
        }
      }

      enVuelo.current -= 1;
      if (enVuelo.current === 0) cargar(true);
      if (accion === 'hecho') mostrarMensaje('exito', `"${gestion.descripcion}" marcada como hecha.`);
      else if (accion === 'pendiente') mostrarMensaje('exito', `"${gestion.descripcion}" volvió a pendiente.`);
      else mostrarMensaje('exito', `Subtarea pospuesta al ${formatearFechaDisplay(datos.fecha)}.`);
      return { ok: true };
    } catch (err) {
      enVuelo.current -= 1;
      aplicarCambio(gestion.id, anterior);
      if (err.sesionExpirada) handleSesionExpirada();
      else mostrarMensaje('error', `No se pudo actualizar "${gestion.descripcion}". Inténtalo de nuevo.`);
      return { ok: false };
    }
  };

  // --- Editar evento ---
  const handleAbrirEditarEvento = () => {
    if (!eventoActivo) return;
    setFormEvento({
      nombre: eventoActivo.nombre || '',
      tipo: eventoActivo.tipo || eventoActivo.categoria || '',
      fecha: limpiarFecha(eventoActivo.fecha),
      limite_diario_horas: eventoActivo.limite_diario_horas || ''
    });
    setErrEvento(SIN_ERROR);
    setModalEvento(true);
  };

  const handleGuardarEvento = async (e) => {
    e.preventDefault();
    const nuevoLimite = parseFloat(formEvento.limite_diario_horas);
    const horasUsadas = sumarHoras(gestionesDe(eventoActivo));
    const fechaNueva = limpiarFecha(formEvento.fecha);

    // Validación en el orden visual de los campos
    if (!formEvento.nombre.trim()) return fallarEvento('nombre', 'Escribe el nombre del evento.');
    if (!fechaNueva) return fallarEvento('fecha', 'Selecciona la fecha límite del evento.');
    if (fechaNueva < hoyStr) return fallarEvento('fecha', 'La fecha no puede ser anterior a hoy. Elige hoy o una fecha futura.');
    if (isNaN(nuevoLimite) || nuevoLimite < 1 || nuevoLimite > 24) {
      return fallarEvento('limite', 'Ingresa un límite de horas entre 1 y 24.');
    }
    if (nuevoLimite < horasUsadas) {
      return fallarEvento(
        'limite',
        `No puedes bajar el límite a ${nuevoLimite} h porque tus subtareas ya suman ${horasUsadas} h. Reduce las horas de las subtareas o elimina alguna, o deja el límite en ${horasUsadas} h o más.`
      );
    }

    const cambioFecha = fechaNueva !== limpiarFecha(eventoActivo?.fecha);

    try {
      await request(`/eventos/${eventoActivo.id}/`, {
        method: 'PATCH',
        body: {
          nombre: formEvento.nombre.trim(),
          tipo: formEvento.tipo,
          fecha: fechaNueva,
          limite_diario_horas: nuevoLimite,
          forzar_sobrecarga: true
        }
      });

      if (cambioFecha) {
        const errores = [];
        for (const sub of gestionesDe(eventoActivo)) {
          try {
            await request(`/gestiones/${sub.id}/?forzar_sobrecarga=true`, {
              method: 'PATCH',
              body: {
                plazo: fechaNueva,
                estado: 'pospuesto',
                nota_pospuesto: 'Pospuesto por cambio de fecha del evento',
                pospuesto: true,
                forzar_sobrecarga: true,
                forzar: true
              }
            });
          } catch (err) {
            if (err.sesionExpirada) throw err;
            errores.push(
              err.status === 409
                ? `"${sub.descripcion}" excede el límite de horas en esa fecha`
                : `"${sub.descripcion}": ${err.message || 'Error al actualizar'}`
            );
          }
        }
        if (errores.length > 0) {
          mostrarMensaje('error', `Evento guardado, pero falló en subtareas: ${errores.join(', ')}`);
          setModalEvento(false);
          return cargar(true);
        }
      }

      mostrarMensaje('exito', '¡Evento y subtareas actualizados con éxito!');
      setModalEvento(false);
      await cargar(true);
    } catch (err) {
      manejarError(err, setErrEvento);
    }
  };

  // --- Crear / editar subtarea ---
  const handleAbrirCrear = () => {
    setFormGestion(GESTION_VACIA);
    setErrGestion(SIN_ERROR);
    setModalGestion({ abierto: true, modo: 'crear', gestionId: null });
  };

  const handleAbrirEditar = (gestion) => {
    setFormGestion({
      descripcion: gestion.descripcion,
      plazo: limpiarFecha(gestion.plazo),
      horas_estimadas: gestion.horas_estimadas ? String(gestion.horas_estimadas) : ''
    });
    setErrGestion(SIN_ERROR);
    setModalGestion({ abierto: true, modo: 'editar', gestionId: gestion.id });
  };

  const handleGuardarGestion = async (e) => {
    e.preventDefault();
    const fechaEvento = limpiarFecha(eventoActivo?.fecha);
    const plazoFinal = formGestion.plazo || fechaEvento;
    const nuevasHoras = parseFloat(formGestion.horas_estimadas);

    // Validación en el orden visual de los campos
    if (!formGestion.descripcion.trim()) return fallarGestion('descripcion', 'Escribe el nombre de la subtarea.');
    if (!plazoFinal) return fallarGestion('general', 'El evento activo no tiene una fecha definida.');
    if (formGestion.plazo && formGestion.plazo < hoyStr) return fallarGestion('plazo', 'El plazo no puede ser anterior a hoy.');
    if (formGestion.plazo && fechaEvento && formGestion.plazo > fechaEvento) {
      return fallarGestion('plazo', `El plazo no puede ser posterior a la fecha límite del evento (${formatearFechaDisplay(fechaEvento)}).`);
    }
    if (isNaN(nuevasHoras) || nuevasHoras <= 0 || nuevasHoras > 24) {
      return fallarGestion('horas', 'Las horas estimadas deben ser un número mayor que 0 y de máximo 24.');
    }

    const limiteEvento = parseFloat(eventoActivo?.limite_diario_horas);
    if (!isNaN(limiteEvento) && limiteEvento > 0) {
      const horasExistentes = sumarHoras(gestionesDe(eventoActivo), modalGestion.modo === 'editar' ? modalGestion.gestionId : null);
      const total = horasExistentes + nuevasHoras;
      if (total > limiteEvento) {
        return fallarGestion(
          'horas',
          `No se puede guardar: las subtareas sumarían ${total} h y el límite del evento es ${limiteEvento} h. Te quedan ${Math.max(limiteEvento - horasExistentes, 0)} h disponibles. Reduce las horas de esta subtarea o aumenta el límite del evento.`
        );
      }
    }

    try {
      if (modalGestion.modo === 'crear') {
        await request('/gestiones/', {
          method: 'POST',
          body: {
            descripcion: formGestion.descripcion.trim(),
            plazo: plazoFinal,
            horas_estimadas: nuevasHoras,
            completada: false,
            evento: parseInt(eventoActivo.id, 10)
          }
        });
        mostrarMensaje('exito', 'Subtarea añadida con éxito.');
      } else {
        await request(`/gestiones/${modalGestion.gestionId}/`, {
          method: 'PATCH',
          body: { descripcion: formGestion.descripcion.trim(), plazo: plazoFinal, horas_estimadas: nuevasHoras, pospuesto: false }
        });
        mostrarMensaje('exito', 'Subtarea actualizada correctamente.');
      }
      setModalGestion(MODAL_GESTION_CERRADO);
      await cargar(true);
    } catch (err) {
      manejarError(err, setErrGestion);
    }
  };

  const confirmarEliminarGestion = async () => {
    if (!gestionAEliminar) return;
    setEliminando(true);
    try {
      await request(`/gestiones/${gestionAEliminar.id}/`, { method: 'DELETE' });
      setGestionAEliminar(null);
      mostrarMensaje('exito', 'Subtarea eliminada.');
      await cargar(true);
    } catch (err) {
      setGestionAEliminar(null);
      manejarError(err);
    } finally {
      setEliminando(false);
    }
  };

  const handleIrACrear = () => navigate('/crear');

  /* --------------------------- Estados de pantalla --------------------------- */
  if (cargando && !cargado) {
    return (
      <div className={UI.pagina}>
        <div role="status" aria-live="polite">
          <PantallaCarga
            icono={CalendarClock}
            titulo="Cargando detalles de eventos"
            texto="Organizamos la información. Tomará solo un momento."
          />
        </div>
      </div>
    );
  }

  // Error de conexión: franja compacta con borde izquierdo rojo
  if (!cargado) {
    return (
      <div className={`${UI.pagina} min-w-0 max-w-full overflow-x-hidden`}>
        <button type="button" onClick={() => navigate('/hoy')} className={`inline-flex items-center gap-1.5 w-fit ${UI.btnEnlace} ${FOCO} ${TACTIL}`}>
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a Hoy
        </button>

        <EncabezadoPagina titulo="Detalle de eventos" />

        <div
          role="alert"
          className="bg-white border border-slate-200 border-l-4 border-l-red-600 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 min-w-0"
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900">No pudimos cargar tus eventos</h2>
              <p className="text-sm text-slate-600 mt-0.5 break-words">
                {error || 'Revisa tu conexión e inténtalo de nuevo.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => cargar()}
            className={`${UI.btnSecundario} ${FOCO} w-full sm:w-auto justify-center flex-shrink-0 ${TACTIL}`}
          >
            <RefreshCw className="w-4 h-4 text-purple-700" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Sin eventos (no es un error): vista previa "fantasma" + franja con la acción
  if (eventos.length === 0) {
    return (
      <div className={`${UI.pagina} min-w-0 max-w-full overflow-x-hidden`}>
        <button type="button" onClick={() => navigate('/hoy')} className={`inline-flex items-center gap-1.5 w-fit ${UI.btnEnlace} ${FOCO} ${TACTIL}`}>
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a Hoy
        </button>

        <EncabezadoPagina titulo="Detalle de eventos" />

        <section aria-labelledby="sin-eventos-titulo" className="space-y-4 min-w-0">
          {/* Filas de ejemplo, solo decorativas */}
          <div aria-hidden="true" className="space-y-3">
            {[60, 25].map((avance) => (
              <div
                key={avance}
                className="bg-white/60 border-2 border-dashed border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-70"
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="h-3.5 w-40 max-w-full rounded-full bg-slate-200" />
                  <div className="h-2.5 w-56 max-w-full rounded-full bg-slate-100" />
                </div>
                <div className="h-2 w-full md:w-52 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-purple-200" style={{ width: `${avance}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 border-l-4 border-l-[#7E22CE] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 min-w-0">
            <div className="min-w-0">
              <h2 id="sin-eventos-titulo" className="text-sm font-extrabold text-slate-900">
                Aquí aparecerán tus eventos
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Crea el primero y podrás ver sus subtareas, fechas límite y progreso.
              </p>
            </div>

            <button
              type="button"
              onClick={handleIrACrear}
              className={`${UI.btnPrimario} ${FOCO} w-full sm:w-auto justify-center flex-shrink-0 ${TACTIL}`}
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Crear un evento
            </button>
          </div>
        </section>
      </div>
    );
  }

  const gestionesEv = gestionesDe(eventoActivo);
  const progreso = calcularProgreso(gestionesEv);

  // La URL pedía un evento que no existe: se avisa en vez de mostrar la lista general sin explicación
  const idNoEncontrado = Boolean(urlId) && eventoSeleccionadoId === urlId && !eventoActivo;

  const limiteActual = parseFloat(eventoActivo?.limite_diario_horas) || 0;
  const horasOtras = sumarHoras(gestionesEv, modalGestion.modo === 'editar' ? modalGestion.gestionId : null);
  const horasNuevas = parseFloat(formGestion.horas_estimadas) || 0;
  const excedeSubtarea = limiteActual > 0 && horasOtras + horasNuevas > limiteActual;

  const horasSubtareasTotal = sumarHoras(gestionesEv);
  const nuevoLimiteForm = parseFloat(formEvento.limite_diario_horas);
  const limiteMuyBajo = !isNaN(nuevoLimiteForm) && nuevoLimiteForm < horasSubtareasTotal;

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

      <button type="button" onClick={() => navigate('/hoy')} className={`inline-flex items-center gap-1.5 w-fit md:-mb-2 ${UI.btnEnlace} ${FOCO} ${TACTIL}`}>
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a Hoy
      </button>

      {idNoEncontrado && (
        <div role="alert" className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm flex items-start sm:items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="min-w-0">No encontramos el evento solicitado. Puede que haya sido eliminado. Elige otro evento de la lista.</span>
        </div>
      )}

      <EncabezadoPagina
        titulo={seleccion === 'todos' ? 'Lista general de eventos' : eventoActivo.nombre}
        subtitulo={seleccion === 'todos' ? 'Selecciona cualquier evento para ver sus subtareas y detalles completos.' : undefined}
      >
        {/* Selector y botón de editar: apilados a ancho completo en móvil, en fila desde sm */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
          <div className={`${UI.filtro} w-full sm:w-auto min-w-0`}>
            <SlidersHorizontal className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
            <select
              value={seleccion}
              onChange={(e) => setEventoSeleccionadoId(e.target.value)}
              aria-label="Seleccionar evento"
              className={`${UI.filtroSelect} ${FOCO} w-full min-w-0 max-w-full ${CAMPO} ${TACTIL}`}
            >
              <option value="todos">Todos los eventos</option>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          {eventoActivo && (
            <button type="button" onClick={handleAbrirEditarEvento} className={`${UI.btnSecundarioSm} ${FOCO} w-full sm:w-auto justify-center ${TACTIL}`}>
              <Edit3 className="w-4 h-4 text-purple-700" aria-hidden="true" /> Editar evento
            </button>
          )}
        </div>
      </EncabezadoPagina>

      {seleccion === 'todos' ? (
        <>
          <h2 id="foco-fallback" tabIndex={-1} className="sr-only focus:outline-none">Eventos</h2>
          <ul className="grid grid-cols-1 gap-3 sm:gap-4">
            {eventos.map((ev) => {
              const p = calcularProgreso(gestionesDe(ev));
              return (
                // El clic en la tarjeta es solo una comodidad para el mouse; el control accesible es el botón "Ver detalle"
                <li
                  key={ev.id}
                  onClick={() => setEventoSeleccionadoId(String(ev.id))}
                  className={`${UI.tarjeta} hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 group min-w-0`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#7E22CE] transition break-words min-w-0">{ev.nombre}</h3>
                      <EtiquetaPospuestas cantidad={p.pospuestas} />
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      {ev.tipo || ev.categoria || 'Evento'} • Límite: {ev.fecha ? formatearFechaDisplay(ev.fecha) : 'Sin fecha'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 md:justify-end min-w-0">
                    <BarraProgreso completadas={p.completadas} total={p.total} titulo={`Progreso de ${ev.nombre}`} ocultarTitulo tamano="sm" className="w-full sm:flex-1 md:flex-none md:w-52" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventoSeleccionadoId(String(ev.id));
                      }}
                      aria-label={`Ver detalle de ${ev.nombre}`}
                      className={`inline-flex items-center justify-center gap-1 text-xs font-bold text-[#7E22CE] bg-purple-50 group-hover:bg-[#7E22CE] group-hover:text-white px-3.5 py-2 rounded-xl transition whitespace-nowrap cursor-pointer w-full sm:w-auto ${TACTIL} ${FOCO}`}
                    >
                      Ver detalle <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="px-3 py-1 bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] rounded-full text-xs font-bold">
              <span className="sr-only">Estado: </span>{eventoActivo.estado || 'En preparación'}
            </span>
            <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-bold">
              <span className="sr-only">Tipo: </span>{eventoActivo.tipo || eventoActivo.categoria || 'Evento'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
              <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> Límite: {eventoActivo.fecha ? formatearFechaDisplay(eventoActivo.fecha) : 'Sin fecha'}
            </span>
            {eventoActivo.limite_diario_horas && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-purple-700" aria-hidden="true" /> Máx. {eventoActivo.limite_diario_horas} h (total)
              </span>
            )}
          </div>

          {/* Se actualiza al instante al marcar Hecha o Pospuesta */}
          <div className={UI.tarjeta}>
            <BarraProgreso completadas={progreso.completadas} total={progreso.total} pospuestas={progreso.pospuestas} titulo="Progreso del evento" tamano="lg" />
          </div>

          <section aria-labelledby="foco-fallback" className={`${UI.tarjeta} space-y-4 sm:space-y-5 min-w-0`}>
            <div className="flex justify-between items-center gap-3 flex-wrap pb-4 border-b border-slate-100">
              <h2 id="foco-fallback" tabIndex={-1} className={`${UI.h2} focus:outline-none`}>Subtareas</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 hidden sm:inline">{progreso.total} subtareas</span>
                <button type="button" onClick={handleAbrirCrear} className={`${UI.btnAgregarSm} ${FOCO} ${TACTIL}`}>
                  <Plus className="w-4 h-4" aria-hidden="true" /> Agregar subtarea
                </button>
              </div>
            </div>

            {gestionesEv.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">No hay subtareas creadas para este evento. Usa el botón "Agregar subtarea".</p>
            ) : (
              <ul className="space-y-3">
                {gestionesEv.map((sub) => {
                  const pospuesta = esPospuesta(sub);
                  const mostrarNota = pospuesta && sub.nota_pospuesto && sub.nota_pospuesto !== NOTA_POR_DEFECTO;
                  return (
                    <li
                      key={sub.id}
                      className={`p-3 sm:p-4 border rounded-xl transition flex flex-col gap-3 min-w-0 ${
                        pospuesta
                          ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 border-l-4 border-l-amber-500'
                          : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                          {/* Sin truncar: el texto completo debe poder leerse con zoom o en pantallas angostas */}
                          <span className={`text-sm font-semibold break-words min-w-0 ${sub.completada ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {sub.descripcion}
                          </span>
                          {sub.completada && <span className="sr-only">(completada)</span>}
                          {pospuesta && <EtiquetaPospuestas texto="Pospuesta" />}
                        </div>

                        <div className="flex items-center gap-x-3 gap-y-2 sm:gap-x-4 flex-wrap lg:justify-end">
                          {sub.plazo && (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-medium ${
                                pospuesta ? 'text-amber-800 font-semibold' : 'text-slate-600'
                              }`}
                            >
                              <CalendarClock className={`w-3.5 h-3.5 flex-shrink-0 ${pospuesta ? 'text-amber-700' : 'text-slate-500'}`} aria-hidden="true" />
                              {pospuesta ? 'Nueva fecha: ' : 'Plazo: '}
                              {formatearFechaDisplay(sub.plazo)}
                            </span>
                          )}
                          {sub.horas_estimadas !== undefined && sub.horas_estimadas !== null && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" aria-hidden="true" /> {sub.horas_estimadas} h
                              <span className="sr-only"> estimadas</span>
                            </span>
                          )}

                          <RegistroAvance
                            gestion={sub}
                            eventoFecha={eventoActivo.fecha}
                            onRegistrar={(accion, datos) => registrar(sub, accion, datos)}
                          />

                          {/* En móvil Editar/Eliminar quedan en su propia fila, alineados a la derecha */}
                          <div className="flex items-center gap-1 ml-auto sm:ml-0 sm:border-l border-slate-200 sm:pl-2">
                            <button
                              type="button"
                              onClick={() => handleAbrirEditar(sub)}
                              className={`p-2.5 md:p-1.5 text-slate-600 hover:text-purple-700 rounded-lg transition cursor-pointer ${FOCO}`}
                              aria-label={`Editar subtarea: ${sub.descripcion}`}
                              aria-haspopup="dialog"
                            >
                              <Edit3 className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setGestionAEliminar(sub)}
                              className={`p-2.5 md:p-1.5 text-slate-600 hover:text-red-700 rounded-lg transition cursor-pointer ${FOCO}`}
                              aria-label={`Eliminar subtarea: ${sub.descripcion}`}
                              aria-haspopup="dialog"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {mostrarNota && (
                        <div className="flex items-start gap-2 text-xs text-amber-900 bg-white/70 border border-amber-200 rounded-lg px-3 py-2 w-full">
                          <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-700" aria-hidden="true" />
                          <p className="leading-relaxed break-words min-w-0">
                            <span className="font-semibold">Motivo:</span> {sub.nota_pospuesto}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {/* MODAL: EDITAR EVENTO */}
      {modalEvento && (
        <Modal onCerrar={() => setModalEvento(false)} labelledBy="titulo-editar-evento" describedBy="desc-editar-evento" className={CLASE_MODAL}>
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2 id="titulo-editar-evento" className={UI.modalTitulo}>Editar evento</h2>
              <p id="desc-editar-evento" className={UI.modalSubtitulo}>Actualiza los datos generales y la capacidad diaria de trabajo.</p>
            </div>
            <BotonCerrar onClick={() => setModalEvento(false)} />
          </div>

          <form onSubmit={handleGuardarEvento} noValidate className="mt-5 sm:mt-6 space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="evento-nombre" className={UI.label}>
                Nombre del evento <Asterisco />
              </label>
              <input
                type="text"
                data-autofocus
                aria-required="true"
                autoComplete="off"
                className={`${errEvento.campo === 'nombre' ? UI.inputError : UI.input} ${CAMPO} ${FOCO}`}
                value={formEvento.nombre}
                {...attrsCampo(errEvento, 'nombre', 'evento-nombre')}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, nombre: e.target.value });
                  setErrEvento(SIN_ERROR);
                }}
              />
              <MensajeCampo id="evento-nombre-error" texto={errEvento.campo === 'nombre' ? errEvento.texto : ''} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="evento-tipo" className={UI.label}>Tipo de evento</label>
                <select
                  className={`${UI.input} ${CAMPO} cursor-pointer ${FOCO}`}
                  value={formEvento.tipo}
                  {...attrsCampo(errEvento, 'tipo', 'evento-tipo')}
                  onChange={(e) => setFormEvento({ ...formEvento, tipo: e.target.value })}
                >
                  <option value="">Selecciona</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Social">Social</option>
                  <option value="Academico">Académico</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="min-w-0">
                <label htmlFor="evento-fecha" className={UI.label}>
                  Fecha límite <Asterisco />
                </label>
                <DateField
                  min={hoyStr}
                  aria-required="true"
                  invalido={errEvento.campo === 'fecha'}
                  value={formEvento.fecha}
                  {...attrsCampo(errEvento, 'fecha', 'evento-fecha')}
                  onChange={(e) => {
                    setFormEvento({ ...formEvento, fecha: e.target.value });
                    setErrEvento(SIN_ERROR);
                  }}
                />
                <MensajeCampo id="evento-fecha-error" texto={errEvento.campo === 'fecha' ? errEvento.texto : ''} />
              </div>
            </div>

            <div>
              <label htmlFor="evento-limite" className={UI.label}>
                Máximo de horas por día <Asterisco />
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  inputMode="decimal"
                  aria-required="true"
                  placeholder="Ej. 6"
                  className={`${limiteMuyBajo || errEvento.campo === 'limite' ? UI.inputError : UI.input} ${CAMPO} pl-11 pr-20 ${FOCO}`}
                  value={formEvento.limite_diario_horas}
                  {...attrsCampo(errEvento, 'limite', 'evento-limite', limiteMuyBajo ? 'evento-limite-aviso' : undefined)}
                  aria-invalid={limiteMuyBajo || errEvento.campo === 'limite' ? 'true' : undefined}
                  onChange={(e) => {
                    setFormEvento({ ...formEvento, limite_diario_horas: e.target.value });
                    setErrEvento(SIN_ERROR);
                  }}
                />
                <span aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 pointer-events-none">h/día</span>
              </div>
              <MensajeCampo id="evento-limite-error" texto={errEvento.campo === 'limite' ? errEvento.texto : ''} />
              {limiteMuyBajo && errEvento.campo !== 'limite' && (
                <p id="evento-limite-aviso" role="alert" className={`${UI.error} break-words`}>
                  Tus subtareas ya suman {horasSubtareasTotal} h. Reduce o elimina subtareas, o usa un límite de {horasSubtareasTotal} h o más.
                </p>
              )}
            </div>

            <MensajeCampo id="evento-general-error" texto={errEvento.campo === 'general' ? errEvento.texto : ''} />

            <div className={PIE_DIALOGO}>
              <button type="button" onClick={() => setModalEvento(false)} className={`${UI.btnSecundario} ${FOCO} ${BTN_DIALOGO}`}>
                Cancelar
              </button>
              <button type="submit" className={`${UI.btnPrimario} ${FOCO} ${BTN_DIALOGO}`}>
                Guardar cambios
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREAR / EDITAR SUBTAREA */}
      {modalGestion.abierto && (
        <Modal onCerrar={() => setModalGestion(MODAL_GESTION_CERRADO)} labelledBy="titulo-gestion" describedBy="desc-gestion" className={CLASE_MODAL}>
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2 id="titulo-gestion" className={UI.modalTitulo}>{modalGestion.modo === 'crear' ? 'Agregar subtarea' : 'Editar subtarea'}</h2>
              <p id="desc-gestion" className={UI.modalSubtitulo}>
                {modalGestion.modo === 'crear' ? 'Añade una nueva subtarea a este evento.' : 'Actualiza los datos de esta subtarea.'}
              </p>
            </div>
            <BotonCerrar onClick={() => setModalGestion(MODAL_GESTION_CERRADO)} />
          </div>

          <form onSubmit={handleGuardarGestion} noValidate className="mt-5 sm:mt-6 space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="gestion-descripcion" className={UI.label}>
                Nombre de la subtarea <Asterisco />
              </label>
              <input
                type="text"
                data-autofocus
                aria-required="true"
                autoComplete="off"
                placeholder="Ej. Confirmar servicio de catering"
                className={`${errGestion.campo === 'descripcion' ? UI.inputError : UI.input} ${CAMPO} ${FOCO}`}
                value={formGestion.descripcion}
                {...attrsCampo(errGestion, 'descripcion', 'gestion-descripcion')}
                onChange={(e) => {
                  setFormGestion({ ...formGestion, descripcion: e.target.value });
                  setErrGestion(SIN_ERROR);
                }}
              />
              <MensajeCampo id="gestion-descripcion-error" texto={errGestion.campo === 'descripcion' ? errGestion.texto : ''} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="gestion-plazo" className={UI.label}>Fecha</label>
                <DateField
                  min={hoyStr}
                  max={limpiarFecha(eventoActivo?.fecha) || undefined}
                  invalido={errGestion.campo === 'plazo'}
                  value={formGestion.plazo}
                  {...attrsCampo(errGestion, 'plazo', 'gestion-plazo')}
                  onChange={(e) => {
                    setFormGestion({ ...formGestion, plazo: e.target.value });
                    setErrGestion(SIN_ERROR);
                  }}
                />
                <MensajeCampo id="gestion-plazo-error" texto={errGestion.campo === 'plazo' ? errGestion.texto : ''} />
              </div>

              <div className="min-w-0">
                <label htmlFor="gestion-horas" className={UI.label}>
                  Horas estimadas <Asterisco />
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    inputMode="decimal"
                    aria-required="true"
                    placeholder="Ej. 2.5"
                    className={`${excedeSubtarea || errGestion.campo === 'horas' ? UI.inputError : UI.input} ${CAMPO} pl-11 ${FOCO}`}
                    value={formGestion.horas_estimadas}
                    {...attrsCampo(errGestion, 'horas', 'gestion-horas', limiteActual > 0 ? 'gestion-horas-ayuda' : undefined)}
                    aria-invalid={excedeSubtarea || errGestion.campo === 'horas' ? 'true' : undefined}
                    onChange={(e) => {
                      setFormGestion({ ...formGestion, horas_estimadas: e.target.value });
                      setErrGestion(SIN_ERROR);
                    }}
                  />
                </div>
                <MensajeCampo id="gestion-horas-error" texto={errGestion.campo === 'horas' ? errGestion.texto : ''} />
              </div>
            </div>

            {limiteActual > 0 && (
              <p id="gestion-horas-ayuda" className={`text-xs font-medium break-words ${excedeSubtarea ? 'text-red-700' : 'text-slate-600'}`}>
                {excedeSubtarea
                  ? `Superas el límite: ${horasOtras + horasNuevas} h de ${limiteActual} h. Reduce las horas o aumenta el límite del evento.`
                  : `Disponibles: ${Math.max(limiteActual - horasOtras, 0)} h de ${limiteActual} h.`}
              </p>
            )}

            <MensajeCampo id="gestion-general-error" texto={errGestion.campo === 'general' ? errGestion.texto : ''} />

            <div className={PIE_DIALOGO}>
              <button type="button" onClick={() => setModalGestion(MODAL_GESTION_CERRADO)} className={`${UI.btnSecundario} ${FOCO} ${BTN_DIALOGO}`}>
                Cancelar
              </button>
              <button type="submit" className={`${UI.btnPrimario} ${FOCO} ${BTN_DIALOGO}`}>
                {modalGestion.modo === 'crear' ? (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" /> Agregar subtarea
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {gestionAEliminar && (
        <ModalConfirmarEliminar
          titulo="Eliminar subtarea"
          descripcion={`Vas a eliminar "${gestionAEliminar.descripcion}". Esta acción no se puede deshacer.`}
          eliminando={eliminando}
          onConfirmar={confirmarEliminarGestion}
          onCancelar={() => setGestionAEliminar(null)}
        />
      )}
    </div>
  );
};

export default DetalleEvento;