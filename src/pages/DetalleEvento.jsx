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
  SlidersHorizontal,
  StickyNote,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

/* ===================== Etiqueta de pospuestas (igual que en Hoy y Progreso) ===================== */
const EtiquetaPospuestas = ({ cantidad, texto }) => {
  if (!cantidad && !texto) return null;
  return (
    <span className="inline-flex items-center bg-amber-100 text-amber-800 border border-amber-200 text-[10px] leading-4 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
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

/* ===================== Control Hecha / Posponer (igual que en Hoy) ===================== */
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
          className={`${UI.btnHecha} ${completada ? UI.btnHechaListo : UI.btnHechaPendiente}`}
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
            className={UI.btnPosponer}
          >
            Posponer
          </button>
        )}
      </div>

      {abierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-posponer" className={UI.modal}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 id="titulo-posponer" className={UI.modalTitulo}>Posponer subtarea</h3>
                  <p className={`${UI.modalSubtitulo} truncate`}>{gestion.descripcion}</p>
                </div>
              </div>
              <button type="button" onClick={cerrar} className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmarPosponer} className="mt-6 space-y-5">
              <div>
                <label htmlFor="posponer-fecha" className={UI.label}>
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
                    className={`${errorFecha ? UI.inputError : UI.input} pl-11`}
                  />
                </div>
                {errorFecha && <p className={UI.error}>{errorFecha}</p>}
                {maxFecha && !errorFecha && <p className="text-[11px] text-slate-400 mt-1.5">Puedes elegir hasta la fecha límite del evento.</p>}
              </div>

              <div>
                <label htmlFor="posponer-nota" className={UI.label}>
                  Nota <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="posponer-nota"
                  rows={3}
                  maxLength={300}
                  placeholder="Ej. Esperando respuesta del proveedor"
                  value={form.nota}
                  onChange={(e) => setForm({ ...form, nota: e.target.value })}
                  className={`${UI.input} resize-none`}
                />
                <p className="text-[11px] text-slate-400 mt-1 text-right">{form.nota.length}/300</p>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={cerrar} className={UI.btnSecundario}>
                  Cancelar
                </button>
                <button type="submit" className={UI.btnPrimario}>
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
        className={`${UI.input} pl-11 [&::-webkit-calendar-picker-indicator]:hidden`}
      />
    </div>
  );
};

