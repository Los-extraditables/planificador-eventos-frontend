import {
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
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import CargaGestionWidget from '../components/cargaGestionWidget';
import {
  Aviso,
  EncabezadoPagina,
  PantallaCarga,
  UI,
  formatearFechaDisplay,
  limpiarFecha
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCargaDiaria } from '../context/CargaDiariaContext';
import { useFiltradoGestiones } from '../hooks/useFiltradoGestiones';
import { authService } from '../services/authService';

/* ============================== API ============================== */
const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  'https://planificador-eventos-backend.onrender.com/api';

const API_URL = rawApiUrl.replace(/\/+$/, '');

const getToken = () =>
  authService.getToken() || localStorage.getItem('token');

const errorSesion = () =>
  Object.assign(new Error('Sesión expirada.'), {
    sesionExpirada: true
  });

const request = async (ruta, { method = 'GET', body } = {}) => {
  const token = getToken();

  if (!token) throw errorSesion();

  const res = await fetch(`${API_URL}${ruta}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (res.status === 401 || res.status === 403) {
    throw errorSesion();
  }

  if (!res.ok) {
    throw new Error('Error del servidor.');
  }

  return res.status === 204 ? null : res.json().catch(() => null);
};

/* ============================ Utilidades ============================ */
const NOTA_POR_DEFECTO = 'Pospuesto sin nota';
const FECHA_MAX = '9999-12-31';

const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2';

const TACTIL = 'min-h-[44px] md:min-h-0';

const CAMPO_MOVIL = '!text-base sm:!text-sm';

// Clases del diálogo de "Posponer" (antes no estaban definidas)
const CLASE_MODAL =
  'bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-6 min-w-0';

// Evita desbordes/estilos nativos del input date en iOS
const FECHA_IOS = 'appearance-none [&::-webkit-date-and-time-value]:text-left';

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const fechaOffsetStr = (dias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const gestionesDe = (ev) =>
  ev?.gestiones || ev?.gestiones_plan || [];

const esCompletado = (ev) =>
  String(ev?.estado || '').toLowerCase().startsWith('completad');

const esPospuesta = (g) =>
  !g.completada &&
  Boolean(
    g.nota_pospuesto ||
    g.estado === 'pospuesto' ||
    g.pospuesto ||
    g.reprogramado
  );

const fechaGestion = (g) =>
  limpiarFecha(g.plazo || g.fecha) || FECHA_MAX;

const horasGestion = (g) => {
  const h = parseFloat(g.horas_estimadas);
  return !isNaN(h) && h > 0 ? h : Infinity;
};

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

  return String(a.id).localeCompare(String(b.id), undefined, {
    numeric: true
  });
};

const armarCambio = (accion, { fecha, nota } = {}) => {
  if (accion === 'hecho') {
    return {
      cambios: { completada: true, pospuesto: false },
      body: { completada: true, pospuesto: false }
    };
  }

  if (accion === 'pendiente') {
    return {
      cambios: { completada: false },
      body: { completada: false }
    };
  }

  const notaFinal = (nota || '').trim() || NOTA_POR_DEFECTO;

  return {
    cambios: {
      plazo: fecha,
      fecha,
      estado: 'pospuesto',
      nota_pospuesto: notaFinal,
      pospuesto: true,
      completada: false
    },
    body: {
      plazo: fecha,
      estado: 'pospuesto',
      nota_pospuesto: notaFinal,
      pospuesto: true
    }
  };
};

const mensajeFechaExcedida = (fechaEvento) =>
  `No es posible posponer: la nueva fecha supera la fecha del evento (${formatearFechaDisplay(fechaEvento)}).`;

const MENSAJE_FECHA_PASADA = 'La nueva fecha debe ser posterior a hoy.';

/* ===================== Etiqueta de pospuesta ===================== */
const EtiquetaPospuestas = ({ cantidad, texto }) => {
  if (!cantidad && !texto) return null;

  return (
    <span className="inline-flex items-center bg-amber-100 text-amber-800 border border-amber-200 text-xs leading-4 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
      {texto || `${cantidad} ${cantidad === 1 ? 'pospuesta' : 'pospuestas'}`}
    </span>
  );
};

/* ===================== Control Hecha / Posponer ===================== */
const RegistroAvance = ({ gestion, eventoFecha, onRegistrar }) => {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ fecha: '', nota: '' });
  const [errorFecha, setErrorFecha] = useState('');
  const [guardando, setGuardando] = useState(false);

  const botonPosponerRef = useRef(null);
  const dialogoRef = useRef(null);
  const inputFechaRef = useRef(null);

  const completada = Boolean(gestion.completada);
  const minFecha = fechaOffsetStr(1);
  const maxFecha = limpiarFecha(eventoFecha) || undefined;
  const sinMargen = Boolean(maxFecha && maxFecha < minFecha);

  // Validación en vivo: el campo se marca en rojo apenas la fecha queda fuera del rango permitido
  const fechaAntes = Boolean(form.fecha) && form.fecha < minFecha;
  const fechaDespues = Boolean(form.fecha) && Boolean(maxFecha) && form.fecha > maxFecha;
  const textoFechaVivo = fechaDespues
    ? mensajeFechaExcedida(maxFecha)
    : fechaAntes
      ? MENSAJE_FECHA_PASADA
      : '';
  const errorVisible = errorFecha || textoFechaVivo;

  const cerrar = () => {
    setAbierto(false);
    setErrorFecha('');
    botonPosponerRef.current?.focus();
  };

  useEffect(() => {
    if (abierto) inputFechaRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  const onKeyDownDialogo = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cerrar();
      return;
    }

    if (e.key !== 'Tab') return;

    const enfocables =
      dialogoRef.current?.querySelectorAll(SELECTOR_FOCO);

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

  const ejecutar = async (accion, datos) => {
    setGuardando(true);

    try {
      return await onRegistrar(accion, datos);
    } finally {
      setGuardando(false);
    }
  };

  const fallar = (mensaje) => {
    setErrorFecha(mensaje);
    inputFechaRef.current?.focus();
  };

  const confirmarPosponer = async (e) => {
    e.preventDefault();

    if (!form.fecha) {
      return fallar('Selecciona la nueva fecha.');
    }

    if (maxFecha && form.fecha > maxFecha) {
      return fallar(mensajeFechaExcedida(maxFecha));
    }

    if (form.fecha < minFecha) {
      return fallar(MENSAJE_FECHA_PASADA);
    }

    cerrar();

    await ejecutar('pospuesto', {
      fecha: form.fecha,
      nota: form.nota
    });
  };

  const idsDescripcionFecha = [
    errorVisible ? 'posponer-fecha-error' : null,
    maxFecha && !errorVisible && !sinMargen
      ? 'posponer-fecha-ayuda'
      : null,
    sinMargen && !errorVisible
      ? 'posponer-fecha-sin-margen'
      : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="flex items-stretch md:items-center gap-2 w-full md:w-auto flex-shrink-0">
        <button
          type="button"
          onClick={() => ejecutar(completada ? 'pendiente' : 'hecho')}
          disabled={guardando}
          aria-label={
            completada
              ? `Completada. Marcar como pendiente: ${gestion.descripcion}`
              : `Marcar como hecha: ${gestion.descripcion}`
          }
          className={`${UI.btnHecha} ${completada ? UI.btnHechaListo : UI.btnHechaPendiente} ${FOCO} ${TACTIL} flex-1 md:flex-none justify-center`}
        >
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{completada ? 'Completada' : 'Hecha'}</span>
        </button>

        {!completada && (
          <button
            ref={botonPosponerRef}
            type="button"
            onClick={() => {
              setForm({ fecha: '', nota: '' });
              setErrorFecha('');
              setAbierto(true);
            }}
            disabled={guardando}
            aria-label={`Posponer: ${gestion.descripcion}`}
            aria-haspopup="dialog"
            className={`${UI.btnPosponer} ${FOCO} ${TACTIL} flex-1 md:flex-none justify-center`}
          >
            Posponer
          </button>
        )}
      </div>

      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm overflow-y-auto overscroll-contain">
            <div
              className="flex min-h-full items-center justify-center p-3 sm:p-4"
              style={{
                paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
              }}
              onMouseDown={(e) =>
                e.target === e.currentTarget && cerrar()
              }
            >
              <div
                ref={dialogoRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-posponer"
                aria-describedby="descripcion-posponer"
                onKeyDown={onKeyDownDialogo}
                className={CLASE_MODAL}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <CalendarClock
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0">
                      <h2
                        id="titulo-posponer"
                        className={UI.modalTitulo}
                      >
                        Posponer subtarea
                      </h2>

                      <p
                        id="descripcion-posponer"
                        className={`${UI.modalSubtitulo} truncate`}
                      >
                        {gestion.descripcion}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={cerrar}
                    className={`p-2 -m-1 sm:p-1 sm:m-0 rounded text-slate-600 hover:text-slate-800 transition cursor-pointer flex-shrink-0 ${FOCO}`}
                    aria-label="Cerrar diálogo"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <form
                  onSubmit={confirmarPosponer}
                  noValidate
                  className="mt-5 sm:mt-6 space-y-4 sm:space-y-5"
                >
                  <div>
                    <label htmlFor="posponer-fecha" className={UI.label}>
                      Nueva fecha{' '}
                      <span className="text-red-700" aria-hidden="true">
                        *
                      </span>
                      <span className="sr-only">(obligatorio)</span>
                    </label>

                    <div className="relative">
                      <Calendar
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                        aria-hidden="true"
                      />

                      <input
                        ref={inputFechaRef}
                        id="posponer-fecha"
                        type="date"
                        min={minFecha}
                        max={maxFecha}
                        aria-required="true"
                        aria-invalid={errorVisible ? 'true' : 'false'}
                        aria-describedby={idsDescripcionFecha || undefined}
                        value={form.fecha}
                        onChange={(e) => {
                          setForm({ ...form, fecha: e.target.value });
                          setErrorFecha('');
                        }}
                        className={`${errorVisible ? UI.inputError : UI.input} pl-11 w-full min-w-0 ${CAMPO_MOVIL} ${FECHA_IOS} ${FOCO}`}
                      />
                    </div>

                    {errorVisible && (
                      <p
                        id="posponer-fecha-error"
                        role="alert"
                        className={`${UI.error} break-words`}
                      >
                        {errorVisible}
                      </p>
                    )}

                    {maxFecha && !errorVisible && !sinMargen && (
                      <p
                        id="posponer-fecha-ayuda"
                        className="text-xs text-slate-600 mt-1.5"
                      >
                        Puedes elegir hasta la fecha límite del evento.
                      </p>
                    )}

                    {sinMargen && !errorVisible && (
                      <p
                        id="posponer-fecha-sin-margen"
                        className="text-xs text-amber-800 mt-1.5 break-words"
                      >
                        No es posible posponer: el evento ya no tiene fechas
                        disponibles ({formatearFechaDisplay(maxFecha)}).
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="posponer-nota" className={UI.label}>
                      Nota{' '}
                      <span className="text-slate-600 font-normal">
                        (opcional)
                      </span>
                    </label>

                    <textarea
                      id="posponer-nota"
                      rows={3}
                      maxLength={300}
                      placeholder="Ej. Esperando respuesta del proveedor"
                      value={form.nota}
                      onChange={(e) =>
                        setForm({ ...form, nota: e.target.value })
                      }
                      aria-describedby="posponer-nota-contador"
                      className={`${UI.input} resize-none w-full min-w-0 ${CAMPO_MOVIL} ${FOCO}`}
                    />

                    <p
                      id="posponer-nota-contador"
                      className="text-xs text-slate-600 mt-1 text-right"
                    >
                      {form.nota.length}/300
                      <span className="sr-only"> caracteres</span>
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 sm:pt-5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={cerrar}
                      className={`${UI.btnSecundario} ${FOCO} w-full sm:w-auto justify-center min-h-[44px] sm:min-h-0`}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className={`${UI.btnPrimario} ${FOCO} w-full sm:w-auto justify-center min-h-[44px] sm:min-h-0`}
                    >
                      Posponer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
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
    contenedor:
      'border-red-200 bg-red-50/60 shadow-[0_8px_28px_rgba(220,38,38,0.08)]',
    iconoBox: 'bg-red-600 text-white shadow-sm',
    badge: 'bg-red-600 text-white',
    subColor: 'text-red-800',
    etiqueta: 'Atrasada',
    colorTag: 'bg-red-100 text-red-700 border border-red-200',
    borde: 'border-l-red-600'
  },
  hoy: {
    titulo: 'Para hoy',
    subtitulo: 'Prioriza estas subtareas hoy',
    icono: CalendarClock,
    contenedor: 'border-cyan-200 bg-cyan-50/40',
    iconoBox: 'bg-cyan-700 text-white',
    badge: 'bg-[#D9F8FC] text-[#0E7490]',
    subColor: 'text-[#0E7490]',
    etiqueta: 'Para hoy',
    colorTag: 'bg-cyan-100 text-cyan-800',
    borde: 'border-l-teal-600'
  },
  proximas: {
    titulo: 'Próximas',
    subtitulo: 'Subtareas planificadas más adelante',
    icono: Clock,
    contenedor: 'border-slate-200 bg-slate-50/60',
    iconoBox: 'bg-white text-slate-600 border border-slate-300',
    badge: 'bg-white text-slate-600 border border-slate-200',
    subColor: 'text-slate-600',
    etiqueta: 'Próxima',
    colorTag: 'bg-slate-100 text-slate-600',
    borde: 'border-l-slate-500'
  },
  completadas: {
    titulo: 'Completadas',
    subtitulo: 'Subtareas finalizadas',
    icono: CheckCircle2,
    contenedor: 'border-emerald-200 bg-emerald-50/50 shadow-sm',
    iconoBox: 'bg-emerald-600 text-white shadow-sm',
    badge: 'bg-emerald-700 text-white',
    subColor: 'text-emerald-800',
    etiqueta: 'Completada',
    colorTag: 'bg-emerald-100 text-emerald-800',
    borde: 'border-l-emerald-600'
  }
};

const SeccionGestiones = ({
  tipo,
  gestiones,
  prioridadPorId,
  onRegistrar
}) => {
  if (gestiones.length === 0) return null;

  const cfg = SECCIONES[tipo];
  const Icono = cfg.icono;
  const idTitulo = `seccion-${tipo}-titulo`;

  return (
    <section
      aria-labelledby={idTitulo}
      className={`border rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 min-w-0 ${cfg.contenedor}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconoBox}`}
        >
          <Icono className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              id={idTitulo}
              className="font-extrabold text-slate-900 text-sm"
            >
              {cfg.titulo}
            </h3>

            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}
            >
              {gestiones.length}
              <span className="sr-only">
                {gestiones.length === 1 ? 'subtarea' : 'subtareas'}
              </span>
            </span>
          </div>

          <p className={`text-xs font-medium ${cfg.subColor}`}>
            {cfg.subtitulo}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {gestiones.map((gestion) => (
          <TarjetaGestion
            key={gestion.id}
            gestion={gestion}
            cfg={cfg}
            prioridad={prioridadPorId[gestion.id]}
            onRegistrar={onRegistrar}
          />
        ))}
      </ul>
    </section>
  );
};

const Metrica = ({ icono: Icono, fondo, valor, etiqueta }) => (
  <div className={`${UI.tarjeta} flex items-center gap-4 min-w-0`}>
    <div
      className={`w-12 h-12 rounded-xl text-white flex items-center justify-center flex-shrink-0 shadow-sm ${fondo}`}
    >
      <Icono className="w-6 h-6" aria-hidden="true" />
    </div>

    <div className="min-w-0">
      <div className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">
        {valor}
      </div>
      <span className="block mt-1.5 text-xs font-semibold text-slate-600">
        {etiqueta}
      </span>
    </div>
  </div>
);

const TarjetaGestion = ({
  gestion,
  cfg,
  prioridad,
  onRegistrar
}) => {
  const fechaValor = gestion.plazo || gestion.fecha;
  const pospuesta = esPospuesta(gestion);

  const mostrarNota =
    pospuesta &&
    gestion.nota_pospuesto &&
    gestion.nota_pospuesto !== NOTA_POR_DEFECTO;

  return (
    <li
      className={`bg-white border rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 transition border-l-4 min-w-0 ${cfg.borde} border-slate-200 hover:shadow-md`}
    >
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {!gestion.completada && prioridad && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                prioridad === 1
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              <span className="sr-only">Prioridad </span>#{prioridad}
              {prioridad === 1 && <span>· Empieza por aquí</span>}
            </span>
          )}

          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-md max-w-full min-w-0">
            <Calendar
              className="w-3.5 h-3.5 flex-shrink-0"
              aria-hidden="true"
            />
            <span className="sr-only">Evento: </span>
            <span className="truncate">{gestion.eventoNombre}</span>
          </span>

          {pospuesta && <EtiquetaPospuestas texto="Pospuesta" />}

          {gestion.completada && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-full">
              <span aria-hidden="true">✓ </span>Completada
            </span>
          )}
        </div>

        <h4
          className={`text-sm font-semibold transition break-words ${
            gestion.completada
              ? 'line-through text-slate-500'
              : 'text-slate-900'
          }`}
        >
          {gestion.descripcion}
        </h4>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {fechaValor && (
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <CalendarClock
                className="w-3.5 h-3.5 text-slate-500 flex-shrink-0"
                aria-hidden="true"
              />
              Fecha límite: {formatearFechaDisplay(fechaValor)}
            </span>
          )}

          {gestion.horas_estimadas !== undefined &&
            gestion.horas_estimadas !== null && (
              <span className="flex items-center gap-1 font-medium">
                <Clock
                  className="w-3.5 h-3.5 text-slate-500 flex-shrink-0"
                  aria-hidden="true"
                />
                {gestion.horas_estimadas} h
                <span className="sr-only"> estimadas</span>
              </span>
            )}

          {!gestion.completada && (
            <span
              className={`${cfg.colorTag} font-medium px-2 py-0.5 rounded-full text-xs w-max`}
            >
              {cfg.etiqueta}
            </span>
          )}
        </div>

        {mostrarNota && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 w-fit max-w-full break-words">
            <span className="font-semibold">Nota:</span>{' '}
            {gestion.nota_pospuesto}
          </p>
        )}
      </div>

      <RegistroAvance
        gestion={gestion}
        eventoFecha={gestion.eventoFecha}
        onRegistrar={(accion, datos) =>
          onRegistrar(gestion, accion, datos)
        }
      />
    </li>
  );
};

/* ===================== Ayuda de prioridad ===================== */
const AyudaPrioridad = () => {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        onMouseEnter={() => setAbierto(true)}
        onMouseLeave={() => setAbierto(false)}
        onBlur={() => setAbierto(false)}
        onKeyDown={(e) => e.key === 'Escape' && setAbierto(false)}
        aria-expanded={abierto}
        aria-controls="ayuda-prioridad"
        aria-label="¿Cómo se calcula la prioridad?"
        className={`w-6 h-6 rounded-full border border-[#0D6E72] font-bold text-xs flex items-center justify-center cursor-pointer ${FOCO}`}
      >
        ?
      </button>

      {abierto && (
        <div
          id="ayuda-prioridad"
          role="tooltip"
          className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-3rem)] z-20 bg-slate-900 text-white text-xs leading-relaxed rounded-xl p-3 shadow-xl"
        >
          Dentro de cada grupo van primero las de fecha más antigua; si
          coinciden, la que toma menos horas; si aún empatan, las pospuestas y
          luego las del evento con fecha límite más cercana.
        </div>
      )}
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
  const tituloListaRef = useRef(null);

  const mostrarMensaje = (tipo, texto) => {
    clearTimeout(timerMensaje.current);

    setMensaje({ tipo, texto });

    timerMensaje.current = setTimeout(
      () => setMensaje({ tipo: '', texto: '' }),
      5000
    );
  };

  useEffect(
    () => () => clearTimeout(timerMensaje.current),
    []
  );

  const recuperarFoco = () => {
    requestAnimationFrame(() => {
      const activo = document.activeElement;

      if (!activo || activo === document.body) {
        tituloListaRef.current?.focus();
      }
    });
  };

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

      if (silencioso && enVuelo.current > 0) return;

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
        const mapear = (lista) =>
          Array.isArray(lista)
            ? lista.map((g) =>
                g.id === gestionId ? { ...g, ...cambios } : g
              )
            : lista;

        return {
          ...ev,
          gestiones: mapear(ev.gestiones),
          gestiones_plan: mapear(ev.gestiones_plan)
        };
      })
    );

  const registrar = async (gestion, accion, datos = {}) => {
    const evento = eventos.find((e) =>
      gestionesDe(e).some((g) => g.id === gestion.id)
    );

    if (accion === 'pospuesto' && evento) {
      const limite = limpiarFecha(evento.fecha);

      if (limite && datos.fecha > limite) {
        mostrarMensaje(
          'error',
          `No es posible posponer "${gestion.descripcion}": la nueva fecha supera la fecha del evento (${formatearFechaDisplay(limite)}).`
        );

        return { ok: false };
      }
    }

    const { cambios, body } = armarCambio(accion, datos);

    const anterior = Object.fromEntries(
      Object.keys(cambios).map((k) => [k, gestion[k]])
    );

    enVuelo.current += 1;

    aplicarCambio(gestion.id, cambios);
    recuperarFoco();

    try {
      await request(`/gestiones/${gestion.id}/`, {
        method: 'PATCH',
        body
      });

      if (evento) {
        let nuevoEstado = null;

        if (
          accion === 'hecho' &&
          !esCompletado(evento) &&
          gestionesDe(evento).every(
            (g) => g.id === gestion.id || g.completada
          )
        ) {
          nuevoEstado = 'Completado';
        } else if (
          accion !== 'hecho' &&
          esCompletado(evento)
        ) {
          nuevoEstado = 'En preparación';
        }

        if (nuevoEstado) {
          try {
            await request(`/eventos/${evento.id}/`, {
              method: 'PATCH',
              body: { estado: nuevoEstado }
            });

            setEventos((prev) =>
              prev.map((e) =>
                e.id === evento.id
                  ? { ...e, estado: nuevoEstado }
                  : e
              )
            );
          } catch (err) {
            console.error(
              'No se pudo actualizar el estado del evento:',
              err
            );
          }
        }
      }

      enVuelo.current -= 1;

      if (enVuelo.current === 0) cargar(true);

      setAlertaIgnorada(false);

      if (accion === 'hecho') {
        mostrarMensaje(
          'exito',
          `¡"${gestion.descripcion}" completada!`
        );
      } else if (accion === 'pendiente') {
        mostrarMensaje(
          'exito',
          `"${gestion.descripcion}" volvió a pendiente.`
        );
      } else {
        mostrarMensaje(
          'exito',
          `"${gestion.descripcion}" pospuesta al ${formatearFechaDisplay(datos.fecha)}.`
        );
      }

      return { ok: true };
    } catch (err) {
      enVuelo.current -= 1;
      aplicarCambio(gestion.id, anterior);

      if (err.sesionExpirada) {
        sesionExpirada();
      } else {
        mostrarMensaje(
          'error',
          `No se pudo actualizar "${gestion.descripcion}". Inténtalo de nuevo.`
        );
      }

      return { ok: false };
    }
  };

  const handleIrACrear = () => {
    if (typeof onCrearEvento === 'function') {
      onCrearEvento('crear');
    } else if (typeof setPestanaActiva === 'function') {
      setPestanaActiva('crear');
    } else {
      navigate('/crear');
    }
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

  const gestionesAtrasadas = useMemo(
    () => atrasadasRaw.filter((g) => !g.completada).sort(compararPrioridad),
    [atrasadasRaw]
  );

  const gestionesHoy = useMemo(
    () => hoyRaw.filter((g) => !g.completada).sort(compararPrioridad),
    [hoyRaw]
  );

  const gestionesProximas = useMemo(
    () => proximasRaw.filter((g) => !g.completada).sort(compararPrioridad),
    [proximasRaw]
  );

  const gestionesCompletadas = useMemo(
    () =>
      completadasRaw
        .filter((g) => g.completada)
        .sort((a, b) => compararPrioridad(b, a)),
    [completadasRaw]
  );

  const prioridadPorId = useMemo(() => {
    const mapa = {};

    [...gestionesAtrasadas, ...gestionesHoy, ...gestionesProximas]
      .forEach((g, i) => {
        mapa[g.id] = i + 1;
      });

    return mapa;
  }, [gestionesAtrasadas, gestionesHoy, gestionesProximas]);

  const totalPendientes =
    gestionesAtrasadas.length +
    gestionesHoy.length +
    gestionesProximas.length;

  const hayGestiones =
    totalPendientes + gestionesCompletadas.length > 0;

  const horasTotalesHoy = gestionesHoy.reduce(
    (acc, g) => acc + (parseFloat(g.horas_estimadas) || 0),
    0
  );

  const porcentajeCarga =
    limiteDiarioMax > 0
      ? Math.min((horasTotalesHoy / limiteDiarioMax) * 100, 100)
      : 0;

  const fechaHoyBruta = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const fechaHoyTexto =
    fechaHoyBruta.charAt(0).toUpperCase() + fechaHoyBruta.slice(1);

  const aplicarSolucion = (tipoSolucion) => {
    if (tipoSolucion === 'ignorar') {
      setAlertaIgnorada(true);
      mostrarMensaje('exito', 'Has decidido mantener tu agenda actual.');
    } else if (
      tipoSolucion === 'reprogramar' &&
      gestionesHoy.length > 0
    ) {
      const ultima = gestionesHoy[gestionesHoy.length - 1];

      registrar(ultima, 'pospuesto', {
        fecha: fechaOffsetStr(1),
        nota: 'Reprogramado por sobrecarga del día'
      });
    }
  };

  const primeraCarga = cargando && !cargado;

  // El filtro solo se muestra cuando ya cargó y existe al menos un evento
  const hayEventos = cargado && eventos.length > 0;

  // El encabezado solo se muestra cuando ya cargó y existe al menos una subtarea
  // (se usa el total sin filtrar para que el selector no desaparezca con un filtro sin resultados)
  const hayGestionesTotales = cargado && todasLasGestiones.length > 0;

  return (
    <div className={`${UI.pagina} min-w-0 max-w-full overflow-x-hidden`}>
      {mensaje.texto && (
        <div aria-hidden="true" className="break-words">
          <Aviso tipo={mensaje.tipo} texto={mensaje.texto} />
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {mensaje.tipo !== 'error' ? mensaje.texto : ''}
      </div>

      <div role="alert" className="sr-only">
        {mensaje.tipo === 'error' ? mensaje.texto : ''}
      </div>

      {hayGestionesTotales ? (
        <EncabezadoPagina titulo="Subtareas" subtitulo={fechaHoyTexto}>
          {hayEventos && (
            <div className="w-full sm:w-auto">
              <div className={`${UI.filtro} w-full sm:w-auto`}>
                <SlidersHorizontal
                  className="w-4 h-4 text-slate-500 flex-shrink-0"
                  aria-hidden="true"
                />

                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  aria-label="Filtrar eventos"
                  className={`${UI.filtroSelect} ${FOCO} w-full min-w-0 ${CAMPO_MOVIL} ${TACTIL}`}
                >
                  <option value="todos">Todos los eventos</option>
                  <option value="en_preparacion">En preparación</option>
                  <option value="completados">Completados</option>
                </select>
              </div>
            </div>
          )}
        </EncabezadoPagina>
      ) : (
        // Estado vacío: sin título visible, pero se conserva la fecha.
        // El h1 queda oculto para lectores de pantalla (la página siempre necesita uno).
        <>
          <h1 className="sr-only">Subtareas</h1>
          <p className="text-base text-slate-600 font-medium">
            {fechaHoyTexto}
          </p>
        </>
      )}

      {primeraCarga && (
        <div role="status" aria-live="polite">
          <PantallaCarga
            icono={CalendarClock}
            titulo="Estamos preparando tu día"
            texto="Organizamos tus subtareas por prioridad. Tomará solo un momento."
          />
        </div>
      )}

      {error && !primeraCarga && !cargado && (
        <div role="alert" className="flex flex-col items-center justify-center text-center py-10 sm:py-16 px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 text-red-600">
            <WifiOff className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
          </div>

          <h2 className={`${UI.cargandoTitulo} mb-2`}>
            No pudimos cargar tus actividades
          </h2>

          <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
            Parece que perdimos la conexión. Compruébala e inténtalo de nuevo.
          </p>

          <button
            type="button"
            onClick={() => cargar()}
            className={`${UI.btnPrimario} ${FOCO} w-full sm:w-auto justify-center ${TACTIL}`}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Volver a intentar
          </button>
        </div>
      )}

      {cargado &&
        (eventos.length === 0 ? (
          <div className={`${UI.tarjeta} p-6 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 my-6 sm:my-12`}>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <Calendar className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <h2 className={UI.cargandoTitulo}>
                ¡Todo listo por hoy!
              </h2>
              <p className="text-sm text-slate-600">
                No tienes subtareas urgentes hoy.
              </p>
            </div>

            {/* Identificador utilizado por el tour interactivo */}
            <button
              id="btn-crear-evento"
              type="button"
              onClick={handleIrACrear}
              className={`${UI.btnPrimario} ${FOCO} mt-2 w-full sm:w-auto justify-center ${TACTIL}`}
            >
              <span aria-hidden="true">+</span> Crear un evento
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Metrica
                icono={Calendar}
                fondo="bg-cyan-700"
                valor={gestionesHoy.length}
                etiqueta="Subtareas para hoy"
              />

              <Metrica
                icono={ClipboardList}
                fondo="bg-[#7E22CE]"
                valor={
                  filtroEstado === 'completados'
                    ? gestionesCompletadas.length
                    : totalPendientes
                }
                etiqueta={
                  filtroEstado === 'completados'
                    ? 'Subtareas completadas'
                    : 'Subtareas pendientes'
                }
              />

              <Metrica
                icono={Clock}
                fondo="bg-slate-600"
                valor={gestionesProximas.length}
                etiqueta="Subtareas próximas"
              />
            </div>

            <div className="min-w-0">
              <CargaGestionWidget
                horasTotalesHoy={horasTotalesHoy}
                limiteDiarioMax={limiteDiarioMax}
                alertaIgnorada={alertaIgnorada}
                porcentajeCarga={porcentajeCarga}
                aplicarSolucion={aplicarSolucion}
              />
            </div>

            <div className="space-y-3">
              <h2
                ref={tituloListaRef}
                tabIndex={-1}
                className={`${UI.h2} focus:outline-none`}
              >
                Subtareas de hoy
              </h2>

              <div className="bg-[#E6F7F8] border border-[#A7ECEE] rounded-2xl px-3 py-2.5 sm:px-4 flex items-center gap-3 text-[#0D6E72] text-sm">
                <AyudaPrioridad />

                <p className="min-w-0">
                  Tus subtareas se ordenan por urgencia; el número indica tu
                  prioridad.
                </p>
              </div>
            </div>

            {!hayGestiones ? (
              <div className="bg-[#F8FAFC]/50 border-2 border-dashed border-slate-300 rounded-2xl p-4 sm:p-6 text-slate-600 text-sm">
                No hay subtareas que coincidan con este filtro.
              </div>
            ) : (
              <div className="space-y-6">
                <SeccionGestiones
                  tipo="atrasadas"
                  gestiones={gestionesAtrasadas}
                  prioridadPorId={prioridadPorId}
                  onRegistrar={registrar}
                />

                <SeccionGestiones
                  tipo="hoy"
                  gestiones={gestionesHoy}
                  prioridadPorId={prioridadPorId}
                  onRegistrar={registrar}
                />

                <SeccionGestiones
                  tipo="proximas"
                  gestiones={gestionesProximas}
                  prioridadPorId={prioridadPorId}
                  onRegistrar={registrar}
                />

                <SeccionGestiones
                  tipo="completadas"
                  gestiones={gestionesCompletadas}
                  prioridadPorId={prioridadPorId}
                  onRegistrar={registrar}
                />
              </div>
            )}
          </>
        ))}
    </div>
  );
};

export default Hoy;