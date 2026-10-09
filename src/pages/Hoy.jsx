import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const Hoy = ({ onVerDetalle, onCrearEvento, setPestanaActiva }) => {
  const navigate = useNavigate();
  const { userDisplayName } = useAuth();

  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Filtros de Evento y Estado
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'pendientes' | 'completadas'

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [confirmModal, setConfirmModal] = useState({ abierto: false, gestion: null });
  const [alertaIgnorada, setAlertaIgnorada] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';

  const handleSesionExpirada = () => {
    authService.logout();
    navigate('/login');
  };

  const obtenerEventos = async () => {
    try {
      setCargando(true);
      setError(null);
      const token = authService.getToken();

      if (!token) {
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
          ? `¡Gestión "${gestion.descripcion}" completada con éxito! 🎉`
          : `Gestión "${gestion.descripcion}" marcada como pendiente.`
      );
      obtenerEventos();
    } catch (err) {
      mostrarMensajeTemporizado('error', 'Error al cambiar el estado de la gestión.');
    }
  };

  // --- DETECCIÓN AUTOMÁTICA E INTERFAZ OPTIMISTA AL REPROGRAMAR ---
  const actualizarFechaGestion = async (eventoId, gestionId, nuevaFecha) => {
    const eventosAnteriores = [...eventos];

    // Actualizamos el estado local al instante para recalcular horas y umbral fluidamente
    const eventosActualizados = eventos.map((evento) => {
      if (evento.id === eventoId) {
        const actualizarListaGestiones = (lista) =>
          lista?.map((g) => (g.id === gestionId ? { ...g, plazo: nuevaFecha, fecha: nuevaFecha } : g));

        return {
          ...evento,
          gestiones: actualizarListaGestiones(evento.gestiones),
          gestiones_plan: actualizarListaGestiones(evento.gestiones_plan),
        };
      }
      return evento;
    });

    setEventos(eventosActualizados); 
    setAlertaIgnorada(false); // Reseteamos la advertencia para evaluar la nueva carga de inmediato

    try {
      const token = authService.getToken();
      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

      const response = await fetch(`${baseUrl}gestiones/${gestionId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plazo: nuevaFecha })
      });

      if (!response.ok) throw new Error('Error en el servidor');
      mostrarMensajeTemporizado('exito', 'Subtarea reprogramada y carga evaluada correctamente.');
    } catch (err) {
      console.error(err);
      setEventos(eventosAnteriores); // Revertir si hay error de red
      mostrarMensajeTemporizado('error', 'No se pudo guardar la nueva fecha. Revisa tu conexión.');
    }
  };

  const handleVerDetalle = (eventoId) => {
    if (!eventoId) return;

    if (typeof onVerDetalle === 'function') {
      onVerDetalle('detalle', eventoId);
    } else {
      navigate(`/detalle-evento/${eventoId}`);
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

  // --- EXTRACCIÓN Y MAPEO DE GESTIONES ---
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

  // Aplicar Filtros
  const gestionesFiltradas = useMemo(() => {
    return todasLasGestiones.filter((g) => {
      const coincideEvento =
        filtroEvento === 'todos' || String(g.eventoId) === String(filtroEvento);

      let coincideEstado = true;
      if (filtroEstado === 'pendientes') {
        coincideEstado = !g.completada;
      } else if (filtroEstado === 'completadas') {
        coincideEstado = Boolean(g.completada);
      }

      return coincideEvento && coincideEstado;
    });
  }, [todasLasGestiones, filtroEvento, filtroEstado]);

  // Fecha local YYYY-MM-DD
  const hoyLocal = new Date();
  const year = hoyLocal.getFullYear();
  const month = String(hoyLocal.getMonth() + 1).padStart(2, '0');
  const day = String(hoyLocal.getDate()).padStart(2, '0');
  const hoyStr = `${year}-${month}-${day}`;

  // Clasificación por fechas
  const gestionesAtrasadas = gestionesFiltradas.filter((g) => {
    const fechaValor = g.plazo || g.fecha;
    if (!fechaValor) return false;
    const fechaLimpia = fechaValor.toString().split('T')[0].split(' ')[0];
    return fechaLimpia < hoyStr && !g.completada;
  });

  const gestionesHoy = gestionesFiltradas.filter((g) => {
    const fechaValor = g.plazo || g.fecha;
    if (!fechaValor) return true;
    const fechaLimpia = fechaValor.toString().split('T')[0].split(' ')[0];
    return fechaLimpia === hoyStr || (fechaLimpia < hoyStr && g.completada);
  });

  const gestionesProximas = gestionesFiltradas.filter((g) => {
    const fechaValor = g.plazo || g.fecha;
    if (!fechaValor) return false;
    const fechaLimpia = fechaValor.toString().split('T')[0].split(' ')[0];
    return fechaLimpia > hoyStr;
  });

  // Cálculo automático de horas totales para hoy
  const horasTotalesHoy = gestionesHoy.reduce((acc, g) => {
    const hrs = parseFloat(g.horas_estimadas) || 0;
    return acc + hrs;
  }, 0);

  // Límite diario configurado o 6.0 horas por defecto
  const limiteDiarioMax =
    eventos.length > 0
      ? parseFloat(eventos[0].limite_diario_horas || eventos[0].limiteDiarioHoras || 6.0)
      : 6.0;

  const porcentajeCarga = Math.min((horasTotalesHoy / limiteDiarioMax) * 100, 100);

  const fechaHoyTexto = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // --- LÓGICA DE APLICACIÓN DE SOLUCIONES DE SOBRECARGA ---
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

        actualizarFechaGestion(ultimaTarea.eventoId, ultimaTarea.id, mananaStr);
        mostrarMensajeTemporizado('exito', `Solución aplicada: "${ultimaTarea.descripcion}" se movió para mañana.`);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen text-slate-800 text-left font-sans">
      {/* Mensajes Flotantes */}
      {mensaje.texto && (
        <div
          className={`p-4 rounded-xl font-medium text-sm border flex items-center justify-between transition-all ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          <span>{mensaje.texto}</span>
          <span>{mensaje.tipo === 'exito' ? '✅' : '⚠️'}</span>
        </div>
      )}

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
          Hola{userDisplayName ? `, ${userDisplayName}` : ''}, ¿qué tienes planeado hoy?
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Organiza tus eventos y mantén todo bajo control.
        </p>
        <p className="text-xs text-slate-400 capitalize mt-0.5">{fechaHoyTexto}</p>
      </div>

      {cargando && <p className="text-sm text-slate-500">⏳ Cargando panel...</p>}

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
          {/* Métricas Superiores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 text-xl flex-shrink-0">
                📅
              </div>
              <div>
                <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">
                  {eventos.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">Eventos activos</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
                📋
              </div>
              <div>
                <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">
                  {gestionesHoy.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">Gestiones para hoy</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-xl flex-shrink-0">
                ⏱
              </div>
              <div>
                <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">
                  {gestionesProximas.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">Gestiones próximas</span>
              </div>
            </div>
          </div>

          {/* MOTOR DE ALERTA AUTOMÁTICO DE SOBRECARGA Y COMPONENTES VISUALES DE SOLUCIÓN */}
          <div className={`bg-white border-2 ${horasTotalesHoy > limiteDiarioMax && !alertaIgnorada ? 'border-red-400 bg-red-50/30' : 'border-amber-400'} rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-all duration-300`}>
            <div className={`flex items-center justify-between font-bold text-sm ${horasTotalesHoy > limiteDiarioMax && !alertaIgnorada ? 'text-red-800' : 'text-amber-800'}`}>
              <div className="flex items-center gap-2">
                <span>Carga de gestión (Hoy)</span>
                <span>{horasTotalesHoy > limiteDiarioMax && !alertaIgnorada ? '🚨' : '⚠'}</span>
              </div>
              <span>
                {horasTotalesHoy.toFixed(1)} / {limiteDiarioMax.toFixed(1)} h
              </span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`${horasTotalesHoy > limiteDiarioMax && !alertaIgnorada ? 'bg-red-500' : 'bg-amber-500'} h-2.5 rounded-full transition-all duration-500`}
                style={{ width: `${porcentajeCarga}%` }}
              ></div>
            </div>

            {horasTotalesHoy > limiteDiarioMax && !alertaIgnorada ? (
              <div className="pt-3 border-t border-red-200/60 mt-2">
                <p className="text-sm font-bold text-red-700 mb-3">
                  ⚠️ Se ha detectado una sobrecarga (superas tu límite de {limiteDiarioMax}h). Selecciona una alternativa de solución:
                </p>
                {/* Componentes visuales interactivos para aplicar la solución elegida */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => aplicarSolucion('reprogramar')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span>📅</span> Mover última tarea a mañana
                  </button>
                  <button
                    onClick={() => aplicarSolucion('ignorar')}
                    className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>✓</span> Mantener agenda
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-amber-700 font-medium">
                  {alertaIgnorada
                    ? 'Has decidido ignorar la advertencia de sobrecarga.'
                    : `Tu carga actual respeta tu límite diario configurado de ${limiteDiarioMax}h.`}
                </span>
              </div>
            )}
          </div>

          {/* BARRA DE FILTROS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
              🔍 Filtrar actividades:
            </span>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Evento:</label>
                <select
                  value={filtroEvento}
                  onChange={(e) => setFiltroEvento(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  <option value="todos">Todos los eventos</option>
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Estado:</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  <option value="todos">Todas</option>
                  <option value="pendientes">Pendientes</option>
                  <option value="completadas">Completadas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Banner Informativo */}
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              Actividades de hoy
            </h2>
            <div className="bg-[#E6F7F8] border border-[#A7ECEE] rounded-2xl p-4 flex items-start gap-3 text-[#0D6E72] text-sm leading-relaxed">
              <div className="w-5 h-5 rounded-full border border-[#0D6E72] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                ?
              </div>
              <p>
                Tus tareas se agrupan por urgencia. Puedes reprogramar fechas al instante desde cada tarjeta para gestionar tu límite diario de manera fluida.
              </p>
            </div>
          </div>

          {/* Listado de Tareas clasificado */}
          {gestionesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-white border border-slate-200 rounded-2xl">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-900 text-2xl shadow-sm border border-purple-100/50">
                📅
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  No se encontraron gestiones
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Prueba cambiando los filtros seleccionados o añade un nuevo evento.
                </p>
              </div>

              <button
                type="button"
                onClick={handleIrACrear}
                className="px-4 py-2 bg-[#3B0764] hover:bg-[#2E1065] text-white font-semibold rounded-xl text-xs transition shadow-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>Crear un evento</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-8">
                {/* SECCIÓN 0: ATRASADAS */}
                {gestionesAtrasadas.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      <span className="text-xs font-bold tracking-wider text-red-700 uppercase">
                        ATRASADAS
                      </span>
                      <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {gestionesAtrasadas.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {gestionesAtrasadas.map((gestion) => (
                        <TarjetaGestion
                          key={gestion.id}
                          gestion={gestion}
                          solicitarCompletar={solicitarCompletar}
                          handleVerDetalle={handleVerDetalle}
                          actualizarFecha={actualizarFechaGestion}
                          etiqueta="Atrasada"
                          colorTag="bg-red-100 text-red-700 border border-red-200"
                          esAtrasada={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* SECCIÓN 1: PARA HOY */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                    <span className="text-xs font-bold tracking-wider text-teal-700 uppercase">
                      PARA HOY
                    </span>
                    <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {gestionesHoy.length}
                    </span>
                  </div>

                  {gestionesHoy.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-slate-500 text-xs">
                      🎉 ¡No tienes gestiones registradas para hoy con estos filtros!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gestionesHoy.map((gestion) => (
                        <TarjetaGestion
                          key={gestion.id}
                          gestion={gestion}
                          solicitarCompletar={solicitarCompletar}
                          handleVerDetalle={handleVerDetalle}
                          actualizarFecha={actualizarFechaGestion}
                          etiqueta="Para hoy"
                          colorTag="bg-teal-50 text-teal-700"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* SECCIÓN 2: PRÓXIMAS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                    <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                      PRÓXIMAS
                    </span>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {gestionesProximas.length}
                    </span>
                  </div>

                  {gestionesProximas.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-slate-500 text-xs">
                      No hay gestiones programadas para días posteriores con estos filtros.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gestionesProximas.map((gestion) => (
                        <TarjetaGestion
                          key={gestion.id}
                          gestion={gestion}
                          solicitarCompletar={solicitarCompletar}
                          handleVerDetalle={handleVerDetalle}
                          actualizarFecha={actualizarFechaGestion}
                          etiqueta="Próxima"
                          colorTag="bg-slate-100 text-slate-600"
                          esProxima={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
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

// --- COMPONENTE TARJETA GESTION CON INPUT DE FECHA INTERACTIVO ---
const TarjetaGestion = ({ gestion, solicitarCompletar, handleVerDetalle, actualizarFecha, etiqueta, colorTag, esAtrasada, esProxima }) => {
  const fechaMostrar = gestion.plazo || gestion.fecha;

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
      <div className="flex items-start sm:items-center gap-4">
        <div className="pt-1 sm:pt-0">
          <input
            type="checkbox"
            checked={Boolean(gestion.completada)}
            onChange={() => solicitarCompletar(gestion)}
            className="w-5 h-5 cursor-pointer accent-purple-800 rounded"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-md">
              📅 {gestion.eventoNombre}
            </span>
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
            {/* Input interactivo para actualizar fecha y recalcular la sobrecarga dinámicamente */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">📅 Reprogramar:</span>
              <input
                type="date"
                value={fechaMostrar ? fechaMostrar.toString().split('T')[0] : ''}
                onChange={(e) => actualizarFecha(gestion.eventoId, gestion.id, e.target.value)}
                className="border border-slate-300 rounded p-1 text-slate-700 bg-slate-50 focus:ring-2 focus:ring-purple-600 focus:outline-none cursor-pointer"
              />
            </div>

            {gestion.horas_estimadas !== undefined && (
              <span className="flex items-center gap-1">⏱️ {gestion.horas_estimadas} hrs</span>
            )}

            {!gestion.completada && (
              <span className={`${colorTag} font-medium px-2 py-0.5 rounded-full text-[10px] w-max`}>
                {etiqueta}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleVerDetalle(gestion.eventoId)}
        className="p-2.5 text-slate-400 hover:text-purple-800 hover:bg-purple-50 rounded-xl transition text-lg cursor-pointer flex-shrink-0"
        title="Ver detalle del evento"
      >
        👁️
      </button>
    </div>
  );
};

export default Hoy;