import { Clock, Info, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Aviso, EncabezadoPagina, UI } from '../components/ui';
import { authService } from '../services/authService';

// Anillo de foco visible y consistente para los controles definidos en este archivo
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2';

// Los campos usan 16px en móvil para que iOS no haga zoom automático al enfocarlos;
// w-full/min-w-0 evita que los inputs de fecha y número desborden su contenedor
const CAMPO = 'w-full min-w-0 !text-base sm:!text-sm';

// Áreas táctiles de 44px en móvil/tablet
const TACTIL = 'min-h-[44px] md:min-h-0';

// Safari/iOS: el input de fecha ignora el ancho del contenedor y se sale del diálogo mientras conserve su apariencia nativa.
// appearance-none + min-w-0 lo obliga a respetar el ancho; min-h evita que colapse cuando está vacío.
const FECHA_IOS = 'appearance-none block min-w-0 max-w-full min-h-[3.25rem] sm:min-h-0 [&::-webkit-date-and-time-value]:text-left';

const nuevaGestion = () => ({ id: Date.now() + Math.random(), descripcion: '', plazo: '', horas_estimadas: '' });

// Evita errores de coma flotante al sumar horas (0.1 + 0.2, etc.)
const redondear = (n) => Math.round(n * 100) / 100;

const CrearEvento = ({ onEventoCreado }) => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';

  // Fecha local en formato YYYY-MM-DD
  const hoyLocal = new Date();
  const year = hoyLocal.getFullYear();
  const month = String(hoyLocal.getMonth() + 1).padStart(2, '0');
  const day = String(hoyLocal.getDate()).padStart(2, '0');
  const hoyStr = `${year}-${month}-${day}`;

  const [formEvento, setFormEvento] = useState({
    nombre: '',
    tipo: '',
    fecha: '',
    limite_diario_horas: ''
  });

  const [gestiones, setGestiones] = useState([nuevaGestion()]);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [errores, setErrores] = useState({});
  const timerMensaje = useRef(null);
  const focoPendiente = useRef(null); // id del elemento que debe recibir el foco tras un cambio en la lista

  const mostrarMensaje = (tipo, texto) => {
    clearTimeout(timerMensaje.current);
    setMensaje({ tipo, texto });
    timerMensaje.current = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };
  useEffect(() => () => clearTimeout(timerMensaje.current), []);

  // Tras agregar o eliminar una subtarea, el foco no se pierde
  useEffect(() => {
    if (focoPendiente.current) {
      document.getElementById(focoPendiente.current)?.focus();
      focoPendiente.current = null;
    }
  }, [gestiones]);

  const handleSesionExpirada = () => {
    authService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const handleGestionChange = (id, field, value) => {
    setGestiones(gestiones.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleAgregarSubtarea = () => {
    const nueva = nuevaGestion();
    focoPendiente.current = `subtarea-descripcion-${nueva.id}`;
    setGestiones([...gestiones, nueva]);
  };

  const handleEliminarSubtarea = (id) => {
    if (gestiones.length === 1) {
      const nueva = nuevaGestion();
      focoPendiente.current = `subtarea-descripcion-${nueva.id}`;
      setGestiones([nueva]);
      return;
    }
    focoPendiente.current = 'btn-agregar-subtarea';
    setGestiones(gestiones.filter(g => g.id !== id));
  };

  // --- LÓGICA DE HORAS GLOBALES Y AVISO ---
  const limiteGlobal = parseFloat(formEvento.limite_diario_horas) || 0;

  const horasAsignadasTotal = redondear(
    gestiones.reduce((acc, g) => {
      const h = parseFloat(g.horas_estimadas);
      return acc + (!isNaN(h) && h > 0 ? h : 0);
    }, 0)
  );

  const hayExcesoGlobal = limiteGlobal > 0 && horasAsignadasTotal > limiteGlobal;

  // --- VALIDACIÓN DE CADA SUBTAREA (se recalcula en cada cambio) ---
  // Reglas: plazo no anterior a hoy ni posterior a la fecha del evento;
  // horas válidas y sin superar el límite del evento; nombre obligatorio si hay plazo u horas.
  const erroresGestiones = {};
  gestiones.forEach((g) => {
    const e = {};
    const tieneHoras = g.horas_estimadas !== '' && g.horas_estimadas !== null;

    if ((g.plazo || tieneHoras) && !g.descripcion.trim()) {
      e.descripcion = 'Escribe el nombre de la subtarea.';
    }

    if (g.plazo) {
      if (g.plazo < hoyStr) {
        e.plazo = 'El plazo no puede ser anterior a hoy.';
      } else if (formEvento.fecha && g.plazo > formEvento.fecha) {
        e.plazo = 'El plazo no puede ser posterior a la fecha límite del evento.';
      }
    }

    if (tieneHoras) {
      const h = parseFloat(g.horas_estimadas);
      if (isNaN(h) || h < 0) {
        e.horas = 'Ingresa un número de horas válido (0 o más).';
      } else if (limiteGlobal > 0 && h > limiteGlobal) {
        e.horas = `No puede superar el límite del evento (${limiteGlobal} h).`;
      }
    }

    if (Object.keys(e).length > 0) erroresGestiones[g.id] = e;
  });

  const hayErroresGestiones = Object.keys(erroresGestiones).length > 0;

  // Devuelve los errores y el id del primer campo inválido (en orden visual)
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formEvento.nombre.trim()) nuevosErrores.nombre = 'Escribe el nombre del evento.';
    if (!formEvento.tipo) nuevosErrores.tipo = 'Selecciona un tipo de evento.';
    if (!formEvento.fecha) {
      nuevosErrores.fecha = 'Selecciona la fecha límite del evento.';
    } else if (formEvento.fecha < hoyStr) {
      nuevosErrores.fecha = 'La fecha no puede ser anterior a hoy. Elige hoy o una fecha futura.';
    }

    if (
      formEvento.limite_diario_horas === '' ||
      isNaN(formEvento.limite_diario_horas) ||
      parseFloat(formEvento.limite_diario_horas) <= 0
    ) {
      nuevosErrores.limite_diario_horas = 'Ingresa un número de horas mayor a 0.';
    }

    setErrores(nuevosErrores);

    const orden = ['nombre', 'tipo', 'fecha', 'limite_diario_horas'];
    const primero = orden.find((c) => nuevosErrores[c]);
    const hayErrores = Boolean(primero);

    // Primer campo inválido dentro de las subtareas
    let idSubtarea = null;
    for (const g of gestiones) {
      const e = erroresGestiones[g.id];
      if (!e) continue;
      if (e.descripcion) idSubtarea = `subtarea-descripcion-${g.id}`;
      else if (e.plazo) idSubtarea = `subtarea-plazo-${g.id}`;
      else if (e.horas) idSubtarea = `subtarea-horas-${g.id}`;
      break;
    }

    return {
      ok: !hayErrores && !hayExcesoGlobal && !hayErroresGestiones,
      // El foco va al primer error visible; si solo falla el total de horas, al campo del límite
      idPrimero: primero
        ? `campo-${primero}`
        : idSubtarea || (hayExcesoGlobal ? 'campo-limite_diario_horas' : null)
    };
  };

  const limpiarFormulario = () => {
    setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
    setGestiones([nuevaGestion()]);
    setErrores({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { ok, idPrimero } = validarFormulario();
    if (!ok) {
      mostrarMensaje('error', 'Hay campos con errores. Corrígelos para guardar el evento.');
      if (idPrimero) document.getElementById(idPrimero)?.focus();
      return;
    }

    const gestionesConDescripcion = gestiones.filter(
      g => g.descripcion && g.descripcion.trim() !== ''
    );

    const token = localStorage.getItem('token') || authService.getToken();

    if (!token) {
      handleSesionExpirada();
      return;
    }

    setCargando(true);

    try {
      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

      const gestionesValidas = gestionesConDescripcion.map(g => ({
        descripcion: g.descripcion.trim(),
        plazo: g.plazo || formEvento.fecha,
        horas_estimadas: parseFloat(g.horas_estimadas) || 0,
        completada: false
      }));

      const payload = {
        nombre: formEvento.nombre.trim(),
        tipo: formEvento.tipo,
        fecha: formEvento.fecha,
        limite_diario_horas: limiteGlobal,
        gestiones: gestionesValidas
      };

      const resEvento = await fetch(`${baseUrl}eventos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (resEvento.status === 401 || resEvento.status === 403) {
        handleSesionExpirada();
        return;
      }

      if (!resEvento.ok) {
        const errData = await resEvento.json();

        const formatearError = (obj) => {
          if (typeof obj === 'string') return obj;
          if (Array.isArray(obj)) return obj.map(formatearError).join(', ');
          if (typeof obj === 'object' && obj !== null) {
            return Object.entries(obj)
              .map(([k, v]) => `${k}: ${formatearError(v)}`)
              .join(' | ');
          }
          return String(obj);
        };

        throw new Error(formatearError(errData));
      }

      mostrarMensaje('exito', '¡Evento y plan inicial creados con éxito!');
      limpiarFormulario();

      if (onEventoCreado) onEventoCreado();
    } catch (err) {
      mostrarMensaje('error', 'No se pudo guardar el evento. Revisa los datos e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  // Atributos comunes de accesibilidad para un campo con posible error
  const propsCampo = (campo, ayudaId) => {
    const ids = [ayudaId, errores[campo] ? `error-${campo}` : null].filter(Boolean).join(' ');
    return {
      id: `campo-${campo}`,
      'aria-required': 'true',
      'aria-invalid': errores[campo] ? 'true' : 'false',
      'aria-describedby': ids || undefined
    };
  };

  // Atributos de accesibilidad para un campo de subtarea con posible error
  const propsSub = (gest, campo, nombreId) => {
    const hayError = Boolean(erroresGestiones[gest.id]?.[campo]);
    return {
      id: `${nombreId}-${gest.id}`,
      'aria-invalid': hayError ? 'true' : 'false',
      'aria-describedby': hayError ? `error-${nombreId}-${gest.id}` : undefined
    };
  };

  const MensajeError = ({ campo }) =>
    errores[campo] ? (
      <p id={`error-${campo}`} role="alert" className={`${UI.error} break-words`}>
        {errores[campo]}
      </p>
    ) : null;

  const ErrorSub = ({ gest, campo, nombreId }) =>
    erroresGestiones[gest.id]?.[campo] ? (
      <p id={`error-${nombreId}-${gest.id}`} className={`${UI.error} break-words`}>
        {erroresGestiones[gest.id][campo]}
      </p>
    ) : null;

  const Asterisco = () => (
    <span className="text-red-700" aria-hidden="true">*</span>
  );

  return (
    <div className={`${UI.pagina} min-w-0 max-w-full overflow-x-hidden`}>
      {/* Aviso visible (oculto al lector de pantalla para no duplicar) */}
      {mensaje.texto && (
        <div aria-hidden="true" className="break-words">
          <Aviso tipo={mensaje.tipo} texto={mensaje.texto} />
        </div>
      )}
      {/* Regiones en vivo siempre presentes: anuncian éxito y errores */}
      <div role="status" aria-live="polite" className="sr-only">
        {mensaje.tipo !== 'error' ? mensaje.texto : ''}
      </div>
      <div role="alert" className="sr-only">
        {mensaje.tipo === 'error' ? mensaje.texto : ''}
      </div>

      <EncabezadoPagina
        titulo="Crear evento"
        subtitulo="Registra los datos generales del evento y añade sus subtareas."
      />

      <form onSubmit={handleSubmit} noValidate aria-busy={cargando} className="space-y-4 sm:space-y-6">
        {/* SECCIÓN 1: DATOS DEL EVENTO */}
        <section aria-labelledby="titulo-datos-evento" className={`${UI.tarjeta} space-y-5 sm:space-y-6 min-w-0`}>
          <h2 id="titulo-datos-evento" className={UI.h2}>Datos del evento</h2>
          <p className="text-xs text-slate-600">
            Los campos marcados con <span aria-hidden="true" className="text-red-700">*</span>
            <span className="sr-only">asterisco</span> son obligatorios.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Nombre del Evento */}
            <div className="min-w-0">
              <label htmlFor="campo-nombre" className={UI.label}>
                Nombre del evento <Asterisco />
              </label>
              <input
                type="text"
                placeholder="Ej. Lanzamiento Producto X"
                autoComplete="off"
                className={`${errores.nombre ? UI.inputError : UI.input} ${CAMPO} ${FOCO}`}
                value={formEvento.nombre}
                {...propsCampo('nombre')}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, nombre: e.target.value });
                  if (errores.nombre) setErrores({ ...errores, nombre: null });
                }}
              />
              <MensajeError campo="nombre" />
            </div>

            {/* Tipo de Evento */}
            <div className="min-w-0">
              <label htmlFor="campo-tipo" className={UI.label}>
                Tipo <Asterisco />
              </label>
              <select
                className={`${errores.tipo ? UI.inputError : UI.input} ${CAMPO} cursor-pointer ${FOCO}`}
                value={formEvento.tipo}
                {...propsCampo('tipo')}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, tipo: e.target.value });
                  if (errores.tipo) setErrores({ ...errores, tipo: null });
                }}
              >
                <option value="">Selecciona el tipo de evento</option>
                <option value="Corporativo">Corporativo</option>
                <option value="Social">Social</option>
                <option value="Academico">Académico</option>
                <option value="Otro">Otro</option>
              </select>
              <MensajeError campo="tipo" />
            </div>

            {/* Fecha límite del Evento */}
            <div className="min-w-0">
              <label htmlFor="campo-fecha" className={UI.label}>
                Fecha límite del evento <Asterisco />
              </label>
              <input
                type="date"
                min={hoyStr}
                className={`${errores.fecha ? UI.inputError : UI.input} ${CAMPO} ${FECHA_IOS} ${FOCO}`}
                value={formEvento.fecha}
                {...propsCampo('fecha')}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, fecha: e.target.value });
                  if (errores.fecha) setErrores({ ...errores, fecha: null });
                }}
              />
              <MensajeError campo="fecha" />
            </div>

            {/* Límite diario de carga de trabajo */}
            <div className="min-w-0">
              <label htmlFor="campo-limite_diario_horas" className={UI.label}>
                Límite diario de carga de trabajo (horas) <Asterisco />
              </label>
              <div className="relative">
                {/* En móvil el sufijo se reduce a "h" para no pisar el valor escrito */}
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  inputMode="decimal"
                  placeholder="Ej. 6"
                  className={`${errores.limite_diario_horas ? UI.inputError : UI.input} ${CAMPO} pr-14 sm:pr-40 ${FOCO}`}
                  value={formEvento.limite_diario_horas}
                  {...propsCampo('limite_diario_horas', 'ayuda-limite')}
                  onChange={(e) => {
                    setFormEvento({ ...formEvento, limite_diario_horas: e.target.value });
                    if (errores.limite_diario_horas)
                      setErrores({ ...errores, limite_diario_horas: null });
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-medium pointer-events-none flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5 hidden sm:block" /> h
                  <span className="hidden sm:inline">(límite total)</span>
                </span>
              </div>
              <p id="ayuda-limite" className="text-xs text-slate-600 mt-2 font-medium flex items-start sm:items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
                Total máximo de horas estimadas para todas las subtareas.
              </p>
              <MensajeError campo="limite_diario_horas" />
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: SUBTAREAS INICIALES */}
        <section aria-labelledby="titulo-subtareas" className={`${UI.tarjeta} space-y-5 sm:space-y-6 min-w-0`}>
          <div>
            <h2 id="titulo-subtareas" className={UI.h2}>Subtareas iniciales</h2>
            <p className={UI.subtitulo}>
              Define las subtareas necesarias para organizar el evento. Cada plazo debe estar entre hoy y la fecha
              límite del evento.
            </p>
          </div>

          {/* BANNER DE AVISO OPCIONAL */}
          <div className="bg-purple-50/60 border border-purple-100 text-purple-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-purple-700 shrink-0" aria-hidden="true" />
            <span>No es obligatorio crear una subtarea</span>
          </div>

          {/* AVISO DINÁMICO DE CARGA DE TRABAJO (se anuncia cuando cambia; el estado se dice con texto, no solo con color) */}
          <div role="status" aria-live="polite">
            {horasAsignadasTotal > 0 && (
              <div
                className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  hayExcesoGlobal
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <Clock
                    aria-hidden="true"
                    className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                      hayExcesoGlobal ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  />
                  <p className="text-xs font-medium min-w-0">
                    {hayExcesoGlobal ? (
                      <>
                        Asignaste <strong>{horasAsignadasTotal} h</strong> y el límite es{' '}
                        <strong>{limiteGlobal} h</strong>. Reduce las horas de las subtareas o
                        aumenta el límite.
                      </>
                    ) : (
                      <>
                        Distribución correcta: <strong>{horasAsignadasTotal} h</strong>{' '}
                        asignadas de un límite diario de carga de trabajo de{' '}
                        <strong>{limiteGlobal} h</strong>.
                      </>
                    )}
                  </p>
                </div>

                {hayExcesoGlobal ? (
                  <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg shrink-0">
                    Exceso de {redondear(horasAsignadasTotal - limiteGlobal)} h
                  </span>
                ) : (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg shrink-0">
                    En rango
                  </span>
                )}
              </div>
            )}
          </div>

          {/* TÍTULOS DE COLUMNAS: solo en tablet/escritorio (en móvil cada campo muestra su propia etiqueta) */}
          <div
            aria-hidden="true"
            className="hidden md:grid grid-cols-12 gap-3 px-1 text-slate-600 text-xs font-bold uppercase tracking-wider"
          >
            <span className="col-span-6">NOMBRE DE LA SUBTAREA</span>
            <span className="col-span-3">PLAZO</span>
            <span className="col-span-2">HORAS ESTIMADAS.</span>
            <span className="col-span-1"></span>
          </div>

          {/* LISTADO DE SUBTAREAS: tarjetas apiladas hasta md; fila de 12 columnas desde md */}
          <div className="space-y-3 md:space-y-4">
            {gestiones.map((gest, i) => (
              <div
                key={gest.id}
                role="group"
                aria-label={`Subtarea ${i + 1}`}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 md:items-start
                  border border-slate-200 rounded-2xl p-3 sm:p-4 md:border-0 md:rounded-none md:p-0"
              >
                {/* Nombre */}
                <div className="sm:col-span-2 md:col-span-6 min-w-0">
                  <label htmlFor={`subtarea-descripcion-${gest.id}`} className="block text-xs font-semibold text-slate-700 mb-1 md:sr-only">
                    Nombre de la subtarea {i + 1}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Confirmar catering"
                    autoComplete="off"
                    className={`${erroresGestiones[gest.id]?.descripcion ? UI.inputError : UI.input} ${CAMPO} ${FOCO}`}
                    value={gest.descripcion}
                    {...propsSub(gest, 'descripcion', 'subtarea-descripcion')}
                    onChange={(e) => handleGestionChange(gest.id, 'descripcion', e.target.value)}
                  />
                  <ErrorSub gest={gest} campo="descripcion" nombreId="subtarea-descripcion" />
                </div>

                {/* Plazo */}
                <div className="md:col-span-3 min-w-0">
                  <label htmlFor={`subtarea-plazo-${gest.id}`} className="block text-xs font-semibold text-slate-700 mb-1 md:sr-only">
                    Plazo de la subtarea {i + 1}
                  </label>
                  <input
                    type="date"
                    min={hoyStr}
                    max={formEvento.fecha || undefined}
                    className={`${erroresGestiones[gest.id]?.plazo ? UI.inputError : UI.input} ${CAMPO} ${FECHA_IOS} ${FOCO}`}
                    value={gest.plazo}
                    {...propsSub(gest, 'plazo', 'subtarea-plazo')}
                    onChange={(e) => handleGestionChange(gest.id, 'plazo', e.target.value)}
                  />
                  <ErrorSub gest={gest} campo="plazo" nombreId="subtarea-plazo" />
                </div>

                {/* Horas estimadas */}
                <div className="md:col-span-2 min-w-0">
                  <label htmlFor={`subtarea-horas-${gest.id}`} className="block text-xs font-semibold text-slate-700 mb-1 md:sr-only">
                    Horas estimadas de la subtarea {i + 1}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={limiteGlobal > 0 ? limiteGlobal : undefined}
                    inputMode="decimal"
                    placeholder="Ej. 2.5"
                    className={`${erroresGestiones[gest.id]?.horas ? UI.inputError : UI.input} ${CAMPO} ${FOCO}`}
                    value={gest.horas_estimadas}
                    {...propsSub(gest, 'horas', 'subtarea-horas')}
                    onChange={(e) => handleGestionChange(gest.id, 'horas_estimadas', e.target.value)}
                  />
                  <ErrorSub gest={gest} campo="horas" nombreId="subtarea-horas" />
                </div>

                {/* Eliminar: en móvil lleva texto visible; en escritorio solo el icono */}
                <div className="sm:col-span-2 md:col-span-1 flex justify-end md:justify-center md:pt-1.5">
                  <button
                    type="button"
                    onClick={() => handleEliminarSubtarea(gest.id)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 md:px-1.5 py-1.5 min-h-[44px] md:min-h-0 text-sm text-slate-600 hover:text-red-700 rounded-lg transition cursor-pointer ${FOCO}`}
                    aria-label={`Eliminar subtarea ${i + 1}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span className="md:hidden" aria-hidden="true">Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            id="btn-agregar-subtarea"
            type="button"
            onClick={handleAgregarSubtarea}
            className={`${UI.btnAgregarSm} ${FOCO} w-full sm:w-auto justify-center ${TACTIL}`}
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Agregar otra subtarea
          </button>
        </section>

        {/* BOTONES FINALES: apilados a ancho completo en móvil (acción principal arriba) */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
          <button type="button" onClick={limpiarFormulario} className={`${UI.btnSecundario} ${FOCO} w-full sm:w-auto justify-center ${TACTIL}`}>
            Limpiar formulario
          </button>

          <button type="submit" disabled={cargando} className={`${UI.btnPrimario} ${FOCO} w-full sm:w-auto justify-center ${TACTIL}`}>
            {cargando ? 'Guardando...' : 'Guardar evento'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrearEvento;