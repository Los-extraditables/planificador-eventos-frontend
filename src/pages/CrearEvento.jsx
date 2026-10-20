import { Clock, Info, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Aviso, EncabezadoPagina, UI } from '../components/ui';
import { authService } from '../services/authService';

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

  const [gestiones, setGestiones] = useState([
    { id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }
  ]);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [errores, setErrores] = useState({});
  const timerMensaje = useRef(null);

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

  const handleGestionChange = (id, field, value) => {
    setGestiones(gestiones.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleAgregarSubtarea = () => {
    setGestiones([
      ...gestiones,
      { id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }
    ]);
  };

  const handleEliminarSubtarea = (id) => {
    if (gestiones.length === 1) {
      setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);
      return;
    }
    setGestiones(gestiones.filter(g => g.id !== id));
  };

  // --- LÓGICA DE HORAS GLOBALES Y AVISO ---
  const limiteGlobal = parseFloat(formEvento.limite_diario_horas) || 0;

  const horasAsignadasTotal = gestiones.reduce((acc, g) => {
    const h = parseFloat(g.horas_estimadas);
    return acc + (!isNaN(h) && h > 0 ? h : 0);
  }, 0);

  const hayExcesoGlobal = limiteGlobal > 0 && horasAsignadasTotal > limiteGlobal;

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formEvento.nombre.trim()) nuevosErrores.nombre = 'Este campo es obligatorio.';
    if (!formEvento.tipo) nuevosErrores.tipo = 'Selecciona un tipo.';
    if (!formEvento.fecha) {
      nuevosErrores.fecha = 'Este campo es obligatorio.';
    } else if (formEvento.fecha < hoyStr) {
      nuevosErrores.fecha = 'La fecha no puede ser anterior a hoy.';
    }

    if (
      formEvento.limite_diario_horas === '' ||
      isNaN(formEvento.limite_diario_horas) ||
      parseFloat(formEvento.limite_diario_horas) <= 0
    ) {
      nuevosErrores.limite_diario_horas = 'Ingresa un número mayor a 0.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0 && !hayExcesoGlobal;
  };

  const limpiarFormulario = () => {
    setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
    setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);
    setErrores({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      mostrarMensaje('error', 'Por favor corrige los campos con errores.');
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

  return (
    <div className={UI.pagina}>
      {mensaje.texto && <Aviso tipo={mensaje.tipo} texto={mensaje.texto} />}

      <EncabezadoPagina
        titulo="Crear evento"
        subtitulo="Registra los datos generales del evento y añade sus subtareas."
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* SECCIÓN 1: DATOS DEL EVENTO */}
        <div className={`${UI.tarjeta} space-y-6`}>
          <h2 className={UI.h2}>Datos del evento</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Nombre del Evento */}
            <div>
              <label className={UI.label}>
                Nombre del evento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Lanzamiento Producto X"
                className={errores.nombre ? UI.inputError : UI.input}
                value={formEvento.nombre}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, nombre: e.target.value });
                  if (errores.nombre) setErrores({ ...errores, nombre: null });
                }}
              />
              {errores.nombre && <p className={UI.error}>{errores.nombre}</p>}
            </div>

            {/* Tipo de Evento */}
            <div>
              <label className={UI.label}>
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                className={`${errores.tipo ? UI.inputError : UI.input} cursor-pointer`}
                value={formEvento.tipo}
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
              {errores.tipo && <p className={UI.error}>{errores.tipo}</p>}
            </div>

            {/* Fecha límite del Evento */}
            <div>
              <label className={UI.label}>
                Fecha límite del evento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={hoyStr}
                className={errores.fecha ? UI.inputError : UI.input}
                value={formEvento.fecha}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, fecha: e.target.value });
                  if (errores.fecha) setErrores({ ...errores, fecha: null });
                }}
              />
              {errores.fecha && <p className={UI.error}>{errores.fecha}</p>}
            </div>

            {/* Límite diario de carga de trabajo */}
            <div>
              <label className={UI.label}>
                Límite diario de carga de trabajo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Ej. 6"
                  className={`${errores.limite_diario_horas ? UI.inputError : UI.input} pr-40`}
                  value={formEvento.limite_diario_horas}
                  onChange={(e) => {
                    setFormEvento({ ...formEvento, limite_diario_horas: e.target.value });
                    if (errores.limite_diario_horas)
                      setErrores({ ...errores, limite_diario_horas: null });
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> h (límite total)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Total máximo de horas estimadas para todas las subtareas.
              </p>
              {errores.limite_diario_horas && (
                <p className={UI.error}>{errores.limite_diario_horas}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: SUBTAREAS INICIALES */}
        <div className={`${UI.tarjeta} space-y-6`}>
          <div>
            <h2 className={UI.h2}>Subtareas iniciales</h2>
            <p className={UI.subtitulo}>Define las subtareas necesarias para organizar el evento.</p>
          </div>

          {/* BANNER DE AVISO OPCIONAL */}
          <div className="bg-purple-50/60 border border-purple-100 text-purple-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>No es obligatorio crear una subtarea</span>
          </div>

          {/* AVISO DINÁMICO DE CARGA DE TRABAJO */}
          {horasAsignadasTotal > 0 && (
            <div
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                hayExcesoGlobal
                  ? 'bg-red-50/70 border-red-200 text-red-950'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock
                  className={`w-4 h-4 shrink-0 ${
                    hayExcesoGlobal ? 'text-red-600' : 'text-emerald-600'
                  }`}
                />
                <p className="text-xs font-medium">
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
                <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg shrink-0">
                  Exceso de {(horasAsignadasTotal - limiteGlobal).toFixed(1)} h
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg shrink-0">
                  En rango
                </span>
              )}
            </div>
          )}

          {/* TÍTULOS DE COLUMNAS */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-1 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span className="col-span-6">NOMBRE DE LA SUBTAREA</span>
            <span className="col-span-3">PLAZO</span>
            <span className="col-span-2">HORAS EST.</span>
            <span className="col-span-1"></span>
          </div>

          {/* LISTADO DE SUBTAREAS */}
          <div className="space-y-4">
            {gestiones.map((gest) => (
              <div key={gest.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Nombre */}
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    placeholder="Ej. Confirmar catering"
                    className={UI.input}
                    value={gest.descripcion}
                    onChange={(e) => handleGestionChange(gest.id, 'descripcion', e.target.value)}
                  />
                </div>

                {/* Plazo */}
                <div className="sm:col-span-3">
                  <input
                    type="date"
                    min={hoyStr}
                    max={formEvento.fecha || undefined}
                    className={UI.input}
                    value={gest.plazo}
                    onChange={(e) => handleGestionChange(gest.id, 'plazo', e.target.value)}
                  />
                </div>

                {/* Horas estimadas */}
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ej. 2.5"
                    className={UI.input}
                    value={gest.horas_estimadas}
                    onChange={(e) => handleGestionChange(gest.id, 'horas_estimadas', e.target.value)}
                  />
                </div>

                {/* Eliminar */}
                <div className="sm:col-span-1 flex justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => handleEliminarSubtarea(gest.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                    title="Eliminar subtarea"
                    aria-label="Eliminar subtarea"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={handleAgregarSubtarea} className={UI.btnAgregarSm}>
            <Plus className="w-4 h-4" /> Agregar otra subtarea
          </button>
        </div>

        {/* BOTONES FINALES */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={limpiarFormulario} className={UI.btnSecundario}>
            Limpiar formulario
          </button>

          <button type="submit" disabled={cargando} className={UI.btnPrimario}>
            {cargando ? 'Guardando...' : 'Guardar evento'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrearEvento;