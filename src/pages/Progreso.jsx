import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Progreso = () => {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

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

  const obtenerDatos = async (reintento = true) => {
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
        console.warn('Sesión no válida o caducada (Status 401/403). Redirigiendo a Login...');
        handleSesionExpirada();
        return;
      }

      if (!response.ok) throw new Error('No se pudieron obtener los datos del progreso.');

      const data = await response.json();
      
      // Evaluar completado automático si el 100% de gestiones están hechas
      const eventosProcesados = await Promise.all(
        data.map(async (ev) => {
          const gestiones = ev.gestiones || ev.gestiones_plan || [];
          const total = gestiones.length;
          const completadas = gestiones.filter(g => g.completada).length;
          
          if (total > 0 && total === completadas && ev.estado?.toLowerCase() !== 'completado') {
            try {
              await fetch(`${API_URL}/eventos/${ev.id}/`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ estado: 'Completado' })
              });
              return { ...ev, estado: 'Completado' };
            } catch (err) {
              console.error('Error al auto-completar evento:', err);
            }
          }
          return ev;
        })
      );

      setEventos(eventosProcesados);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  const handleCompletarEvento = async (eventoId) => {
    try {
      const token = authService.getToken();
      if (!token) return handleSesionExpirada();

      const response = await fetch(`${API_URL}/eventos/${eventoId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'Completado' })
      });

      if (!response.ok) throw new Error('No se pudo cambiar el estado del evento.');

      mostrarMensaje('exito', '¡Evento marcado como completado exitosamente!');
      obtenerDatos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  const eliminarEvento = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este evento?')) return;

    try {
      const token = authService.getToken();
      if (!token) return handleSesionExpirada();

      const response = await fetch(`${API_URL}/eventos/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleSesionExpirada();
        return;
      }

      if (!response.ok) throw new Error('Error al eliminar el evento.');

      setEventos(prev => prev.filter(e => e.id !== id));
      mostrarMensaje('exito', 'Evento eliminado correctamente.');
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  const handleVerDetalle = (eventoId) => {
    if (!eventoId) return;
    navigate(`/detalle-evento/${eventoId}`);
  };

  // --- Cálculos de Métricas Globales ---
  const eventosActivosCount = eventos.length;
  
  let totalSubtareas = 0;
  let subtareasCompletadas = 0;

  const eventosCalculados = eventos.map(evento => {
    const gestiones = evento.gestiones || evento.gestiones_plan || [];
    const total = gestiones.length;
    const completadas = gestiones.filter(g => g.completada).length;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    totalSubtareas += total;
    subtareasCompletadas += completadas;

    return {
      ...evento,
      totalTareas: total,
      tareasCompletadas: completadas,
      porcentaje
    };
  });

  const cumplimientoGlobal = totalSubtareas > 0 
    ? Math.round((subtareasCompletadas / totalSubtareas) * 100) 
    : 0;

  const getEstadoBadge = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'completado':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'en preparación':
      case 'en preparacion':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'planificación':
      case 'planificacion':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getBarColor = (porcentaje) => {
    if (porcentaje === 100) return 'bg-emerald-600';
    if (porcentaje >= 70) return 'bg-indigo-600';
    if (porcentaje >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen text-slate-800 text-left">
      
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
          Progreso y Balance General de Eventos
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Seguimiento de cumplimiento y avance de todos los eventos.
        </p>
      </div>

      {/* Alerta de Mensajes */}
      {mensaje.texto && (
        <div className={`p-4 rounded-xl text-xs font-semibold ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {cargando && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-8">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Cargando métricas de progreso...</span>
        </div>
      )}

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-xl text-sm border border-red-100 flex flex-col items-start gap-2">
          <span>⚠️ {error}</span>
          <button
            onClick={() => obtenerDatos()}
            className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && (
        <>
          {/* Tarjetas de Métricas Globales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm">
                  📊
                </div>
                <span className="text-xs font-semibold text-slate-500">Eventos Activos</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{eventosActivosCount}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm">
                  ✓
                </div>
                <span className="text-xs font-semibold text-slate-500">Subtareas Completadas</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {subtareasCompletadas} <span className="text-xl text-slate-400 font-medium">/ {totalSubtareas}</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-sm">
                  📈
                </div>
                <span className="text-xs font-semibold text-slate-500">Cumplimiento Global</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{cumplimientoGlobal}%</p>
            </div>
          </div>

          {/* Barra de Progreso Global */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
              <span>Progreso global de todos los eventos</span>
              <span className="font-bold text-slate-900">{cumplimientoGlobal}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-purple-700 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${cumplimientoGlobal}%` }}
              ></div>
            </div>
          </div>

          {/* Detalle por Evento */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-extrabold text-[#0F172A]">Detalle por Evento</h2>

            {eventosCalculados.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center text-slate-500 text-sm">
                No hay eventos registrados actualmente.
              </div>
            ) : (
              <div className="space-y-4">
                {eventosCalculados.map((evento) => {
                  const estadoTexto = evento.estado || 'En preparación';
                  const categoriaTexto = evento.categoria || evento.tipo || 'Social';
                  const esCompletado = estadoTexto.toLowerCase() === 'completado';

                  return (
                    <div 
                      key={evento.id} 
                      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:shadow-md transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-extrabold text-slate-900">{evento.nombre}</h3>
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getEstadoBadge(estadoTexto)}`}>
                              {estadoTexto}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{categoriaTexto} • Límite: {evento.fecha || 'Sin fecha'}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {!esCompletado && (
                            <button
                              type="button"
                              onClick={() => handleCompletarEvento(evento.id)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-2 rounded-xl transition border border-emerald-200 cursor-pointer"
                            >
                              ✓ Completar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleVerDetalle(evento.id)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                          >
                            Ver Detalle ›
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarEvento(evento.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition text-sm cursor-pointer rounded-lg hover:bg-rose-50"
                            title="Eliminar evento"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Barra de Progreso Individual */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{evento.tareasCompletadas}/{evento.totalTareas} tareas</span>
                          <span className="text-slate-900">{evento.porcentaje}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${getBarColor(evento.porcentaje)}`}
                            style={{ width: `${evento.porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default Progreso;