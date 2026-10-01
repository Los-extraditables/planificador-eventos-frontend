import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Hoy = () => {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [confirmModal, setConfirmModal] = useState({ abierto: false, gestion: null });

  const API_URL = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';

  const obtenerEventos = async () => {
    try {
      setCargando(true);
      setError(null);
      const token = authService.getToken();
      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

      const response = await fetch(`${baseUrl}eventos/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        authService.logout();
        window.location.href = '/login';
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
    if (gestion.completada) return;
    setConfirmModal({ abierto: true, gestion });
  };

  const confirmarCompletar = async () => {
    const { gestion } = confirmModal;
    setConfirmModal({ abierto: false, gestion: null });

    try {
      const token = authService.getToken();
      const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

      const response = await fetch(`${baseUrl}gestiones/${gestion.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completada: true })
      });

      if (response.status === 401) {
        authService.logout();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('No se pudo actualizar la gestión.');

      mostrarMensajeTemporizado('exito', `¡Gestión "${gestion.descripcion}" completada con éxito! 🎉`);
      obtenerEventos();
    } catch (err) {
      mostrarMensajeTemporizado('error', 'Error al marcar la gestión como completada.');
    }
  };

  const handleVerDetalle = (eventoId) => {
    if (eventoId) {
      navigate(`/detalle-evento/${eventoId}`);
    }
  };

  // --- EXTRAER Y MAPEAR TODAS LAS GESTIONES DE LA BD ---
  const todasLasGestiones = eventos.flatMap(e => {
    const listaGestiones = e.gestiones || e.gestiones_plan || [];
    return listaGestiones.map(g => ({
      ...g,
      eventoId: e.id,
      eventoNombre: e.nombre,
      limiteDiarioHoras: parseFloat(e.limite_diario_horas || e.limiteDiarioHoras || 6.0)
    }));
  });

  const gestionesPendientes = todasLasGestiones.filter(g => !g.completada);

  // Fecha en formato local YYYY-MM-DD
  const hoyLocal = new Date();
  const year = hoyLocal.getFullYear();
  const month = String(hoyLocal.getMonth() + 1).padStart(2, '0');
  const day = String(hoyLocal.getDate()).padStart(2, '0');
  const hoyStr = `${year}-${month}-${day}`;

  const esParaHoy = (gestion) => {
    const fechaValor = gestion.plazo || gestion.fecha;
    if (!fechaValor) return true;
    const fechaLimpia = fechaValor.toString().split('T')[0].split(' ')[0];
    return fechaLimpia <= hoyStr;
  };

  const gestionesHoy = gestionesPendientes.filter(g => esParaHoy(g));
  const gestionesProximas = gestionesPendientes.filter(g => !esParaHoy(g));

  const horasTotalesHoy = gestionesHoy.reduce((acc, g) => {
    const hrs = parseFloat(g.horas_estimadas) || 0;
    return acc + hrs;
  }, 0);

  const limiteDiarioMax = eventos.length > 0 
    ? parseFloat(eventos[0].limite_diario_horas || eventos[0].limiteDiarioHoras || 6.0) 
    : 6.0;

  const porcentajeCarga = Math.min((horasTotalesHoy / limiteDiarioMax) * 100, 100);

  const fechaHoyTexto = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 bg-slate-50/50 min-h-screen text-slate-800">
      
      {/* Mensajes Flotantes */}
      {mensaje.texto && (
        <div className={`p-4 rounded-xl font-medium text-sm border flex items-center justify-between ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <span>{mensaje.texto}</span>
          <span>✅</span>
        </div>
      )}

      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
          Hola, ¿qué tienes planeado hoy?
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Organiza tus eventos y mantén todo bajo control.
        </p>
        <p className="text-xs text-slate-400 capitalize mt-0.5">
          {fechaHoyTexto}
        </p>
      </div>

      {/* Métricas Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 text-xl">
            📅
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">
              {eventos.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Eventos activos</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-xl">
            📋
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none mb-1">
              {gestionesHoy.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Gestiones para hoy</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 text-xl">
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

      {/* Tarjeta de Carga de Gestión */}
      <div className="bg-white border-2 border-amber-400 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-amber-800 font-bold text-sm">
          <div className="flex items-center gap-2">
            <span>Carga de gestión (Hoy)</span>
            <span>⚠</span>
          </div>
          <span>{horasTotalesHoy.toFixed(1)} / {limiteDiarioMax.toFixed(1)} h</span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${porcentajeCarga}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-amber-700 font-medium">
            {horasTotalesHoy > limiteDiarioMax 
              ? 'Advertencia de agenda: Has excedido la cuota recomendada.'
              : 'Tu carga de agenda se encuentra dentro del rango adecuado.'}
          </span>
        </div>
      </div>

      {/* Listado de Tareas clasificado */}
      <div className="space-y-6">
        <h2 className="text-xl font-extrabold text-[#0F172A]">Actividades</h2>

        {cargando && <p className="text-sm text-slate-500">⏳ Cargando gestiones...</p>}

        {error && (
          <div className="p-4 text-red-600 bg-red-50 rounded-xl text-sm border border-red-100">
            ⚠️ {error}
          </div>
        )}

        {!cargando && !error && (
          <div className="space-y-8">
            
            {/* SECCIÓN 1: PARA HOY */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                <span className="text-xs font-bold tracking-wider text-teal-700 uppercase">PARA HOY</span>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {gestionesHoy.length}
                </span>
              </div>

              {gestionesHoy.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm">
                  🎉 ¡No tienes gestiones pendientes para hoy!
                </div>
              ) : (
                <div className="space-y-3">
                  {gestionesHoy.map((gestion) => (
                    <TarjetaGestion 
                      key={gestion.id} 
                      gestion={gestion} 
                      solicitarCompletar={solicitarCompletar} 
                      handleVerDetalle={handleVerDetalle} 
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
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                <span className="text-xs font-bold tracking-wider text-purple-700 uppercase">PRÓXIMAS</span>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {gestionesProximas.length}
                </span>
              </div>

              {gestionesProximas.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm">
                  No hay gestiones programadas para días posteriores.
                </div>
              ) : (
                <div className="space-y-3">
                  {gestionesProximas.map((gestion) => (
                    <TarjetaGestion 
                      key={gestion.id} 
                      gestion={gestion} 
                      solicitarCompletar={solicitarCompletar} 
                      handleVerDetalle={handleVerDetalle} 
                      etiqueta="Próxima"
                      colorTag="bg-purple-50 text-purple-700"
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Modal de Confirmación */}
      {confirmModal.abierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Completar gestión</h3>
            <p className="text-sm text-slate-600">
              ¿Deseas marcar la gestión <strong>"{confirmModal.gestion?.descripcion}"</strong> como completada?
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
                className="px-4 py-2 bg-purple-900 text-white rounded-xl text-sm font-semibold hover:bg-purple-950 transition"
              >
                Sí, completar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const TarjetaGestion = ({ gestion, solicitarCompletar, handleVerDetalle, etiqueta, colorTag }) => {
  const fechaMostrar = gestion.plazo || gestion.fecha;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between border-l-4 border-l-teal-500 hover:shadow-md transition">
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={false}
          onChange={() => solicitarCompletar(gestion)}
          className="w-5 h-5 cursor-pointer accent-purple-800 rounded"
        />

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-md">
            📅 {gestion.eventoNombre}
          </span>
          <h3 className="text-base font-bold text-slate-900">{gestion.descripcion}</h3>
          
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {fechaMostrar && (
              <span>📅 Plazo: {fechaMostrar.toString().split('T')[0]}</span>
            )}
            {gestion.horas_estimadas !== undefined && (
              <span>⏱️ {gestion.horas_estimadas} hrs</span>
            )}
            <span className={`${colorTag} font-medium px-2 py-0.5 rounded-full text-[10px]`}>
              {etiqueta}
            </span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => handleVerDetalle(gestion.eventoId)}
        className="p-2.5 text-slate-400 hover:text-purple-800 hover:bg-purple-50 rounded-xl transition text-lg"
        title="Ver detalle del evento"
      >
        👁️
      </button>
    </div>
  );
};

export default Hoy;