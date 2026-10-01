import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Progreso = () => {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';

  const obtenerDatos = async () => {
    try {
      setCargando(true);
      setError(null);
      const token = authService.getToken();

      const response = await fetch(`${API_URL}/eventos/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('No se pudieron obtener los datos del progreso.');

      const data = await response.json();
      setEventos(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  const eliminarEvento = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este evento?')) return;

    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/eventos/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al eliminar el evento.');

      setEventos(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Cálculos de Métricas Globales ---
  const eventosActivosCount = eventos.length;
  
  let totalSubtareas = 0;
  let subtareasCompletadas = 0;

  const eventosCalculados = eventos.map(evento => {
    const gestiones = evento.gestiones || [];
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

  // Estilos de etiquetas según el estado del evento
  const getEstadoBadge = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'en preparación':
      case 'en preparacion':
        return 'bg-amber-100 text-amber-800';
      case 'planificación':
      case 'planificacion':
        return 'bg-blue-100 text-blue-800';
      case 'inicial':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  // Color dinámico de la barra según el % de avance
  const getBarColor = (porcentaje) => {
    if (porcentaje >= 70) return 'bg-indigo-600';
    if (porcentaje >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen text-slate-800">
      
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
          Progreso y Balance General de Eventos
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Seguimiento de cumplimiento y avance de todos los eventos.
        </p>
      </div>

      {cargando && <p className="text-sm text-slate-500">⏳ Cargando métricas de progreso...</p>}

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-xl text-sm border border-red-100">
          ⚠️ {error}
        </div>
      )}

      {!cargando && !error && (
        <>
          {/* Tarjetas de Métricas Globales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Eventos Activos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm">
                  📊
                </div>
                <span className="text-xs font-semibold text-slate-500">Eventos Activos</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{eventosActivosCount}</p>
            </div>

            {/* Subtareas Completadas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm">
                  ✓
                </div>
                <span className="text-xs font-semibold text-slate-500">Subtareas Completadas</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {subtareasCompletadas} <span className="text-2xl text-slate-400 font-medium">/ {totalSubtareas}</span>
              </p>
            </div>

            {/* Cumplimiento Global */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
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
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
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
                  const categoriaTexto = evento.categoria || 'Social';

                  return (
                    <div 
                      key={evento.id} 
                      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:shadow-md transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-slate-900">{evento.nombre}</h3>
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getEstadoBadge(estadoTexto)}`}>
                              {estadoTexto}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{categoriaTexto}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => navigate(`/detalle-evento/${evento.id}`)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1"
                          >
                            Ver Detalle <span className="text-xs">›</span>
                          </button>
                          <button
                            onClick={() => eliminarEvento(evento.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 transition text-sm"
                            title="Eliminar evento"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Barra de Progreso Individual */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-slate-700">
                          {evento.tareasCompletadas}/{evento.totalTareas} tareas <span className="ml-1 text-slate-900">{evento.porcentaje}%</span>
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