/* ===================== Modal de confirmación de eliminación (igual que en Progreso) ===================== */
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
      if (accion === 'pospuesto') mostrarMensaje('exito', `Subtarea pospuesta al ${formatearFechaDisplay(datos.fecha)}.`);
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
      <div className={UI.pagina}>
        <PantallaCarga
          icono={CalendarClock}
          titulo="Cargando detalles de eventos"
          texto="Organizamos la información. Tomará solo un momento."
        />
      </div>
    );
  }

  if (!cargado || eventos.length === 0) {
    return (
      <div className={UI.pagina}>
        <button onClick={() => navigate('/hoy')} className={`inline-flex items-center gap-1.5 w-fit ${UI.btnEnlace}`}>
          <ArrowLeft className="w-4 h-4" /> Volver a Hoy
        </button>
        <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'No hay eventos disponibles para mostrar. Crea un evento nuevo.'}</span>
        </div>
        <button onClick={() => cargar()} className={UI.btnPrimario}>
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
    <div className={UI.pagina}>
      {mensaje.texto && <Aviso tipo={mensaje.tipo} texto={mensaje.texto} />}

      <button onClick={() => navigate('/hoy')} className={`inline-flex items-center gap-1.5 w-fit -mb-2 ${UI.btnEnlace}`}>
        <ArrowLeft className="w-4 h-4" /> Volver a Hoy
      </button>

      <EncabezadoPagina
        titulo={seleccion === 'todos' ? 'Lista general de eventos' : eventoActivo.nombre}
        subtitulo={seleccion === 'todos' ? 'Selecciona cualquier evento para ver sus subtareas y detalles completos.' : undefined}
      >
        <div className={UI.filtro}>
          <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={seleccion}
            onChange={(e) => setEventoSeleccionadoId(e.target.value)}
            aria-label="Seleccionar evento"
            className={UI.filtroSelect}
          >
            <option value="todos">Todos los eventos</option>
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        {eventoActivo && (
          <button onClick={handleAbrirEditarEvento} className={UI.btnSecundarioSm}>
            <Edit3 className="w-4 h-4 text-purple-600" /> Editar evento
          </button>
        )}
      </EncabezadoPagina>

      {seleccion === 'todos' ? (
        <div className="grid grid-cols-1 gap-4">
          {eventos.map((ev) => {
            const p = calcularProgreso(gestionesDe(ev));
            return (
              <div
                key={ev.id}
                onClick={() => setEventoSeleccionadoId(String(ev.id))}
                className={`${UI.tarjeta} hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#7E22CE] transition">{ev.nombre}</h3>
                    <EtiquetaPospuestas cantidad={p.pospuestas} />
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
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] rounded-full text-xs font-bold">{eventoActivo.estado || 'En preparación'}</span>
            <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-bold">{eventoActivo.tipo || eventoActivo.categoria || 'Evento'}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Límite: {eventoActivo.fecha ? formatearFechaDisplay(eventoActivo.fecha) : 'Sin fecha'}
            </span>
            {eventoActivo.limite_diario_horas && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-purple-600" /> Máx. {eventoActivo.limite_diario_horas} h (total)
              </span>
            )}
          </div>

          {/* Se actualiza al instante al marcar Hecha o Pospuesta */}
          <div className={UI.tarjeta}>
            <BarraProgreso completadas={progreso.completadas} total={progreso.total} pospuestas={progreso.pospuestas} titulo="Progreso del evento" tamano="lg" />
          </div>

          <div className={`${UI.tarjeta} space-y-5`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className={UI.h2}>Subtareas</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">{progreso.total} subtareas</span>
                <button onClick={handleAbrirCrear} className={UI.btnAgregarSm}>
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
                          {pospuesta && <EtiquetaPospuestas texto="Pospuesta" />}
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
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> {sub.horas_estimadas} h
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
          <div role="dialog" aria-modal="true" className={UI.modal}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={UI.modalTitulo}>Editar evento</h3>
                <p className={UI.modalSubtitulo}>Actualiza los datos generales y la capacidad diaria de trabajo.</p>
              </div>
              <button type="button" onClick={() => setModalEvento(false)} className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEvento} className="mt-6 space-y-5">
              <div>
                <label className={UI.label}>Nombre del evento</label>
                <input
                  type="text"
                  required
                  className={UI.input}
                  value={formEvento.nombre}
                  onChange={(e) => setFormEvento({ ...formEvento, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={UI.label}>Tipo de evento</label>
                  <select
                    className={`${UI.input} cursor-pointer`}
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
                  <label className={UI.label}>Fecha límite</label>
                  <DateField required min={hoyStr} placeholder="Ej. 20/09/2026" value={formEvento.fecha} onChange={(e) => setFormEvento({ ...formEvento, fecha: e.target.value })} />
                </div>
              </div>

              <div>
                <label className={UI.label}>Máximo de horas por día</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    required
                    placeholder="Ej. 6"
                    className={`${limiteMuyBajo ? UI.inputError : UI.input} pl-11 pr-24`}
                    value={formEvento.limite_diario_horas}
                    onChange={(e) => setFormEvento({ ...formEvento, limite_diario_horas: e.target.value })}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">h/día</span>
                </div>
                {limiteMuyBajo && (
                  <p className={UI.error}>
                    Tus subtareas ya suman {horasSubtareasTotal} h. Reduce o elimina subtareas, o usa un límite de {horasSubtareasTotal} h o más.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setModalEvento(false)} className={UI.btnSecundario}>
                  Cancelar
                </button>
                <button type="submit" className={UI.btnPrimario}>
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
          <div role="dialog" aria-modal="true" className={UI.modal}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={UI.modalTitulo}>{modalGestion.modo === 'crear' ? 'Agregar subtarea' : 'Editar subtarea'}</h3>
                <p className={UI.modalSubtitulo}>
                  {modalGestion.modo === 'crear' ? 'Añade una nueva subtarea a este evento.' : 'Actualiza los datos de esta subtarea.'}
                </p>
              </div>
              <button type="button" onClick={() => setModalGestion(MODAL_GESTION_CERRADO)} className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarGestion} className="mt-6 space-y-5">
              <div>
                <label className={UI.label}>Nombre de la subtarea</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Confirmar servicio de catering"
                  className={UI.input}
                  value={formGestion.descripcion}
                  onChange={(e) => setFormGestion({ ...formGestion, descripcion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={UI.label}>Fecha</label>
                  <DateField min={hoyStr} max={limpiarFecha(eventoActivo?.fecha) || undefined} placeholder="Ej. 20/09/2026" value={formGestion.plazo} onChange={(e) => setFormGestion({ ...formGestion, plazo: e.target.value })} />
                </div>

                <div>
                  <label className={UI.label}>Horas estimadas</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      required
                      placeholder="Ej. 2.5"
                      className={`${excedeSubtarea ? UI.inputError : UI.input} pl-11`}
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
                <button type="button" onClick={() => setModalGestion(MODAL_GESTION_CERRADO)} className={UI.btnSecundario}>
                  Cancelar
                </button>
                <button type="submit" className={UI.btnPrimario}>
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