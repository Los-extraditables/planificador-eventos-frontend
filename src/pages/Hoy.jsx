import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Check,
  ClipboardList,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  WifiOff,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CargaGestionWidget from '../components/cargaGestionWidget';
import { useAuth } from '../context/AuthContext';
import { useCargaDiaria } from '../context/CargaDiariaContext';
import { useFiltradoGestiones } from '../hooks/useFiltradoGestiones';
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
const NOTA_POR_DEFECTO = 'Pospuesto sin nota';
const FECHA_MAX = '9999-12-31';

const limpiarFecha = (f) => (f || '').toString().split('T')[0].split(' ')[0];

const fechaOffsetStr = (dias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatearFechaCorta = (valor) => {
  const limpia = limpiarFecha(valor);
  const [y, m, d] = limpia.split('-').map(Number);
  if (!y || !m || !d) return limpia;
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const gestionesDe = (ev) => ev?.gestiones || ev?.gestiones_plan || [];
const esCompletado = (ev) => String(ev?.estado || '').toLowerCase().startsWith('completad');

// Una subtarea completada nunca cuenta como pospuesta
const esPospuesta = (g) =>
  !g.completada && Boolean(g.nota_pospuesto || g.estado === 'pospuesto' || g.pospuesto || g.reprogramado);

const fechaGestion = (g) => limpiarFecha(g.plazo || g.fecha) || FECHA_MAX;
const horasGestion = (g) => {
  const h = parseFloat(g.horas_estimadas);
  return !isNaN(h) && h > 0 ? h : Infinity;
};

// Orden total: plazo más antiguo → menos horas → pospuestas → evento más cercano → id
const compararPrioridad = (a, b) => {
  const fa = fechaGestion(a);
  const fb = fechaGestion(b);
  if (fa !== fb) return fa < fb ? -1 : 1;
  const ha = horasGestion(a);
  const hb = horasGestion(b);
  if (ha !== hb) return ha < hb ? -1 : 1;
  const pa = esPospuesta(a);
  const pb = esPospuesta(b);
  if (pa !== pb) return pa ? -1 : 1;
  const ea = a.eventoFecha || FECHA_MAX;
  const eb = b.eventoFecha || FECHA_MAX;
  if (ea !== eb) return ea < eb ? -1 : 1;
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
};

// Cambios locales (optimistas) y cuerpo del PATCH para cada acción
const armarCambio = (accion, { fecha, nota } = {}) => {
  if (accion === 'hecho') {
    return { cambios: { completada: true, pospuesto: false }, body: { completada: true, pospuesto: false } };
  }
  if (accion === 'pendiente') {
    return { cambios: { completada: false }, body: { completada: false } };
  }
  const notaFinal = (nota || '').trim() || NOTA_POR_DEFECTO;
  return {
    cambios: { plazo: fecha, fecha, estado: 'pospuesto', nota_pospuesto: notaFinal, pospuesto: true, completada: false },
    body: { plazo: fecha, estado: 'pospuesto', nota_pospuesto: notaFinal, pospuesto: true }
  };
};

/* ===================== Control Hecha / Posponer ===================== */
// Hecha alterna completada/pendiente. Posponer abre un modal con fecha (obligatoria) y nota (opcional).
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
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait ${
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
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-purple-800 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl transition cursor-pointer disabled:opacity-60"
          >
            Posponer
          </button>
        )}
      </div>

      {abierto && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && cerrar()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-posponer"
            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 text-left"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 id="titulo-posponer" className="text-2xl font-semibold text-[#1e2b4d]">
                  Posponer subtarea
                </h3>
                <p className="text-sm text-slate-500 mt-1 truncate">{gestion.descripcion}</p>
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
                      errorFecha ? 'bg-red-50/70 border-red-400 focus:ring-red-400' : 'bg-white border-slate-200 focus:ring-purple-600 focus:border-purple-600'
                    }`}
                  />
                </div>
                {errorFecha && <p className="text-xs text-red-600 mt-2 font-medium">{errorFecha}</p>}
                {maxFecha && !errorFecha && (
                  <p className="text-[11px] text-slate-400 mt-1.5">Puedes elegir hasta la fecha límite del evento.</p>
                )}
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
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1 text-right">{form.nota.length}/300</p>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={cerrar} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer">
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

/* ===================== Configuración de secciones ===================== */
const SECCIONES = {
  atrasadas: {
    titulo: 'Atrasadas',
    subtitulo: 'Requieren atención inmediata',
    icono: AlertTriangle,
    contenedor: 'border-red-200 bg-red-50/60 shadow-[0_8px_28px_rgba(220,38,38,0.08)]',
    iconoBox: 'bg-red-500 text-white shadow-sm',
    badge: 'bg-red-500 text-white',
    subColor: 'text-red-800',
    etiqueta: 'Atrasada',
    colorTag: 'bg-red-100 text-red-700 border border-red-200',
    borde: 'border-l-red-500'
  },
  hoy: {
    titulo: 'Para hoy',
    subtitulo: 'Prioriza estas subtareas hoy',
    icono: CalendarClock,
    contenedor: 'border-cyan-200 bg-cyan-50/40',
    iconoBox: 'bg-[#06B6D4] text-white',
    badge: 'bg-[#D9F8FC] text-[#0E7490]',
    subColor: 'text-[#0E7490]',
    etiqueta: 'Para hoy',
    colorTag: 'bg-cyan-100 text-cyan-800',
    borde: 'border-l-teal-500'
  },
  proximas: {
    titulo: 'Próximas',
    subtitulo: 'Subtareas planificadas más adelante',
    icono: Clock,
    contenedor: 'border-slate-200 bg-slate-50/60',
    iconoBox: 'bg-white text-slate-400 border border-slate-200',
    badge: 'bg-white text-slate-500 border border-slate-200',
    subColor: 'text-slate-600',
    etiqueta: 'Próxima',
    colorTag: 'bg-slate-100 text-slate-600',
    borde: 'border-l-slate-400'
  },
  completadas: {
    titulo: 'Completadas',
    subtitulo: 'Subtareas finalizadas',
    icono: CheckCircle2,
    contenedor: 'border-emerald-200 bg-emerald-50/50 shadow-sm',
    iconoBox: 'bg-emerald-500 text-white shadow-sm',
    badge: 'bg-emerald-500 text-white',
    subColor: 'text-emerald-800',
    etiqueta: 'Completada',
    colorTag: 'bg-emerald-100 text-emerald-800',
    borde: 'border-l-emerald-500 opacity-80'
  }
};

const SeccionGestiones = ({ tipo, gestiones, prioridadPorId, onRegistrar }) => {
  if (gestiones.length === 0) return null;
  const cfg = SECCIONES[tipo];
  const Icono = cfg.icono;

  return (
    <section className={`border rounded-2xl p-5 space-y-4 ${cfg.contenedor}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconoBox}`}>
          <Icono className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">{cfg.titulo}</h3>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>{gestiones.length}</span>
          </div>
          <p className={`text-xs font-medium ${cfg.subColor}`}>{cfg.subtitulo}</p>
        </div>
      </div>

      <div className="space-y-3">
        {gestiones.map((gestion) => (
          <TarjetaGestion key={gestion.id} gestion={gestion} cfg={cfg} prioridad={prioridadPorId[gestion.id]} onRegistrar={onRegistrar} />
        ))}
      </div>
    </section>
  );
};

const Metrica = ({ icono: Icono, fondo, color, valor, etiqueta }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${fondo}`}>
      <Icono className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">{valor}</span>
      <span className="text-xs text-slate-500 font-medium">{etiqueta}</span>
    </div>
  </div>
);

