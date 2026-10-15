import { AlertCircle, CheckCircle2, Clock, Info, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const handleSesionExpirada = () => {
    authService.logout();
    navigate('/login');
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const handleGestionChange = (id, field, value) => {
    setGestiones(gestiones.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleAgregarSubtarea = () => {
    setGestiones([
      ...gestiones,
      { id: Date.now(), descripcion: '', plazo: formEvento.fecha || hoyStr, horas_estimadas: '' }
    ]);
  };

  const handleEliminarSubtarea = (id) => {
    if (gestiones.length === 1) {
      setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);
      return;
    }
    setGestiones(gestiones.filter(g => g.id !== id));
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formEvento.nombre.trim()) {
      nuevosErrores.nombre = 'Este campo es obligatorio.';
    }

    if (!formEvento.tipo) {
      nuevosErrores.tipo = 'Selecciona un tipo.';
    }

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
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      mostrarMensaje('error', 'Por favor completa los campos requeridos correctamente.');
      return;
    }

    const limiteHoras = parseFloat(formEvento.limite_diario_horas) || 6;
    const horasPorDia = {};

    for (let i = 0; i < gestiones.length; i++) {
      const g = gestiones[i];
      if (g.descripcion.trim()) {
        const plazoGestion = g.plazo || formEvento.fecha;
        
        if (plazoGestion < hoyStr) {
          mostrarMensaje('error', `La gestión "${g.descripcion}" no puede tener un plazo anterior a la fecha actual.`);
          return;
        }
        if (formEvento.fecha && plazoGestion > formEvento.fecha) {
          mostrarMensaje('error', `La gestión "${g.descripcion}" no puede tener un plazo posterior a la fecha del evento (${formEvento.fecha}).`);
          return;
        }

        const hrs = parseFloat(g.horas_estimadas) || 0;
        horasPorDia[plazoGestion] = (horasPorDia[plazoGestion] || 0) + hrs;
      }
    }

    for (const [fecha, totalHoras] of Object.entries(horasPorDia)) {
      if (totalHoras > limiteHoras) {
        mostrarMensaje(
          'error',
          `La suma de horas para el día ${fecha} (${totalHoras}h) supera el límite diario configurado de ${limiteHoras}h.`
        );
        return;
      }
    }

    const token = authService.getToken();

    if (!token) {
      handleSesionExpirada();
      return;
    }

    setCargando(true);

    try {
      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

      const gestionesValidas = gestiones
        .filter(g => g.descripcion && g.descripcion.trim() !== '')
        .map(g => ({
          descripcion: g.descripcion.trim(),
          plazo: g.plazo || formEvento.fecha,
          horas_estimadas: parseFloat(g.horas_estimadas) || 0,
          completada: false
        }));

      const payload = {
        nombre: formEvento.nombre.trim(),
        tipo: formEvento.tipo,
        fecha: formEvento.fecha,
        limite_diario_horas: limiteHoras,
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

      setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
      setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);
      setErrores({});

      if (onEventoCreado) onEventoCreado();

    } catch (err) {
      mostrarMensaje('error', err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 text-left bg-slate-50/50 min-h-screen">
      
      {/* Encabezado Principal */}
      <div className="mb-6">
        <p className="text-xs sm:text-sm text-slate-500">
          Registra los datos generales del evento y añade sus subtareas.
        </p>
      </div>

      {/* Alerta de Mensajes / Errores */}
      {mensaje.texto && (
        <div className={`p-4 rounded-2xl mb-6 text-sm font-semibold flex items-center justify-between gap-3 shadow-sm transition-all ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {mensaje.tipo === 'exito' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{mensaje.texto}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        
        {/* BLOQUE 1: Datos del Evento */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Datos del Evento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nombre del Evento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Nombre del Evento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Lanzamiento Producto X"
                className={`w-full px-4 py-3 rounded-xl text-sm transition-all bg-[#F8FAFC] border focus:bg-white focus:outline-none ${
                  errores.nombre 
                    ? 'bg-red-50/50 border-red-400 text-red-900 placeholder-slate-400 focus:ring-2 focus:ring-red-400' 
                    : 'border-slate-200 text-slate-800 focus:ring-2 focus:ring-purple-600 focus:border-transparent'
                }`}
                value={formEvento.nombre}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, nombre: e.target.value });
                  if (errores.nombre) setErrores({ ...errores, nombre: null });
                }}
              />
              {errores.nombre && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">{errores.nombre}</p>
              )}
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full px-4 py-3 rounded-xl text-sm transition-all bg-[#F8FAFC] border focus:bg-white focus:outline-none cursor-pointer appearance-none ${
                  errores.tipo 
                    ? 'bg-red-50/50 border-red-400 text-slate-800 focus:ring-2 focus:ring-red-400' 
                    : 'border-slate-200 text-slate-500 focus:ring-2 focus:ring-purple-600 focus:border-transparent'
                }`}
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
              {errores.tipo && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">{errores.tipo}</p>
              )}
            </div>

            {/* Fecha límite */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Fecha límite del Evento <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={hoyStr}
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-all bg-[#F8FAFC] border focus:bg-white focus:outline-none ${
                    errores.fecha 
                      ? 'bg-red-50/50 border-red-400 text-slate-800 focus:ring-2 focus:ring-red-400' 
                      : 'border-slate-200 text-slate-600 focus:ring-2 focus:ring-purple-600 focus:border-transparent'
                  }`}
                  value={formEvento.fecha}
                  onChange={(e) => {
                    setFormEvento({ ...formEvento, fecha: e.target.value });
                    if (errores.fecha) setErrores({ ...errores, fecha: null });
                  }}
                />
              </div>
              {errores.fecha && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">{errores.fecha}</p>
              )}
            </div>

            {/* Límite diario */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Límite diario de carga de trabajo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Ej. 6"
                  className={`w-full px-4 py-3 pr-24 rounded-xl text-sm transition-all bg-[#F8FAFC] border focus:bg-white focus:outline-none ${
                    errores.limite_diario_horas 
                      ? 'bg-red-50/50 border-red-400 text-red-900 focus:ring-2 focus:ring-red-400' 
                      : 'border-slate-200 text-slate-800 focus:ring-2 focus:ring-purple-600 focus:border-transparent'
                  }`}
                  value={formEvento.limite_diario_horas}
                  onChange={(e) => {
                    setFormEvento({ ...formEvento, limite_diario_horas: e.target.value });
                    if (errores.limite_diario_horas) setErrores({ ...errores, limite_diario_horas: null });
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium flex items-center gap-1 pointer-events-none">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> horas/día
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
                <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                Referencia sugerida: 6 horas por día.
              </p>
              {errores.limite_diario_horas && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">{errores.limite_diario_horas}</p>
              )}
            </div>

          </div>
        </div>

        {/* BLOQUE 2: Subtareas Iniciales */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Subtareas iniciales
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define las subtareas necesarias para organizar el evento.
            </p>
          </div>

          {/* Banner de información Lila */}
          <div className="bg-[#F3E8FF]/60 border border-[#E9D5FF] rounded-xl px-4 py-3 flex items-center gap-2 text-[#7E22CE] text-xs font-medium">
            <Info className="w-4 h-4 flex-shrink-0 text-[#8B5CF6]" />
            <span>No es obligatorio crear una subtarea</span>
          </div>

          {/* Encabezado de columnas */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-1 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span className="col-span-6">Nombre de la subtarea</span>
            <span className="col-span-3">Plazo</span>
            <span className="col-span-2">Horas Est.</span>
            <span className="col-span-1 text-center"></span>
          </div>

          {/* Filas de Subtareas */}
          <div className="space-y-3">
            {gestiones.map((gest, index) => (
              <div key={gest.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 sm:p-0 bg-slate-50/50 sm:bg-transparent rounded-xl border border-slate-100 sm:border-none">
                
                {/* Nombre subtarea */}
                <div className="sm:col-span-6">
                  <label className="block sm:hidden text-[11px] font-bold text-slate-500 mb-1">Nombre de la subtarea</label>
                  <input
                    type="text"
                    placeholder="Ej. Confirmar catering"
                    className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
                    value={gest.descripcion}
                    onChange={(e) => handleGestionChange(gest.id, 'descripcion', e.target.value)}
                  />
                </div>

                {/* Plazo */}
                <div className="sm:col-span-3">
                  <label className="block sm:hidden text-[11px] font-bold text-slate-500 mb-1">Plazo</label>
                  <div className="relative">
                    <input
                      type="date"
                      min={hoyStr}
                      max={formEvento.fecha || undefined}
                      className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
                      value={gest.plazo}
                      onChange={(e) => handleGestionChange(gest.id, 'plazo', e.target.value)}
                    />
                  </div>
                </div>

                {/* Horas estimadas */}
                <div className="sm:col-span-2">
                  <label className="block sm:hidden text-[11px] font-bold text-slate-500 mb-1">Horas Est.</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ej. 2.5"
                    className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
                    value={gest.horas_estimadas}
                    onChange={(e) => handleGestionChange(gest.id, 'horas_estimadas', e.target.value)}
                  />
                </div>

                {/* Botón eliminar */}
                <div className="sm:col-span-1 flex justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => handleEliminarSubtarea(gest.id)}
                    className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition cursor-pointer"
                    title="Eliminar subtarea"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botón agregar subtarea */}
          <button
            type="button"
            onClick={handleAgregarSubtarea}
            className="pt-2 text-[#8B5CF6] font-bold text-xs hover:text-purple-800 inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Agregar otra subtarea
          </button>
        </div>

        {/* Botones de Acción inferior */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
              setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);
              setErrores({});
            }}
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm transition cursor-pointer"
          >
            Limpiar Formulario
          </button>
          
          <button
            type="submit"
            disabled={cargando}
            className="px-6 py-2.5 bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {cargando ? 'Guardando Evento...' : 'Guardar Evento'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CrearEvento;