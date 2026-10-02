import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const DetalleEvento = () => {
  const { id: urlId } = useParams();
  const navigate = useNavigate();

  // Fecha local en formato YYYY-MM-DD
  const hoyLocal = new Date();
  const year = hoyLocal.getFullYear();
  const month = String(hoyLocal.getMonth() + 1).padStart(2, '0');
  const day = String(hoyLocal.getDate()).padStart(2, '0');
  const hoyStr = `${year}-${month}-${day}`;

  const [eventos, setEventos] = useState([]);
  const [eventoSeleccionadoId, setEventoSeleccionadoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados para Modal de Crear / Editar Gestión
  const [modalGestion, setModalGestion] = useState({ abierto: false, modo: 'crear', gestionId: null });
  const [formGestion, setFormGestion] = useState({ descripcion: '', plazo: '', horas_estimadas: '' });

  const rawApiUrl = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
  const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

  const handleSesionExpirada = () => {
    authService.logout();
    navigate('/login');
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

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

  const obtenerEventos = async (reintento = true) => {
    try {
      setCargando(true);
      setError(null);

      const token = authService.getToken();

      if (!token) {
        handleSesionExpirada();
        return;
      }

      const response = await fetch(`${API_URL}/eventos/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleSesionExpirada();
        return;
      }

      if (!response.ok && reintento) {
        await new Promise(res => setTimeout(res, 2000));
        return obtenerEventos(false);
      }

      if (!response.ok) {
        throw new Error('No se pudieron cargar los eventos y gestiones.');
      }

      const data = await response.json();
      setEventos(data);

      if (urlId) {
        setEventoSeleccionadoId(urlId);
      } else if (data.length > 0 && !eventoSeleccionadoId) {
        setEventoSeleccionadoId(data[0].id);
      }
    } catch (err) {
      console.error('Error al obtener eventos:', err);
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerEventos();
  }, [urlId]);

  const eventoActivo = eventos.find(e => String(e.id) === String(eventoSeleccionadoId)) || eventos[0];

  const handleToggleGestion = async (gestion) => {
    try {
      const token = authService.getToken();
      if (!token) return handleSesionExpirada();

      const response = await fetch(`${API_URL}/gestiones/${gestion.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completada: !gestion.completada })
      });

      if (response.status === 401 || response.status === 403) {
        handleSesionExpirada();
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(formatearError(errData));
      }

      obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  const handleAbrirCrear = () => {
    setFormGestion({ descripcion: '', plazo: eventoActivo?.fecha || hoyStr, horas_estimadas: '' });
    setModalGestion({ abierto: true, modo: 'crear', gestionId: null });
  };

  const handleAbrirEditar = (gestion) => {
    setFormGestion({
      descripcion: gestion.descripcion,
      plazo: gestion.plazo || '',
      horas_estimadas: gestion.horas_estimadas ? String(gestion.horas_estimadas) : ''
    });
    setModalGestion({ abierto: true, modo: 'editar', gestionId: gestion.id });
  };

  const handleGuardarGestion = async (e) => {
    e.preventDefault();
    const token = authService.getToken();
    if (!token) return handleSesionExpirada();

    const plazoFinal = formGestion.plazo || eventoActivo?.fecha;
    const nuevasHoras = parseFloat(formGestion.horas_estimadas) || 0;

    if (plazoFinal < hoyStr) {
      mostrarMensaje('error', 'El plazo límite no puede ser anterior a la fecha actual.');
      return;
    }

    if (eventoActivo?.fecha && plazoFinal > eventoActivo.fecha) {
      mostrarMensaje('error', `El plazo de la gestión no puede exceder la fecha límite del evento (${eventoActivo.fecha}).`);
      return;
    }

    // Validación de Carga Horaria Diaria
    const gestionesActuales = eventoActivo?.gestiones || eventoActivo?.gestiones_plan || [];
    const limiteHoras = parseFloat(eventoActivo?.limite_diario_horas) || 6;

    const horasExistentesDia = gestionesActuales
      .filter(g => g.plazo === plazoFinal && g.id !== modalGestion.gestionId)
      .reduce((acc, g) => acc + (parseFloat(g.horas_estimadas) || 0), 0);

    if (horasExistentesDia + nuevasHoras > limiteHoras) {
      mostrarMensaje(
        'error',
        `La suma de horas para la fecha ${plazoFinal} (${horasExistentesDia + nuevasHoras}h) supera el límite diario del evento de ${limiteHoras}h.`
      );
      return;
    }

    try {
      const payloadBase = {
        descripcion: formGestion.descripcion.trim(),
        plazo: plazoFinal,
        horas_estimadas: nuevasHoras,
        completada: false
      };

      if (modalGestion.modo === 'crear') {
        let response = await fetch(`${API_URL}/gestiones/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...payloadBase,
            evento: parseInt(eventoActivo.id, 10),
            evento_id: parseInt(eventoActivo.id, 10)
          })
        });

        if (!response.ok) {
          const payloadEvento = {
            ...eventoActivo,
            gestiones: [...gestionesActuales, payloadBase]
          };

          response = await fetch(`${API_URL}/eventos/${eventoActivo.id}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payloadEvento)
          });
        }

        if (response.status === 401 || response.status === 403) {
          handleSesionExpirada();
          return;
        }

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(formatearError(errData));
        }

        mostrarMensaje('exito', 'Gestión añadida con éxito.');
      } else {
        const response = await fetch(`${API_URL}/gestiones/${modalGestion.gestionId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            descripcion: formGestion.descripcion.trim(),
            plazo: plazoFinal,
            horas_estimadas: nuevasHoras
          })
        });

        if (response.status === 401 || response.status === 403) {
          handleSesionExpirada();
          return;
        }

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(formatearError(errData));
        }

        mostrarMensaje('exito', 'Gestión actualizada correctamente.');
      }

      setModalGestion({ abierto: false, modo: 'crear', gestionId: null });
      obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  const handleEliminarGestion = async (gestionId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta gestión?')) return;

    try {
      const token = authService.getToken();
      if (!token) return handleSesionExpirada();

      const response = await fetch(`${API_URL}/gestiones/${gestionId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        handleSesionExpirada();
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(formatearError(errData) || 'No se pudo eliminar la gestión.');
      }

      mostrarMensaje('exito', 'Gestión eliminada.');
      obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500 font-sans">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold">⏳ Cargando detalle de eventos...</p>
      </div>
    );
  }

  if (error || eventos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 font-sans text-slate-800 text-left">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-4">Detalle de Eventos</h1>
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm mb-4">
          ⚠️ {error || 'No hay eventos disponibles para mostrar. Crea un evento en la pestaña "Crear Evento".'}
        </div>
        <button
          onClick={() => obtenerEventos()}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          Reintentar cargar
        </button>
      </div>
    );
  }

  const gestionesEv = eventoActivo?.gestiones || eventoActivo?.gestiones_plan || [];
  const completadas = gestionesEv.filter(g => g.completada).length;
  const totalGestiones = gestionesEv.length;
  const porcentaje = totalGestiones > 0 ? Math.round((completadas / totalGestiones) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans text-slate-800 text-left">
      
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

      {/* Selector de Evento */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-bold text-slate-800">Seleccionar Evento:</label>
        <select
          value={eventoActivo?.id || ''}
          onChange={(e) => setEventoSeleccionadoId(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-600 transition cursor-pointer shadow-sm"
        >
          {eventos.map(e => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </div>

      {/* Cabecera del Evento Activo */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          {eventoActivo?.nombre}
        </h1>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full text-xs font-bold">
            {eventoActivo?.estado || 'En preparación'}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
            {eventoActivo?.tipo || eventoActivo?.categoria || 'Evento'}
          </span>
          <span className="text-xs font-semibold text-slate-500 ml-1">
            📅 Límite: {eventoActivo?.fecha || 'Sin fecha'}
          </span>
          {eventoActivo?.limite_diario_horas && (
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
              ⏱ Máx {eventoActivo.limite_diario_horas}h/día
            </span>
          )}
        </div>
      </div>

      {/* Tarjeta de Progreso */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <span>Progreso del Evento</span>
          <span className="text-slate-900">{completadas}/{totalGestiones} subtareas ({porcentaje}%)</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-700 transition-all duration-500 rounded-full"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Lista de Subtareas / Gestiones */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Subtareas / Gestiones</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">{totalGestiones} tareas</span>
            <button
              onClick={handleAbrirCrear}
              className="px-4 py-2 bg-[#3B0764] hover:bg-[#2E1065] text-white font-bold text-xs rounded-xl transition shadow-md shadow-purple-950/20 cursor-pointer"
            >
              + Añadir Gestión
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {gestionesEv.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              No hay subtareas creadas para este evento. Haz clic en "+ Añadir Gestión".
            </p>
          ) : (
            gestionesEv.map((sub) => (
              <div 
                key={sub.id} 
                className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <input
                    type="checkbox"
                    checked={sub.completada || false}
                    onChange={() => handleToggleGestion(sub)}
                    className="w-5 h-5 rounded text-purple-700 focus:ring-purple-600 cursor-pointer accent-purple-800"
                  />
                  <span className={`text-sm font-medium truncate ${
                    sub.completada ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}>
                    {sub.descripcion}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-slate-500 font-medium">📅 {sub.plazo}</span>
                  <span className="text-xs text-slate-500 font-medium">⏱ {sub.horas_estimadas} hrs</span>
                  
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    sub.completada 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {sub.completada ? '✓ Completada' : 'Pendiente'}
                  </span>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                    <button
                      onClick={() => handleAbrirEditar(sub)}
                      className="p-1.5 text-slate-400 hover:text-purple-700 rounded-lg transition cursor-pointer"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleEliminarGestion(sub.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalGestion.abierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              {modalGestion.modo === 'crear' ? 'Añadir Nueva Gestión' : 'Editar Gestión'}
            </h3>
            
            <form onSubmit={handleGuardarGestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Contratar servicio de audio"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={formGestion.descripcion}
                  onChange={(e) => setFormGestion({ ...formGestion, descripcion: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Plazo Límite <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={hoyStr}
                  max={eventoActivo?.fecha || undefined}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={formGestion.plazo}
                  onChange={(e) => setFormGestion({ ...formGestion, plazo: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Horas Estimadas <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  placeholder="0.0"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={formGestion.horas_estimadas}
                  onChange={(e) => setFormGestion({ ...formGestion, horas_estimadas: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalGestion({ abierto: false, modo: 'crear', gestionId: null })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B0764] hover:bg-[#2E1065] text-white font-bold rounded-xl text-xs transition shadow-md shadow-purple-950/20 cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DetalleEvento;