const TarjetaGestion = ({ gestion, cfg, prioridad, onRegistrar }) => {
  const fechaValor = gestion.plazo || gestion.fecha;
  const pospuesta = esPospuesta(gestion);
  const mostrarNota = pospuesta && gestion.nota_pospuesto && gestion.nota_pospuesto !== NOTA_POR_DEFECTO;

  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition border-l-4 ${cfg.borde} border-slate-200 hover:shadow-md`}>
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {!gestion.completada && prioridad && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                prioridad === 1 ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200'
              }`}
              title="Prioridad"
            >
              #{prioridad}
              {prioridad === 1 && <span>· Empieza por aquí</span>}
            </span>
          )}

          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-500 text-xs font-semibold px-2.5 py-0.5 rounded-md">
            <Calendar className="w-3.5 h-3.5" /> {gestion.eventoNombre}
          </span>

          {pospuesta && (
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Pospuesto</span>
          )}

          {gestion.completada && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Completada</span>
          )}
        </div>

        <h3 className={`text-base font-bold transition ${gestion.completada ? 'line-through text-slate-400' : 'text-slate-900'}`}>
          {gestion.descripcion}
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-500">
          {fechaValor && (
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <CalendarClock className="w-3.5 h-3.5 text-slate-400" /> Fecha límite: {formatearFechaCorta(fechaValor)}
            </span>
          )}
          {gestion.horas_estimadas !== undefined && gestion.horas_estimadas !== null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {gestion.horas_estimadas} h
            </span>
          )}
          {!gestion.completada && (
            <span className={`${cfg.colorTag} font-medium px-2 py-0.5 rounded-full text-[10px] w-max`}>{cfg.etiqueta}</span>
          )}
        </div>

        {mostrarNota && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 w-fit max-w-full">
            <span className="font-semibold">Nota:</span> {gestion.nota_pospuesto}
          </p>
        )}
      </div>

      <RegistroAvance gestion={gestion} eventoFecha={gestion.eventoFecha} onRegistrar={(accion, datos) => onRegistrar(gestion, accion, datos)} />
    </div>
  );
};

