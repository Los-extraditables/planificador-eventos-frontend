import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const CrearEvento = ({ onEventoCreado }) => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';

  // Fecha de hoy en formato YYYY-MM-DD para validar mínimos
  const hoyStr = new Date().toISOString().split('T')[0];

  // Datos Generales del Evento
  const [formEvento, setFormEvento] = useState({
    nombre: '',
    tipo: '',
    fecha: '',
    limite_diario_horas: ''
  });

  // Plan Logístico Inicial (Array de subtareas)
  const [gestiones, setGestiones] = useState([
    { id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }
  ]);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const handleSesionExpirada = () => {
    authService.logout();
    navigate('/login');
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Manejo de Subtareas / Gestiones
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

  // Envío del Formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formEvento.nombre.trim() || !formEvento.tipo || !formEvento.fecha) {
      mostrarMensaje('error', 'Por favor completa todos los campos requeridos del evento.');
      return;
    }

    // --- VALIDACIÓN 1: Fecha del evento no puede ser anterior a hoy ---
    if (formEvento.fecha < hoyStr) {
      mostrarMensaje('error', 'La fecha del evento no puede ser anterior al día de hoy.');
      return;
    }

    // --- VALIDACIÓN 2: Fechas de las gestiones deben estar entre hoy y la fecha del evento ---
    for (let i = 0; i < gestiones.length; i++) {
      const g = gestiones[i];
      if (g.descripcion.trim()) {
        const plazoGestion = g.plazo || formEvento.fecha;
        
        if (plazoGestion < hoyStr) {
          mostrarMensaje('error', `La gestión "${g.descripcion}" no puede tener un plazo anterior a la fecha actual.`);
          return;
        }
        if (plazoGestion > formEvento.fecha) {
          mostrarMensaje('error', `La gestión "${g.descripcion}" no puede tener un plazo posterior a la fecha del evento (${formEvento.fecha}).`);
          return;
        }
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

      // Filtrar y limpiar gestiones para evitar objetos incompletos
      const gestionesValidas = gestiones
        .filter(g => g.descripcion && g.descripcion.trim() !== '')
        .map(g => ({
          descripcion: g.descripcion.trim(),
          plazo: g.plazo || formEvento.fecha,
          horas_estimadas: String(g.horas_estimadas || '0'),
          completada: false
        }));

      const payload = {
        nombre: formEvento.nombre,
        tipo: formEvento.tipo,
        fecha: formEvento.fecha,
        limite_diario_horas: parseFloat(formEvento.limite_diario_horas) || 6.00,
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

      // Manejo de Error 401 o 403 (Sesión Expirada o no autorizada)
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

      // Resetear formulario
      setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
      setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);

      if (onEventoCreado) onEventoCreado();

    } catch (err) {
      mostrarMensaje('error', err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans text-slate-800 text-left">
      
      {/* Encabezado Principal */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Crear Nuevo Evento y Plan Inicial
        </h1>
        <p className="text-sm text-slate-500">
          Registra los datos generales de tu evento y el desglose opcional de gestiones logísticas.
        </p>
      </div>

      {/* Alerta de Mensajes */}
      {mensaje.texto && (
        <div className={`p-4 rounded-xl mb-6 text-xs font-semibold ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* BLOQUE 1: Datos del Evento */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Datos Generales del Evento
          </h2>

          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Nombre del Evento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Lanzamiento de Producto 2026"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
              value={formEvento.nombre}
              onChange={(e) => setFormEvento({ ...formEvento, nombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Tipo de Evento <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition cursor-pointer"
                value={formEvento.tipo}
                onChange={(e) => setFormEvento({ ...formEvento, tipo: e.target.value })}
              >
                <option value="">Selecciona una categoría</option>
                <option value="Corporativo">Corporativo</option>
                <option value="Social">Social</option>
                <option value="Academico">Académico</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Fecha Límite del Evento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={hoyStr}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
                value={formEvento.fecha}
                onChange={(e) => setFormEvento({ ...formEvento, fecha: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Límite Diario de Carga de Trabajo <span className="text-red-500">*</span>
            </label>
            <div className="relative max-w-xs">
              <input
                type="number"
                required
                step="0.5"
                min="0.5"
                placeholder="Ej. 6.0"
                className="w-full px-4 py-3 pr-16 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
                value={formEvento.limite_diario_horas}
                onChange={(e) => setFormEvento({ ...formEvento, limite_diario_horas: e.target.value })}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                hrs/día
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              ⓘ Límite diario recomendado para distribución de tareas: 6.0 horas.
            </p>
          </div>
        </div>

        {/* BLOQUE 2: Plan Logístico Inicial */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Plan Logístico Inicial (Opcional)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define las gestiones o subtareas clave necesarias para organizar este evento.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-3 mb-2 px-1 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span className="col-span-5">Descripción de la Gestión</span>
            <span className="col-span-3">Plazo Límite</span>
            <span className="col-span-3">Horas Est.</span>
            <span className="col-span-1 text-center">Acción</span>
          </div>

          {gestiones.map((gest, index) => (
            <div key={gest.id} className="grid grid-cols-12 gap-3 items-center mb-3">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder={index === 0 ? "Ej. Reservar salón de conferencias" : "Ej. Confirmar servicio de catering"}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={gest.descripcion}
                  onChange={(e) => handleGestionChange(gest.id, 'descripcion', e.target.value)}
                />
              </div>

              <div className="col-span-3">
                <input
                  type="date"
                  min={hoyStr}
                  max={formEvento.fecha || undefined}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={gest.plazo}
                  onChange={(e) => handleGestionChange(gest.id, 'plazo', e.target.value)}
                />
              </div>

              <div className="col-span-3">
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

              <div className="col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => handleEliminarSubtarea(gest.id)}
                  className="text-slate-400 hover:text-red-600 p-2 rounded-lg transition"
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
            className="mt-3 text-purple-700 font-bold text-xs hover:text-purple-900 inline-flex items-center gap-1.5 transition"
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
            }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
          >
            Limpiar Formulario
          </button>
          
          <button
            type="submit"
            disabled={cargando}
            className="px-6 py-2.5 bg-[#3B0764] hover:bg-[#2E1065] text-white font-bold rounded-xl text-sm transition shadow-md shadow-purple-950/20 disabled:opacity-50"
          >
            {cargando ? 'Guardando Evento...' : 'Guardar Evento'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CrearEvento;