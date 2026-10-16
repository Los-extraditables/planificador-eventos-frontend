import { AlertCircle, AlertTriangle, Calendar, CalendarClock, CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CargaGestionWidget from '../components/cargaGestionWidget';
import { useAuth } from '../context/AuthContext';
import { useCargaDiaria } from '../context/CargaDiariaContext';
import { useFiltradoGestiones } from '../hooks/useFiltradoGestiones';
import { authService } from '../services/authService';

const Hoy = ({ onVerDetalle, onCrearEvento, setPestanaActiva }) => {
  const navigate = useNavigate();
  const { userDisplayName, token, logout } = useAuth();

  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // limite diario de horas
  const { limiteDiarioMax } = useCargaDiaria();

  // Filtros de Evento y Estado
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos'); 

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [confirmModal, setConfirmModal] = useState({ abierto: false, gestion: null });
  const [alertaIgnorada, setAlertaIgnorada] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';

  const handleSesionExpirada = () => {
    logout();            // antes: authService.logout()
    navigate('/login');
  };

  const obtenerEventos = async () => {
    try {
      setCargando(true);
      setError(null);
      const tokenActual = token || localStorage.getItem('token');

      if (!tokenActual) {
        handleSesionExpirada();
        return;
      }

      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

      const response = await fetch(`${baseUrl}eventos/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleSesionExpirada();
        return;
      }

      if (!response.ok) throw new Error('No se pudieron cargar los eventos y gestiones.');

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
    obtenerEventos();
  }, []);

  const mostrarMensajeTemporizado = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
  };

  const solicitarCompletar = (gestion) => {
    setConfirmModal({ abierto: true, gestion });
  };

  const confirmarCompletar = async () => {
    const { gestion } = confirmModal;
    setConfirmModal({ abierto: false, gestion: null });

    try {
      const token = authService.getToken();

      if (!token) {
        handleSesionExpirada();
        return;
      }

      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
      const nuevoEstado = !gestion.completada;

      const response = await fetch(`${baseUrl}gestiones/${gestion.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completada: nuevoEstado })
      });

      if (response.status === 401 || response.status === 403) {
        handleSesionExpirada();
        return;
      }

      if (!response.ok) throw new Error('No se pudo actualizar la gestión.');

      mostrarMensajeTemporizado(
        'exito',
        nuevoEstado
          ? `¡Gestión "${gestion.descripcion}" completada con éxito!`
          : `Gestión "${gestion.descripcion}" marcada como pendiente.`
      );
      obtenerEventos();
    } catch (err) {
      mostrarMensajeTemporizado('error', 'Error al cambiar el estado de la gestión.');
    }
  };

  // --- DETECCIÓN AUTOMÁTICA E INTERFAZ OPTIMISTA AL REPROGRAMAR ---
  const actualizarFechaGestion = async (eventoId, gestionId, nuevaFecha, pospuesto = true) => {
    const eventosAnteriores = [...eventos];

    const eventosActualizados = eventos.map((evento) => {
      if (evento.id === eventoId) {
        const actualizarListaGestiones = (lista) =>
          lista?.map((g) =>
            g.id === gestionId
              ? {
                  ...g,
                  plazo: nuevaFecha,
                  fecha: nuevaFecha,
                  estado: pospuesto ? 'pospuesto' : g.estado,
                  nota_pospuesto: pospuesto ? 'Pospuesto por reprogramación' : g.nota_pospuesto,
                  pospuesto
                }
              : g
          );

        return {
          ...evento,
          gestiones: actualizarListaGestiones(evento.gestiones),
          gestiones_plan: actualizarListaGestiones(evento.gestiones_plan),
        };
      }
      return evento;
    });

    setEventos(eventosActualizados); 
    setAlertaIgnorada(false);

    try {
      const token = authService.getToken();
      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

      const response = await fetch(`${baseUrl}gestiones/${gestionId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plazo: nuevaFecha,
          ...(pospuesto ? { estado: 'pospuesto', nota_pospuesto: 'Pospuesto por reprogramación', pospuesto: true } : {})
        })
      });

      if (!response.ok) throw new Error('Error en el servidor');
      mostrarMensajeTemporizado('exito', 'Subtarea reprogramada y carga evaluada correctamente.');
    } catch (err) {
      console.error(err);
      setEventos(eventosAnteriores);
      mostrarMensajeTemporizado('error', 'No se pudo guardar la nueva fecha. Revisa tu conexión.');
    }
  };

  // Reprograma una subtarea al día siguiente y la marca como "Pospuesto"
  const posponerGestion = (gestion) => {
    if (!gestion?.eventoId) return;

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const yearM = manana.getFullYear();
    const monthM = String(manana.getMonth() + 1).padStart(2, '0');
    const dayM = String(manana.getDate()).padStart(2, '0');
    const mananaStr = `${yearM}-${monthM}-${dayM}`;

    actualizarFechaGestion(gestion.eventoId, gestion.id, mananaStr, true);
    mostrarMensajeTemporizado('exito', `Gestión "${gestion.descripcion}" pospuesta para mañana.`);
  };

  const handleVerDetalle = (eventoId, state = {}) => {
    if (!eventoId) return;

    if (typeof onVerDetalle === 'function') {
      onVerDetalle('detalle', eventoId);
    } else {
      navigate(`/detalle-evento/${eventoId}`, { state });
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

  // --- EXTRACCIÓN DE GESTIONES ---
  const todasLasGestiones = useMemo(() => {
    return eventos.flatMap((e) => {
      const listaGestiones = e.gestiones || e.gestiones_plan || [];
      return listaGestiones.map((g) => ({
        ...g,
        eventoId: e.id,
        eventoNombre: e.nombre,
        limiteDiarioHoras: parseFloat(e.limite_diario_horas || e.limiteDiarioHoras || 6.0)
      }));
    });
  }, [eventos]);

  const { 
    gestionesFiltradas, 
    gestionesAtrasadas, 
    gestionesHoy, 
    gestionesProximas,
    gestionesCompletadas
  } = useFiltradoGestiones(todasLasGestiones, filtroEstado);

  // 1. Filtrar las gestiones únicamente por la categoría de evento/estado seleccionada en la vista
  const gestionesSegunFiltro = useMemo(() => {
    return todasLasGestiones.filter((g) => {
      if (filtroEstado === 'en_preparacion') return !g.completada;
      if (filtroEstado === 'completados') return Boolean(g.completada);
      return true; // 'todos'
    });
  }, [todasLasGestiones, filtroEstado]);

  // 2. Conteo de pendientes reales respetando el contexto
  const totalPendientesFiltradas = useMemo(() => {
    if (filtroEstado === 'completados') {
      return 0;
    }
    // Sumamos las atrasadas, hoy y próximas que están pendientes
    return gestionesAtrasadas.length + gestionesHoy.length + gestionesProximas.length;
  }, [filtroEstado, gestionesAtrasadas, gestionesHoy, gestionesProximas]);

  // Cálculo automático de horas totales para hoy
  const horasTotalesHoy = gestionesHoy.reduce((acc, g) => {
    const hrs = parseFloat(g.horas_estimadas) || 0;
    return acc + hrs;
  }, 0);

  // Cálculo dinámico del porcentaje de carga:
  const porcentajeCarga = Math.min((horasTotalesHoy / limiteDiarioMax) * 100, 100);

  const fechaHoyTexto = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const aplicarSolucion = (tipoSolucion) => {
    if (tipoSolucion === 'ignorar') {
      setAlertaIgnorada(true);
      mostrarMensajeTemporizado('exito', 'Has decidido mantener tu agenda actual.');
    } else if (tipoSolucion === 'reprogramar') {
      const tareasPendientesHoy = gestionesHoy.filter((g) => !g.completada);
      if (tareasPendientesHoy.length > 0) {
        const ultimaTarea = tareasPendientesHoy[tareasPendientesHoy.length - 1];
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        const yearM = manana.getFullYear();
        const monthM = String(manana.getMonth() + 1).padStart(2, '0');
        const dayM = String(manana.getDate()).padStart(2, '0');
        const mananaStr = `${yearM}-${monthM}-${dayM}`;

        actualizarFechaGestion(ultimaTarea.eventoId, ultimaTarea.id, mananaStr, true);
        mostrarMensajeTemporizado('exito', `Solución aplicada: "${ultimaTarea.descripcion}" se movió para mañana.`);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen text-slate-800 text-left font-sans">
      {/* Mensajes Flotantes */}
      {mensaje.texto && (
        <div
          className={`p-4 rounded-xl font-medium text-sm border flex items-center justify-between transition-all shadow-sm ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
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

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs sm:text-sm text-slate-500 capitalize mt-0.5">
            {fechaHoyTexto}
          </p>
        </div>

        {/* Filtro Estilizado */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-sm w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
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

      {/* Diseño de carga de la pagina */}
      {cargando && (
        <div className="py-12 px-4 flex flex-col items-center justify-center space-y-8 animate-fade-in">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <CalendarClock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Estamos preparando tu día
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Organizamos tus subtareas por prioridad. Tomará solo un momento.
              </p>
            </div>
          </div>

          {/* Tarjetas Esqueleto (Skeleton) simulando la carga de las métricas */}
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

      {/* ESTADO DE ERROR */}
      {error && !cargando && (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 010-7.07 1 1 0 011.414-1.414 7 7 0 010 9.9 1 1 0 01-1.414-1.414M12 12a2 2 0 100-4 2 2 0 000 4z" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mb-2 tracking-tight">
            No pudimos cargar tus actividades
          </h2>

          <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
            Parece que perdimos la conexión. Compruébala e inténtalo de nuevo.
          </p>

          <button
            type="button"
            onClick={obtenerEventos}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E10000] hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Volver a intentar
          </button>
        </div>
      )}

      {!cargando && !error && (
        <>
          {eventos.length === 0 ? (
            /* ESTADO VACÍO (CUANDO NO HAY EVENTOS) */
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 my-12 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  ¡Todo listo por hoy!
                </h2>
                <p className="text-sm text-slate-500">
                  No tienes subtareas urgentes hoy.
                </p>
              </div>
              <button
                type="button"
                onClick={handleIrACrear}
                className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-[#7B1FA2] hover:bg-[#6A1B9A] text-white font-semibold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <span>+</span> Crear un evento
              </button>
            </div>
          ) : (
            <>
              {/* Métricas Superiores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#E0F2F1] flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-[#00796B]" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">
                      {gestionesHoy.length}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Eventos de hoy</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F3E5F5] flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-6 h-6 text-[#7B1FA2]" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">
                      {totalPendientesFiltradas}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {filtroEstado === 'completados' ? 'Subtareas completadas' : 'Subtareas pendientes'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F3E5F5] flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-[#7B1FA2]" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">
                      {gestionesProximas.length}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Subtareas próximas</span>
                  </div>
                </div>
              </div>

              {/* MOTOR DE ALERTA AUTOMÁTICO DE SOBRECARGA */}
              <CargaGestionWidget 
                horasTotalesHoy={horasTotalesHoy}
                limiteDiarioMax={limiteDiarioMax}
                alertaIgnorada={alertaIgnorada}
                porcentajeCarga={porcentajeCarga}
                aplicarSolucion={aplicarSolucion}
              />

              {/* Banner Informativo */}
              <div className="space-y-3">
                <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                  Subtareas de hoy
                </h2>
                <div className="bg-[#E6F7F8] border border-[#A7ECEE] rounded-2xl p-4 flex items-start gap-3 text-[#0D6E72] text-sm leading-relaxed">
                  <div className="w-5 h-5 rounded-full border border-[#0D6E72] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    ?
                  </div>
                  <p>
                    Tus subtareas se agrupan por urgencia. Dentro de cada grupo, verás primero las más antiguas; si coinciden en fecha, te sugerimos iniciar por la que tome menos tiempo.
                  </p>
                </div>
              </div>

              {/* Listado de Tareas clasificado */}
              {gestionesFiltradas.length === 0 ? (
                <div className="bg-[#F8FAFC]/50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex items-center justify-start gap-3 text-slate-400 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <span>No hay subtareas que coincidan con este filtro.</span>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-6">
                    {/* SECCIÓN 0: ATRASADAS */}
                    {gestionesAtrasadas.length > 0 && (
                      <div className="border border-red-200 bg-red-50/60 shadow-[0_8px_28px_rgba(220,38,38,0.08)] rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500 text-white shadow-sm flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-sm">Atrasadas</h3>
                              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                {gestionesAtrasadas.length}
                              </span>
                            </div>
                            <p className="text-xs text-red-800 font-medium">Requieren atención inmediata</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {gestionesAtrasadas.map((gestion) => (
                            <TarjetaGestion
                              key={gestion.id}
                              gestion={gestion}
                              solicitarCompletar={solicitarCompletar}
                              handleVerDetalle={handleVerDetalle}
                              posponerGestion={posponerGestion}
                              etiqueta="Atrasada"
                              colorTag="bg-red-100 text-red-700 border border-red-200"
                              esAtrasada={true}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN 1: PARA HOY */}
                    {gestionesHoy.length > 0 && (
                      <div className="border border-cyan-200 bg-cyan-50/40 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#06B6D4] text-white flex items-center justify-center flex-shrink-0">
                            <CalendarClock className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-sm">Para hoy</h3>
                              <span className="bg-[#D9F8FC] text-[#0E7490] text-xs font-bold px-2.5 py-1 rounded-full">
                                {gestionesHoy.length}
                              </span>
                            </div>
                            <p className="text-xs text-[#0E7490] font-medium">Prioriza estas subtareas hoy</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {gestionesHoy.map((gestion) => (
                            <TarjetaGestion
                              key={gestion.id}
                              gestion={gestion}
                              solicitarCompletar={solicitarCompletar}
                              handleVerDetalle={handleVerDetalle}
                              posponerGestion={posponerGestion}
                              etiqueta="Para hoy"
                              colorTag="bg-cyan-100 text-cyan-800"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN 2: PRÓXIMAS */}
                    {gestionesProximas.length > 0 && (
                      <div className="border border-slate-200 bg-slate-50/60 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white text-slate-400 border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-sm">Próximas</h3>
                              <span className="bg-white text-slate-500 border border-slate-200 text-xs font-bold px-2.5 py-1 rounded-full">
                                {gestionesProximas.length}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">Subtareas planificadas más adelante</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {gestionesProximas.map((gestion) => (
                            <TarjetaGestion
                              key={gestion.id}
                              gestion={gestion}
                              solicitarCompletar={solicitarCompletar}
                              handleVerDetalle={handleVerDetalle}
                              posponerGestion={posponerGestion}
                              etiqueta="Próxima"
                              colorTag="bg-slate-100 text-slate-600"
                              esProxima={true}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN 3: COMPLETADAS */}
                    {gestionesCompletadas.length > 0 && (
                      <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white shadow-sm flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-sm">Completadas</h3>
                              <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {gestionesCompletadas.length}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-800 font-medium">Subtareas finalizadas</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {gestionesCompletadas.map((gestion) => (
                            <TarjetaGestion
                              key={gestion.id}
                              gestion={gestion}
                              solicitarCompletar={solicitarCompletar}
                              handleVerDetalle={handleVerDetalle}
                              etiqueta="Completada"
                              colorTag="bg-emerald-100 text-emerald-800"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal de Confirmación */}
      {confirmModal.abierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left">
            <h3 className="text-lg font-bold text-slate-900">
              {confirmModal.gestion?.completada
                ? 'Marcar como pendiente'
                : 'Completar gestión'}
            </h3>
            <p className="text-sm text-slate-600">
              ¿Deseas cambiar el estado de la gestión{' '}
              <strong>"{confirmModal.gestion?.descripcion}"</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ abierto: false, gestion: null })}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCompletar}
                className="px-4 py-2 bg-[#3B0764] text-white rounded-xl text-sm font-semibold hover:bg-[#2E1065] transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE TARJETA GESTION (LECTURA DE FECHA) ---
const TarjetaGestion = ({ gestion, solicitarCompletar, handleVerDetalle, posponerGestion, etiqueta, colorTag, esAtrasada, esProxima }) => {
  const fechaValor = gestion.plazo || gestion.fecha;

  // Evalúa cualquier flag enviado por la API o estado local
  const pospuestoAhora = Boolean(
    gestion.nota_pospuesto || 
    gestion.estado === 'pospuesto' || 
    gestion.pospuesto || 
    gestion.reprogramado
  );

  // Formatear la fecha a texto amigable (ej: "11 sep. 2026")
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '';
    const fechaLimpia = fechaStr.toString().split('T')[0].split(' ')[0];
    const partes = fechaLimpia.split('-');
    if (partes.length < 3) return fechaLimpia;

    // crear fecha sin desface horario
    const fechaObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    return fechaObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  let borderStyle = 'border-l-teal-500';
  if (gestion.completada) {
    borderStyle = 'border-l-emerald-500 opacity-80';
  } else if (esAtrasada) {
    borderStyle = 'border-l-red-500';
  } else if (esProxima) {
    borderStyle = 'border-l-slate-400';
  }

  return (
    <div
      className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between transition border-l-4 ${borderStyle} border-slate-200 hover:shadow-md`}
    >
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-500 text-xs font-semibold px-2.5 py-0.5 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-purple-500" /> {gestion.eventoNombre}
          </span>
          
          {/* Etiqueta Pospuesto solo en la tarjeta de Hoy */}
          {pospuestoAhora && (
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Pospuesto
            </span>
          )}

          {gestion.completada && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ✓ COMPLETADA
            </span>
          )}
        </div>

        <h3
          className={`text-base font-bold transition ${
            gestion.completada ? 'line-through text-slate-400' : 'text-slate-900'
          }`}
        >
          {gestion.descripcion}
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-500">
          {/* Fecha en texto sin input editable */}
          {fechaValor && (
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <CalendarClock className="w-3.5 h-3.5 text-slate-400" /> Fecha límite: {formatearFecha(fechaValor)}
            </span>
          )}

          {gestion.horas_estimadas !== undefined && (
            <span className="flex items-center gap-1">⏱️ {gestion.horas_estimadas} h</span>
          )}

          {!gestion.completada && (
            <span className={`${colorTag} font-medium px-2 py-0.5 rounded-full text-[10px] w-max`}>
              {etiqueta}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <button
          type="button"
          onClick={() => solicitarCompletar(gestion)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
            gestion.completada
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              : 'bg-purple-800 hover:bg-purple-900 text-white'
          }`}
        >
          <span>✓</span>
          <span>{gestion.completada ? 'Completada' : 'Hecha'}</span>
        </button>

        {/* Botón Posponer: solo navega al detalle del evento para posponerlo allí */}
        {!gestion.completada && (
          <button
            type="button"
            onClick={() => handleVerDetalle(gestion.eventoId || gestion.evento, { esPosponer: true })}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-purple-800 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl transition cursor-pointer"
            title="Posponer evento"
          >
            Posponer
          </button>
        )}
      </div>
    </div>
  );
};

export default Hoy;