/* ================================ Página ================================ */
const Hoy = ({ onCrearEvento, setPestanaActiva }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { limiteDiarioMax } = useCargaDiaria();

  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [alertaIgnorada, setAlertaIgnorada] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const enVuelo = useRef(0);
  const timerMensaje = useRef(null);

  const mostrarMensaje = (tipo, texto) => {
    clearTimeout(timerMensaje.current);
    setMensaje({ tipo, texto });
    timerMensaje.current = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
  };
  useEffect(() => () => clearTimeout(timerMensaje.current), []);

  const sesionExpirada = () => {
    logout();
    navigate('/login');
  };

  const cargar = async (silencioso = false) => {
    try {
      if (!silencioso) {
        setCargando(true);
        setError(null);
      }
      const data = await request('/eventos/');
      if (silencioso && enVuelo.current > 0) return; // hay cambios en curso: la respuesta podría estar desactualizada
      setEventos(Array.isArray(data) ? data : []);
      setCargado(true);
    } catch (err) {
      if (err.sesionExpirada) return sesionExpirada();
      console.error(err);
      if (!silencioso) setError(err.message);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // Mantener coherente el estado del evento
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
      if (enVuelo.current === 0) cargar(true); // sincroniza con lo que calculó el backend
      setAlertaIgnorada(false);

      if (accion === 'hecho') mostrarMensaje('exito', `¡"${gestion.descripcion}" completada!`);
      else if (accion === 'pendiente') mostrarMensaje('exito', `"${gestion.descripcion}" volvió a pendiente.`);
      else mostrarMensaje('exito', `"${gestion.descripcion}" pospuesta al ${formatearFechaCorta(datos.fecha)}.`);
      return { ok: true };
    } catch (err) {
      enVuelo.current -= 1;
      aplicarCambio(gestion.id, anterior); // revierte solo esta subtarea
      if (err.sesionExpirada) {
        sesionExpirada();
      } else {
        mostrarMensaje('error', `No se pudo actualizar "${gestion.descripcion}". Inténtalo de nuevo.`);
      }
      return { ok: false };
    }
  };

  const handleIrACrear = () => {
    if (typeof onCrearEvento === 'function') onCrearEvento('crear');
    else if (typeof setPestanaActiva === 'function') setPestanaActiva('crear');
    else navigate('/crear');
  };

  const todasLasGestiones = useMemo(
    () =>
      eventos.flatMap((e) =>
        gestionesDe(e).map((g) => ({
          ...g,
          eventoId: e.id,
          eventoNombre: e.nombre,
          eventoFecha: limpiarFecha(e.fecha)
        }))
      ),
    [eventos]
  );

  const {
    gestionesAtrasadas: atrasadasRaw,
    gestionesHoy: hoyRaw,
    gestionesProximas: proximasRaw,
    gestionesCompletadas: completadasRaw
  } = useFiltradoGestiones(todasLasGestiones, filtroEstado);

  // Las listas urgentes solo contienen pendientes: al marcar hecha o posponer, la subtarea sale y la carga baja sola
  const gestionesAtrasadas = useMemo(() => atrasadasRaw.filter((g) => !g.completada).sort(compararPrioridad), [atrasadasRaw]);
  const gestionesHoy = useMemo(() => hoyRaw.filter((g) => !g.completada).sort(compararPrioridad), [hoyRaw]);
  const gestionesProximas = useMemo(() => proximasRaw.filter((g) => !g.completada).sort(compararPrioridad), [proximasRaw]);
  const gestionesCompletadas = useMemo(
    () => completadasRaw.filter((g) => g.completada).sort((a, b) => compararPrioridad(b, a)),
    [completadasRaw]
  );

  const prioridadPorId = useMemo(() => {
    const mapa = {};
    [...gestionesAtrasadas, ...gestionesHoy, ...gestionesProximas].forEach((g, i) => {
      mapa[g.id] = i + 1;
    });
    return mapa;
  }, [gestionesAtrasadas, gestionesHoy, gestionesProximas]);

  const totalPendientes = gestionesAtrasadas.length + gestionesHoy.length + gestionesProximas.length;
  const hayGestiones = totalPendientes + gestionesCompletadas.length > 0;

  const horasTotalesHoy = gestionesHoy.reduce((acc, g) => acc + (parseFloat(g.horas_estimadas) || 0), 0);
  const porcentajeCarga = limiteDiarioMax > 0 ? Math.min((horasTotalesHoy / limiteDiarioMax) * 100, 100) : 0;

  const fechaHoyTexto = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const aplicarSolucion = (tipoSolucion) => {
    if (tipoSolucion === 'ignorar') {
      setAlertaIgnorada(true);
      mostrarMensaje('exito', 'Has decidido mantener tu agenda actual.');
    } else if (tipoSolucion === 'reprogramar' && gestionesHoy.length > 0) {
      const ultima = gestionesHoy[gestionesHoy.length - 1];
      registrar(ultima, 'pospuesto', { fecha: fechaOffsetStr(1), nota: 'Reprogramado por sobrecarga del día' });
    }
  };

  const primeraCarga = cargando && !cargado;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen text-slate-800 text-left font-sans">
      {mensaje.texto && (
        <div
          role="status"
          className={`p-4 rounded-xl font-medium text-sm border flex items-center gap-2.5 shadow-sm transition-all ${
            mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xs sm:text-sm text-slate-500 capitalize mt-0.5">{fechaHoyTexto}</p>

        <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-sm w-fit">
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

      {primeraCarga && (
        <div className="py-12 px-4 flex flex-col items-center justify-center space-y-8" role="status" aria-live="polite">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <CalendarClock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Estamos preparando tu día</h3>
              <p className="text-sm text-slate-500 max-w-sm">Organizamos tus subtareas por prioridad. Tomará solo un momento.</p>
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

      {error && !primeraCarga && !cargado && (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 text-red-400">
            <WifiOff className="h-8 w-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mb-2 tracking-tight">No pudimos cargar tus actividades</h2>
          <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">Parece que perdimos la conexión. Compruébala e inténtalo de nuevo.</p>
          <button
            type="button"
            onClick={() => cargar()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E10000] hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Volver a intentar
          </button>
        </div>
      )}

      {cargado &&
        (eventos.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 my-12 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">¡Todo listo por hoy!</h2>
              <p className="text-sm text-slate-500">No tienes subtareas urgentes hoy.</p>
            </div>
            <button
              type="button"
              onClick={handleIrACrear}
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-[#7B1FA2] hover:bg-[#6A1B9A] text-white font-semibold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <span>+</span> Crear un evento
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Metrica icono={Calendar} fondo="bg-[#E0F2F1]" color="text-[#00796B]" valor={gestionesHoy.length} etiqueta="Subtareas para hoy" />
              <Metrica
                icono={ClipboardList}
                fondo="bg-[#F3E5F5]"
                color="text-[#7B1FA2]"
                valor={filtroEstado === 'completados' ? gestionesCompletadas.length : totalPendientes}
                etiqueta={filtroEstado === 'completados' ? 'Subtareas completadas' : 'Subtareas pendientes'}
              />
              <Metrica icono={Clock} fondo="bg-[#F3E5F5]" color="text-[#7B1FA2]" valor={gestionesProximas.length} etiqueta="Subtareas próximas" />
            </div>

            {/* Se recalcula al instante con cada cambio */}
            <CargaGestionWidget
              horasTotalesHoy={horasTotalesHoy}
              limiteDiarioMax={limiteDiarioMax}
              alertaIgnorada={alertaIgnorada}
              porcentajeCarga={porcentajeCarga}
              aplicarSolucion={aplicarSolucion}
            />

            <div className="space-y-3">
              <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Subtareas de hoy</h2>
              <div className="bg-[#E6F7F8] border border-[#A7ECEE] rounded-2xl p-4 flex items-start gap-3 text-[#0D6E72] text-sm leading-relaxed">
                <div className="w-5 h-5 rounded-full border border-[#0D6E72] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">?</div>
                <p>
                  Tus subtareas se agrupan por urgencia y cada una tiene su número de prioridad. Dentro de cada grupo van primero las de fecha más antigua; si coinciden, la que toma menos horas; si aún empatan, las pospuestas y luego las del evento con fecha límite más cercana.
                </p>
              </div>
            </div>

            {!hayGestiones ? (
              <div className="bg-[#F8FAFC]/50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-slate-400 text-sm">
                No hay subtareas que coincidan con este filtro.
              </div>
            ) : (
              <div className="space-y-6">
                <SeccionGestiones tipo="atrasadas" gestiones={gestionesAtrasadas} prioridadPorId={prioridadPorId} onRegistrar={registrar} />
                <SeccionGestiones tipo="hoy" gestiones={gestionesHoy} prioridadPorId={prioridadPorId} onRegistrar={registrar} />
                <SeccionGestiones tipo="proximas" gestiones={gestionesProximas} prioridadPorId={prioridadPorId} onRegistrar={registrar} />
                <SeccionGestiones tipo="completadas" gestiones={gestionesCompletadas} prioridadPorId={prioridadPorId} onRegistrar={registrar} />
              </div>
            )}
          </>
        ))}
    </div>
  );
};

export default Hoy;