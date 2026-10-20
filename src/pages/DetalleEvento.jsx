import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Plus,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const limpiarFecha = (f) => (f || '').toString().split('T')[0].split(' ')[0];

const fechaOffsetStr = (dias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatearFechaDisplay = (valor) => {
  const p = limpiarFecha(valor).split('-');
  return p.length < 3 ? limpiarFecha(valor) : `${p[2]}/${p[1]}/${p[0]}`;
};

const formatearFechaCorta = (valor) => {
  const [y, m, d] = limpiarFecha(valor).split('-').map(Number);
  if (!y || !m || !d) return limpiarFecha(valor);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
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

/* ========================= Barra de progreso ========================= */
const ALTURAS = { sm: 'h-2', md: 'h-2.5', lg: 'h-3' };

const BarraProgreso = ({ completadas, total, pospuestas = 0, titulo, tamano = 'md', ocultarTitulo = false, className = '' }) => {
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
        <span className={ocultarTitulo ? 'sr-only' : ''}>{titulo}</span>
        <span className="text-slate-900 font-extrabold ml-auto">
          {completadas}/{total} subtareas <span className="text-purple-700 ml-1">{porcentaje}%</span>
        </span>
      </div>
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
        <div className="flex justify-end pt-1">
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
            <CalendarClock className="w-3 h-3 text-amber-600" />
            {pospuestas} {pospuestas === 1 ? 'pospuesta' : 'pospuestas'}
          </span>
        </div>
      )}
    </div>
  );
};

