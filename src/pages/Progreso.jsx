import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Progreso = () => {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Estado para el filtro selector superior
  const [filtroEstado, setFiltroEstado] = useState('todos');

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

  const obtenerDatos = async () => {
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

      if (!response.ok) throw new Error('No se pudieron obtener los datos del progreso.');

      const data = await response.json();
      
      // Evaluar si el 100% de las gestiones están hechas para auto-completar el evento
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

  // --- Filtro de eventos ---
  const eventosFiltrados = useMemo(() => {
    return eventos.filter(ev => {
      const estado = (ev.estado || 'en preparación').toLowerCase();
      if (filtroEstado === 'en_preparacion') return estado.includes('preparac') || estado.includes('planific');
      if (filtroEstado === 'completados') return estado.includes('completad');
      return true; // todos
    });
  }, [eventos, filtroEstado]);

  // --- Cálculos de Métricas ---
  const { totalSubtareas, subtareasCompletadas, eventosCalculados } = useMemo(() => {
    let totalSub = 0;
    let completadasSub = 0;

    const calculados = eventosFiltrados.map(evento => {
      const gestiones = evento.gestiones || evento.gestiones_plan || [];
      const total = gestiones.length;
      const completadas = gestiones.filter(g => g.completada).length;
      const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

      totalSub += total;
      completadasSub += completadas;

      return {
        ...evento,
        totalTareas: total,
        tareasCompletadas: completadas,
        porcentaje
      };
    });

    return {
      totalSubtareas: totalSub,
      subtareasCompletadas: completadasSub,
      eventosCalculados: calculados
    };
  }, [eventosFiltrados]);

  const cumplimientoGlobal = totalSubtareas > 0 
    ? Math.round((subtareasCompletadas / totalSubtareas) * 100) 
    : 0;

return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen text-slate-800 text-left font-sans">
      
      {/* Alerta de Mensajes Flotantes */}
      {mensaje.texto && (
        <div className={`p-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 shadow-sm transition-all ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* 1. PANTALLA DE CARGA EXCLUSIVA */}
      {cargando && (
        <div className="py-16 px-4 flex flex-col items-center justify-center space-y-8 animate-fade-in">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <BarChart3 className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Calculando progreso
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Procesando el avance de tus eventos y subtareas...
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded-full w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded-full w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ESTADO DE ERROR */}
      {error && !cargando && (
        <div className="p-5 text-red-600 bg-red-50/80 rounded-2xl text-sm border border-red-200 flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-bold">{error}</span>
          </div>
          <button
            onClick={obtenerDatos}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 3. CONTENIDO COMPLETO (Solo aparece al finalizar la carga) */}
      {!cargando && !error && (
        <>
          {/* Encabezado Superior con Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                Progreso de eventos
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Consulta el avance de tus eventos y subtareas.
              </p>
            </div>

            {/* Selector Filtro Estilizado */}
            <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-sm w-fit">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-transparent text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos los eventos</option>
                <option value="en_preparacion">En preparación</option>
                <option value="completados">Completados</option>
              </select>
            </div>
          </div>

          {/* Tarjetas de Métricas Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Eventos mostrados */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00B4D8] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Eventos mostrados</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {eventosCalculados.length}
              </p>
            </div>

            {/* Subtareas completadas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Subtareas completadas</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {subtareasCompletadas} <span className="text-xl text-slate-400 font-medium">/ {totalSubtareas}</span>
              </p>
            </div>

            {/* Cumplimiento global */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7E22CE] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Cumplimiento global</span>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {cumplimientoGlobal}%
                </p>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#7E22CE] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${cumplimientoGlobal}%` }}
                  ></div>
                </div>
              </div>
            </div>

          </div>

          {/* Sección Detalle por evento */}
          <div className="space-y-4 pt-2">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] tracking-tight">
              Detalle por evento
            </h2>

            {eventosCalculados.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center text-slate-400 text-sm">
                No hay eventos registrados que coincidan con este filtro.
              </div>
            ) : (
              <div className="space-y-3">
                {eventosCalculados.map((evento) => {
                  const estadoTexto = evento.estado || 'En preparación';
                  const categoriaTexto = evento.categoria || evento.tipo || 'Social';

                  return (
                    <div 
                      key={evento.id} 
                      className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-base font-extrabold text-slate-900">
                              {evento.nombre}
                            </h3>
                            <span className="px-3 py-0.5 bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] rounded-full text-[11px] font-bold">
                              {estadoTexto}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">
                            {categoriaTexto}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerDetalle(evento.id)}
                            className="inline-flex items-center gap-1 bg-[#F3E8FF]/60 hover:bg-[#F3E8FF] text-[#7E22CE] font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                          >
                            <span>Ver detalle</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => eliminarEvento(evento.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition cursor-pointer rounded-lg hover:bg-red-50"
                            title="Eliminar evento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span>{evento.tareasCompletadas}/{evento.totalTareas} subtareas</span>
                          <span className="text-slate-900 font-extrabold">{evento.porcentaje}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="h-2.5 rounded-full bg-[#7E22CE] transition-all duration-500"
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