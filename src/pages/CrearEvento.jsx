import React, { useState } from 'react';
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

    // Validar cada gestión individualmente y acumular horas por fecha
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

    // Advertencia opcional si se excede el límite diario configurado
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

      mostrarMensaje('exito', '¡Evento y plan inicial creados con éxito! 🎉');

      setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
      setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);
      setErrores({});

      if (onEventoCreado) onEventoCreado();

    } catch (err) {
      mostrarMensaje('error', err.message);
    } fontFinally: {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 font-sans text-slate-800 text-left">
      
      {/* Encabezado Principal */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mb-1">
          Crear Nuevo Evento y Plan Inicial
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Registra los datos generales de tu evento y el desglose de subtareas logísticas.
        </p>
      </div>

      {/* Alerta de Mensajes / Errores */}
      {mensaje.texto && (
        <div className={`p-4 rounded-2xl mb-6 text-sm font-semibold flex items-center justify-between gap-3 ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <span>{mensaje.tipo === 'exito' ? '✅' : '⚠️'}</span>
            <span>{mensaje.texto}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        
        {/* BLOQUE 1: Datos del Evento */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-5 pb-2 border-b border-slate-100">
            Datos del Evento
          </h2>

          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Nombre del Evento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Lanzamiento Producto X"
              className={`w-full px-4 py-3 rounded-xl text-sm transition focus:outline-none ${
                errores.nombre 
                  ? 'bg-red-50/50 border border-red-400 text-red-900 placeholder-slate-400 focus:ring-2 focus:ring-red-400' 
                  : 'border border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-600'
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full px-4 py-3 rounded-xl text-sm transition focus:outline-none cursor-pointer ${
                  errores.tipo 
                    ? 'bg-red-50/50 border border-red-400 text-slate-800 focus:ring-2 focus:ring-red-400' 
                    : 'bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-600'
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Fecha límite del Evento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={hoyStr}
                className={`w-full px-4 py-3 rounded-xl text-sm transition focus:outline-none ${
                  errores.fecha 
                    ? 'bg-red-50/50 border border-red-400 text-slate-800 focus:ring-2 focus:ring-red-400' 
                    : 'border border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-600'
                }`}
                value={formEvento.fecha}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, fecha: e.target.value });
                  if (errores.fecha) setErrores({ ...errores, fecha: null });
                }}
              />
              {errores.fecha && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">{errores.fecha}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Límite diario de carga de trabajo <span className="text-red-500">*</span>
            </label>
            <div className="relative max-w-md">
              <input
                type="number"
                step="0.5"
                min="0.5"
                placeholder="Ej. 6"
                className={`w-full px-4 py-3 pr-20 rounded-xl text-sm transition focus:outline-none ${
                  errores.limite_diario_horas 
                    ? 'bg-red-50/50 border border-red-400 text-red-900 placeholder-slate-400 focus:ring-2 focus:ring-red-400' 
                    : 'border border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-600'
                }`}
                value={formEvento.limite_diario_horas}
                onChange={(e) => {
                  setFormEvento({ ...formEvento, limite_diario_horas: e.target.value });
                  if (errores.limite_diario_horas) setErrores({ ...errores, limite_diario_horas: null });
                }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                hrs/día
              </span>
            </div>
            {errores.limite_diario_horas && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">{errores.limite_diario_horas}</p>
            )}
          </div>
        </div>

        {/* BLOQUE 2: Plan Logístico Inicial */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Plan Logístico Inicial (Opcional)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define las gestiones o subtareas clave necesarias para organizar este evento.
            </p>
          </div>

          <div className="hidden sm:grid grid-cols-12 gap-3 mb-2 px-1 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span className="col-span-5">Descripción de la Gestión</span>
            <span className="col-span-3">Plazo Límite</span>
            <span className="col-span-3">Horas Est.</span>
            <span className="col-span-1 text-center">Acción</span>
          </div>

          {gestiones.map((gest, index) => (
            <div key={gest.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center mb-3 p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl">
              <div className="sm:col-span-5">
                <label className="block sm:hidden text-[11px] font-bold text-slate-500 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder={index === 0 ? "Ej. Reservar salón de conferencias" : "Ej. Confirmar servicio de catering"}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={gest.descripcion}
                  onChange={(e) => handleGestionChange(gest.id, 'descripcion', e.target.value)}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block sm:hidden text-[11px] font-bold text-slate-500 mb-1">Plazo Límite</label>
                <input
                  type="date"
                  min={hoyStr}
                  max={formEvento.fecha || undefined}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={gest.plazo}
                  onChange={(e) => handleGestionChange(gest.id, 'plazo', e.target.value)}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block sm:hidden text-[11px] font-bold text-slate-500 mb-1">Horas Est.</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0.0"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={gest.horas_estimadas}
                  onChange={(e) => handleGestionChange(gest.id, 'horas_estimadas', e.target.value)}
                />
              </div>

              <div className="sm:col-span-1 flex justify-end sm:justify-center">
                <button
                  type="button"
                  onClick={() => handleEliminarSubtarea(gest.id)}
                  className="text-slate-400 hover:text-red-600 p-2 rounded-lg transition text-sm"
                  title="Eliminar gestión"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAgregarSubtarea}
            className="mt-3 text-purple-700 font-bold text-xs hover:text-purple-900 inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            + Agregar otra gestión
          </button>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
              setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);
              setErrores({});
            }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition cursor-pointer"
          >
            Limpiar Formulario
          </button>
          
          <button
            type="submit"
            disabled={cargando}
            className="px-6 py-2.5 bg-[#3B0764] hover:bg-[#2E1065] text-white font-bold rounded-xl text-sm transition shadow-md shadow-purple-950/20 disabled:opacity-50 cursor-pointer"
          >
            {cargando ? 'Guardando Evento...' : 'Guardar Evento'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CrearEvento;