/* ===================== Control Hecha / Posponer ===================== */
const RegistroAvance = ({ gestion, eventoFecha, onRegistrar }) => {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ fecha: '', nota: '' });
  const [errorFecha, setErrorFecha] = useState('');
  const [guardando, setGuardando] = useState(false);

  const completada = Boolean(gestion.completada);
  const minFecha = fechaOffsetStr(1);
  const limiteEvento = limpiarFecha(eventoFecha);
  const maxFecha = limiteEvento && limiteEvento >= minFecha ? limiteEvento : undefined;

  const cerrar = () => {
    setAbierto(false);
    setErrorFecha('');
  };

  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto]);

  const ejecutar = async (accion, datos) => {
    setGuardando(true);
    try {
      return await onRegistrar(accion, datos);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarPosponer = async (e) => {
    e.preventDefault();
    if (!form.fecha) return setErrorFecha('Selecciona la nueva fecha.');
    if (form.fecha < minFecha) return setErrorFecha('La nueva fecha debe ser posterior a hoy.');
    if (maxFecha && form.fecha > maxFecha) return setErrorFecha('La fecha no puede superar la fecha límite del evento.');
    cerrar();
    await ejecutar('pospuesto', { fecha: form.fecha, nota: form.nota });
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => ejecutar(completada ? 'pendiente' : 'hecho')}
          disabled={guardando}
          aria-pressed={completada}
          title={completada ? 'Marcar como pendiente' : 'Marcar como hecha'}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait ${
            completada ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-purple-800 hover:bg-purple-900 text-white'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
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
            title="Posponer subtarea"
            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition cursor-pointer disabled:opacity-60"
          >
            Posponer
          </button>
        )}
      </div>

      {abierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-posponer" className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 id="titulo-posponer" className="text-2xl font-semibold text-[#1e2b4d]">Posponer subtarea</h3>
                  <p className="text-sm text-slate-500 mt-1 truncate">{gestion.descripcion}</p>
                </div>
              </div>
              <button type="button" onClick={cerrar} className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmarPosponer} className="mt-6 space-y-5">
              <div>
                <label htmlFor="posponer-fecha" className="block text-sm font-medium text-slate-700 mb-2">
                  Nueva fecha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="posponer-fecha"
                    type="date"
                    min={minFecha}
                    max={maxFecha}
                    autoFocus
                    value={form.fecha}
                    onChange={(e) => {
                      setForm({ ...form, fecha: e.target.value });
                      setErrorFecha('');
                    }}
                    className={`w-full pl-11 pr-4 py-3.5 border rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 transition ${
                      errorFecha ? 'bg-red-50/70 border-red-400 focus:ring-red-400' : 'bg-white border-slate-200 focus:ring-amber-500 focus:border-amber-500'
                    }`}
                  />
                </div>
                {errorFecha && <p className="text-xs text-red-600 mt-2 font-medium">{errorFecha}</p>}
                {maxFecha && !errorFecha && <p className="text-[11px] text-slate-400 mt-1.5">Puedes elegir hasta la fecha límite del evento.</p>}
              </div>

              <div>
                <label htmlFor="posponer-nota" className="block text-sm font-medium text-slate-700 mb-2">
                  Nota <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="posponer-nota"
                  rows={3}
                  maxLength={300}
                  placeholder="Ej. Esperando respuesta del proveedor"
                  value={form.nota}
                  onChange={(e) => setForm({ ...form, nota: e.target.value })}
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1 text-right">{form.nota.length}/300</p>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={cerrar} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer">
                  Posponer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

/* ============================ Campo de fecha ============================ */
const DateField = ({ value, onChange, min, max, placeholder, required }) => {
  const [enfocado, setEnfocado] = useState(false);
  const ref = useRef(null);

  return (
    <div className="relative">
      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        ref={ref}
        type={enfocado || value ? 'date' : 'text'}
        placeholder={placeholder}
        min={min}
        max={max}
        required={required}
        value={value}
        onChange={onChange}
        onFocus={() => {
          setEnfocado(true);
          setTimeout(() => {
            try {
              ref.current?.showPicker?.();
            } catch {
              /* noop */
            }
          }, 0);
        }}
        onBlur={() => setEnfocado(false)}
        className="w-full pl-11 pr-4 py-3.5 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition [&::-webkit-calendar-picker-indicator]:hidden bg-white border-slate-200 focus:ring-purple-600 focus:border-purple-600"
      />
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
  const [modalEvento, setModalEvento] = useState(false);
  const [formEvento, setFormEvento] = useState({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });

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

  const manejarError = (err) => {
    if (err.sesionExpirada) return handleSesionExpirada();
    mostrarMensaje('error', err.message);
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
      if (accion === 'pospuesto') mostrarMensaje('exito', `Subtarea pospuesta al ${formatearFechaCorta(datos.fecha)}.`);
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
    setModalEvento(true);
  };

  const handleGuardarEvento = async (e) => {
    e.preventDefault();
    const nuevoLimite = parseFloat(formEvento.limite_diario_horas);
    const horasUsadas = sumarHoras(gestionesDe(eventoActivo));

    if (isNaN(nuevoLimite) || nuevoLimite <= 0) return mostrarMensaje('error', 'Ingresa un límite de horas mayor a 0.');
    if (nuevoLimite < horasUsadas) {
      return mostrarMensaje(
        'error',
        `No puedes bajar el límite a ${nuevoLimite} h porque tus subtareas ya suman ${horasUsadas} h. Reduce las horas de las subtareas o elimina alguna, o deja el límite en ${horasUsadas} h o más.`
      );
    }

    const fechaNueva = limpiarFecha(formEvento.fecha);
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
      manejarError(err);
    }
  };

  // --- Crear / editar subtarea ---
  const handleAbrirCrear = () => {
    setFormGestion(GESTION_VACIA);
    setModalGestion({ abierto: true, modo: 'crear', gestionId: null });
  };

  const handleAbrirEditar = (gestion) => {
    setFormGestion({
      descripcion: gestion.descripcion,
      plazo: limpiarFecha(gestion.plazo),
      horas_estimadas: gestion.horas_estimadas ? String(gestion.horas_estimadas) : ''
    });
    setModalGestion({ abierto: true, modo: 'editar', gestionId: gestion.id });
  };

  const handleGuardarGestion = async (e) => {
    e.preventDefault();
    const fechaEvento = limpiarFecha(eventoActivo?.fecha);
    const plazoFinal = formGestion.plazo || fechaEvento;
    const nuevasHoras = parseFloat(formGestion.horas_estimadas);

    if (!plazoFinal) return mostrarMensaje('error', 'El evento activo no tiene una fecha definida.');
    if (formGestion.plazo && formGestion.plazo < hoyStr) return mostrarMensaje('error', 'El plazo no puede ser anterior a hoy.');
    if (formGestion.plazo && fechaEvento && formGestion.plazo > fechaEvento) {
      return mostrarMensaje('error', `El plazo no puede ser posterior a la fecha límite del evento (${formatearFechaDisplay(fechaEvento)}).`);
    }
    if (!formGestion.descripcion.trim()) return mostrarMensaje('error', 'La descripción de la subtarea es obligatoria.');
    if (isNaN(nuevasHoras) || nuevasHoras <= 0) return mostrarMensaje('error', 'Las horas estimadas deben ser un número mayor que cero.');

    const limiteEvento = parseFloat(eventoActivo?.limite_diario_horas);
    if (!isNaN(limiteEvento) && limiteEvento > 0) {
      const horasExistentes = sumarHoras(gestionesDe(eventoActivo), modalGestion.modo === 'editar' ? modalGestion.gestionId : null);
      const total = horasExistentes + nuevasHoras;
      if (total > limiteEvento) {
        return mostrarMensaje(
          'error',
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
      manejarError(err);
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

  /* --------------------------- Estados de pantalla --------------------------- */
  if (cargando && !cargado) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 text-left bg-slate-50/50 min-h-screen">
        <div className="py-12 px-4 flex flex-col items-center justify-center space-y-8" role="status" aria-live="polite">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <CalendarClock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Cargando detalles de eventos</h3>
              <p className="text-sm text-slate-500 max-w-sm">Organizamos la información. Tomará solo un momento.</p>
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
      </div>
    );
  }

  if (!cargado || eventos.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6 font-sans text-slate-800 text-left">
        <button onClick={() => navigate('/hoy')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Volver a Hoy
        </button>
        <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'No hay eventos disponibles para mostrar. Crea un evento nuevo.'}</span>
        </div>
        <button onClick={() => cargar()} className="px-5 py-2.5 bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer">
          Reintentar cargar
        </button>
      </div>
    );
  }

  const gestionesEv = gestionesDe(eventoActivo);
  const progreso = calcularProgreso(gestionesEv);

  const limiteActual = parseFloat(eventoActivo?.limite_diario_horas) || 0;
  const horasOtras = sumarHoras(gestionesEv, modalGestion.modo === 'editar' ? modalGestion.gestionId : null);
  const horasNuevas = parseFloat(formGestion.horas_estimadas) || 0;
  const excedeSubtarea = limiteActual > 0 && horasOtras + horasNuevas > limiteActual;

  const horasSubtareasTotal = sumarHoras(gestionesEv);
  const nuevoLimiteForm = parseFloat(formEvento.limite_diario_horas);
  const limiteMuyBajo = !isNaN(nuevoLimiteForm) && nuevoLimiteForm < horasSubtareasTotal;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 text-left bg-slate-50/50 min-h-screen space-y-6">
      {mensaje.texto && (
        <div
          role="alert"
          className={`fixed top-5 right-5 z-[60] max-w-sm flex items-start gap-2.5 px-5 py-4 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
            mensaje.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {mensaje.tipo === 'exito' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button onClick={() => navigate('/hoy')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a Hoy
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-sm">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={seleccion}
              onChange={(e) => setEventoSeleccionadoId(e.target.value)}
              aria-label="Seleccionar evento"
              className="bg-transparent text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los eventos</option>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          {eventoActivo && (
            <button
              onClick={handleAbrirEditarEvento}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-800 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-purple-600" /> Editar evento
            </button>
          )}
        </div>
      </div>

      {seleccion === 'todos' ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Lista general de eventos</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Selecciona cualquier evento para ver sus subtareas y detalles completos.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2">
            {eventos.map((ev) => {
              const p = calcularProgreso(gestionesDe(ev));
              return (
                <div
                  key={ev.id}
                  onClick={() => setEventoSeleccionadoId(String(ev.id))}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#7E22CE] transition">{ev.nombre}</h3>
                      {p.pospuestas > 0 && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                          <CalendarClock className="w-3 h-3 text-amber-600" />
                          {p.pospuestas} {p.pospuestas === 1 ? 'pospuesta' : 'pospuestas'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {ev.tipo || ev.categoria || 'Evento'} • Límite: {ev.fecha ? formatearFechaDisplay(ev.fecha) : 'Sin fecha'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 justify-between sm:justify-end">
                    <BarraProgreso completadas={p.completadas} total={p.total} titulo={`Progreso de ${ev.nombre}`} ocultarTitulo tamano="sm" className="w-full sm:w-52" />
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#7E22CE] bg-purple-50 group-hover:bg-[#7E22CE] group-hover:text-white px-3.5 py-2 rounded-xl transition whitespace-nowrap">
                      Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{eventoActivo.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] rounded-full text-xs font-bold">{eventoActivo.estado || 'En preparación'}</span>
              <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-bold">{eventoActivo.tipo || eventoActivo.categoria || 'Evento'}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Límite: {eventoActivo.fecha ? formatearFechaDisplay(eventoActivo.fecha) : 'Sin fecha'}
              </span>
              {eventoActivo.limite_diario_horas && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-purple-600" /> Máx. {eventoActivo.limite_diario_horas} hrs (total)
                </span>
              )}
            </div>
          </div>

          {/* Se actualiza al instante al marcar Hecha o Pospuesta */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
            <BarraProgreso completadas={progreso.completadas} total={progreso.total} pospuestas={progreso.pospuestas} titulo="Progreso del evento" tamano="lg" />
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Subtareas</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">{progreso.total} subtareas</span>
                <button onClick={handleAbrirCrear} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 font-bold text-xs sm:text-sm rounded-xl transition shadow-sm cursor-pointer">
                  <Plus className="w-4 h-4" /> Agregar subtarea
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {gestionesEv.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No hay subtareas creadas para este evento. Haz clic en "+ Agregar subtarea".</p>
              ) : (
                gestionesEv.map((sub) => {
                  const pospuesta = esPospuesta(sub);
                  const mostrarNota = pospuesta && sub.nota_pospuesto && sub.nota_pospuesto !== NOTA_POR_DEFECTO;
                  return (
                    <div
                      key={sub.id}
                      className={`p-4 border rounded-xl transition flex flex-col gap-3 ${
                        pospuesta
                          ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 border-l-4 border-l-amber-400'
                          : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                          <span
                            title={sub.descripcion}
                            className={`text-sm font-semibold truncate ${sub.completada ? 'line-through text-slate-400' : 'text-slate-900'}`}
                          >
                            {sub.descripcion}
                          </span>
                          {pospuesta && (
                            <span className="shrink-0 inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                              <CalendarClock className="w-3 h-3" />
                              Pospuesta
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap lg:justify-end">
                          {sub.plazo && (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-medium ${
                                pospuesta ? 'text-amber-800 font-semibold' : 'text-slate-500'
                              }`}
                            >
                              <CalendarClock className={`w-3.5 h-3.5 ${pospuesta ? 'text-amber-600' : 'text-slate-400'}`} />
                              {pospuesta ? 'Nueva fecha: ' : ''}
                              {formatearFechaDisplay(sub.plazo)}
                            </span>
                          )}
                          {sub.horas_estimadas !== undefined && sub.horas_estimadas !== null && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> {sub.horas_estimadas} hrs
                            </span>
                          )}

                          <RegistroAvance
                            gestion={sub}
                            eventoFecha={eventoActivo.fecha}
                            onRegistrar={(accion, datos) => registrar(sub, accion, datos)}
                          />

                          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                            <button
                              onClick={() => handleAbrirEditar(sub)}
                              className="p-1.5 text-slate-400 hover:text-purple-700 rounded-lg transition cursor-pointer"
                              title="Editar subtarea"
                              aria-label="Editar subtarea"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setGestionAEliminar(sub)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                              title="Eliminar subtarea"
                              aria-label="Eliminar subtarea"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {mostrarNota && (
                        <div className="flex items-start gap-2 text-xs text-amber-900 bg-white/70 border border-amber-200 rounded-lg px-3 py-2 w-full">
                          <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                          <p className="leading-relaxed break-words">
                            <span className="font-semibold">Motivo:</span> {sub.nota_pospuesto}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL: EDITAR EVENTO */}
      {modalEvento && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-[#1e2b4d]">Editar evento</h3>
                <p className="text-sm text-slate-500 mt-1">Actualiza los datos generales y la capacidad diaria de trabajo.</p>
              </div>
              <button type="button" onClick={() => setModalEvento(false)} className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEvento} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del evento</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition"
                  value={formEvento.nombre}
                  onChange={(e) => setFormEvento({ ...formEvento, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de evento</label>
                  <select
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition cursor-pointer"
                    value={formEvento.tipo}
                    onChange={(e) => setFormEvento({ ...formEvento, tipo: e.target.value })}
                  >
                    <option value="">Selecciona</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Social">Social</option>
                    <option value="Academico">Académico</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha límite</label>
                  <DateField required min={hoyStr} placeholder="Ej. 20/09/2026" value={formEvento.fecha} onChange={(e) => setFormEvento({ ...formEvento, fecha: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Máximo de horas por día</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    required
                    placeholder="Ej. 6"
                    className={`w-full pl-11 pr-24 py-3.5 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                      limiteMuyBajo ? 'bg-red-50/70 border-red-400 focus:ring-red-400' : 'bg-white border-slate-200 focus:ring-purple-600 focus:border-purple-600'
                    }`}
                    value={formEvento.limite_diario_horas}
                    onChange={(e) => setFormEvento({ ...formEvento, limite_diario_horas: e.target.value })}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">horas/día</span>
                </div>
                {limiteMuyBajo && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    Tus subtareas ya suman {horasSubtareasTotal} h. Reduce o elimina subtareas, o usa un límite de {horasSubtareasTotal} h o más.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setModalEvento(false)} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR SUBTAREA */}
      {modalGestion.abierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-[#1e2b4d]">{modalGestion.modo === 'crear' ? 'Agregar subtarea' : 'Editar subtarea'}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {modalGestion.modo === 'crear' ? 'Añade una nueva subtarea a este evento.' : 'Actualiza los datos de esta subtarea.'}
                </p>
              </div>
              <button type="button" onClick={() => setModalGestion(MODAL_GESTION_CERRADO)} className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarGestion} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de la subtarea</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Confirmar servicio de catering"
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition"
                  value={formGestion.descripcion}
                  onChange={(e) => setFormGestion({ ...formGestion, descripcion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha</label>
                  <DateField min={hoyStr} max={limpiarFecha(eventoActivo?.fecha) || undefined} placeholder="Ej. 20/09/2026" value={formGestion.plazo} onChange={(e) => setFormGestion({ ...formGestion, plazo: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Horas estimadas</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      required
                      placeholder="Ej. 2.5"
                      className={`w-full pl-11 pr-4 py-3.5 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                        excedeSubtarea ? 'bg-red-50/70 border-red-400 focus:ring-red-400' : 'bg-white border-slate-200 focus:ring-purple-600 focus:border-purple-600'
                      }`}
                      value={formGestion.horas_estimadas}
                      onChange={(e) => setFormGestion({ ...formGestion, horas_estimadas: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {limiteActual > 0 && (
                <p className={`text-xs font-medium ${excedeSubtarea ? 'text-red-600' : 'text-slate-500'}`}>
                  {excedeSubtarea
                    ? `Superas el límite: ${horasOtras + horasNuevas} h de ${limiteActual} h. Reduce las horas o aumenta el límite del evento.`
                    : `Disponibles: ${Math.max(limiteActual - horasOtras, 0)} h de ${limiteActual} h.`}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setModalGestion(MODAL_GESTION_CERRADO)} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="inline-flex items-center gap-1.5 px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer">
                  {modalGestion.modo === 'crear' ? (
                    <>
                      <Plus className="w-4 h-4" /> Agregar subtarea
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
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