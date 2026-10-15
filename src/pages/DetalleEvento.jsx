import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Plus,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const [eventoSeleccionadoId, setEventoSeleccionadoId] = useState(urlId || 'todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados para Modal de Crear / Editar Subtarea (Gestión)
  const [modalGestion, setModalGestion] = useState({ abierto: false, modo: 'crear', gestionId: null });
  const [formGestion, setFormGestion] = useState({ descripcion: '', plazo: '', horas_estimadas: '' });

  // Estados para Modal de Editar Evento
  const [modalEvento, setModalEvento] = useState(false);
  const [formEvento, setFormEvento] = useState({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });

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

  const formatearFechaDisplay = (fechaStr) => {
    if (!fechaStr) return '';
    const fechaLimpia = fechaStr.toString().split('T')[0].split(' ')[0];
    const partes = fechaLimpia.split('-');
    if (partes.length < 3) return fechaLimpia;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
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
      } else if (data.length > 0 && eventoSeleccionadoId === null) {
        setEventoSeleccionadoId('todos');
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

  const eventoActivo = eventoSeleccionadoId !== 'todos' 
    ? eventos.find(e => String(e.id) === String(eventoSeleccionadoId)) 
    : null;

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

  // --- MODAL EDITAR EVENTO ---
  const handleAbrirEditarEvento = () => {
    if (!eventoActivo) return;
    setFormEvento({
      nombre: eventoActivo.nombre || '',
      tipo: eventoActivo.tipo || eventoActivo.categoria || '',
      fecha: eventoActivo.fecha || '',
      limite_diario_horas: eventoActivo.limite_diario_horas || ''
    });
    setModalEvento(true);
  };

  const handleGuardarEvento = async (e) => {
    e.preventDefault();
    const token = authService.getToken();
    if (!token) return handleSesionExpirada();

    const nuevaFechaEvento = formEvento.fecha;
    const fechaAnteriorEvento = eventoActivo.fecha;

    try {
      const response = await fetch(`${API_URL}/eventos/${eventoActivo.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: formEvento.nombre.trim(),
          tipo: formEvento.tipo,
          fecha: nuevaFechaEvento,
          limite_diario_horas: parseFloat(formEvento.limite_diario_horas) || 6,
          forzar_sobrecarga: true
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

      if (nuevaFechaEvento !== fechaAnteriorEvento) {
        const gestionesActuales = eventoActivo?.gestiones || eventoActivo?.gestiones_plan || [];
        
        for (const sub of gestionesActuales) {
          await fetch(`${API_URL}/gestiones/${sub.id}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ plazo: nuevaFechaEvento, forzar_sobrecarga: true })
          });
        }
      }

      mostrarMensaje('exito', '¡Evento y subtareas actualizados con éxito!');
      setModalEvento(false);
      obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  // --- MODAL GESTIONES ---
  const handleAbrirCrear = () => {
    setFormGestion({ descripcion: '', plazo: eventoActivo?.fecha || hoyStr, horas_estimadas: '' });
    setModalGestion({ abierto: true, modo: 'crear', gestionId: null });
  };

  const handleAbrirEditar = (gestion) => {
    setFormGestion({
      descripcion: gestion.descripcion,
      plazo: eventoActivo?.fecha || gestion.plazo || '',
      horas_estimadas: gestion.horas_estimadas ? String(gestion.horas_estimadas) : ''
    });
    setModalGestion({ abierto: true, modo: 'editar', gestionId: gestion.id });
  };

  const handleGuardarGestion = async (e) => {
    e.preventDefault();
    const token = authService.getToken();
    if (!token) return handleSesionExpirada();

    const plazoFinal = eventoActivo?.fecha;
    const nuevasHoras = parseFloat(formGestion.horas_estimadas) || 0;

    if (!plazoFinal) {
      mostrarMensaje('error', 'El evento activo no tiene una fecha definida.');
      return;
    }

    try {
      const payloadBase = {
        descripcion: formGestion.descripcion.trim(),
        plazo: plazoFinal,
        horas_estimadas: nuevasHoras,
        completada: false,
        forzar_sobrecarga: true
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
          const gestionesActuales = eventoActivo?.gestiones || eventoActivo?.gestiones_plan || [];
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

        mostrarMensaje('exito', 'Subtarea añadida con éxito.');
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
            horas_estimadas: nuevasHoras,
            forzar_sobrecarga: true
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

        mostrarMensaje('exito', 'Subtarea actualizada correctamente.');
      }

      setModalGestion({ abierto: false, modo: 'crear', gestionId: null });
      obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  const handleEliminarGestion = async (gestionId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta subtarea?')) return;

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
        throw new Error(formatearError(errData) || 'No se pudo eliminar la subtarea.');
      }

      mostrarMensaje('exito', 'Subtarea eliminada.');
      obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  // --- ESTILO DE CARGA SKELETON ---
  if (cargando) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 text-left bg-slate-50/50 min-h-screen">
        <div className="py-12 px-4 flex flex-col items-center justify-center space-y-8 animate-fade-in">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <CalendarClock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Cargando detalles de eventos
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Organizamos la información. Tomará solo un momento.
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
      </div>
    );
  }

  if (error || eventos.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6 font-sans text-slate-800 text-left">
        <button
          onClick={() => navigate('/hoy')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Hoy
        </button>
        <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'No hay eventos disponibles para mostrar. Crea un evento nuevo.'}</span>
        </div>
        <button
          onClick={() => obtenerEventos()}
          className="px-5 py-2.5 bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 text-left bg-slate-50/50 min-h-screen space-y-6">
      
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

      {/* Top Header: Volver a Hoy + Selector + Botón Editar (Solo si hay evento seleccionado) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/hoy')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Hoy
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de Evento Estilizado (Con opción Todos los eventos) */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-sm">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={eventoSeleccionadoId}
              onChange={(e) => setEventoSeleccionadoId(e.target.value)}
              className="bg-transparent text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los eventos</option>
              {eventos.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          {/* Botón Editar Evento (Solo aparece si se está viendo un evento específico) */}
          {eventoSeleccionadoId !== 'todos' && eventoActivo && (
            <button
              onClick={handleAbrirEditarEvento}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-800 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-purple-600" /> Editar evento
            </button>
          )}
        </div>
      </div>

      {/* VISTA 1: MOSTRAR TODOS LOS EVENTOS (Evita saturación de información) */}
      {eventoSeleccionadoId === 'todos' ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Lista general de eventos
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Selecciona cualquier evento para ver sus subtareas y detalles completos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2">
            {eventos.map((ev) => {
              const gestionesEv = ev.gestiones || ev.gestiones_plan || [];
              const completadas = gestionesEv.filter(g => g.completada).length;
              const total = gestionesEv.length;
              const porc = total > 0 ? Math.round((completadas / total) * 100) : 0;

              return (
                <div
                  key={ev.id}
                  onClick={() => setEventoSeleccionadoId(String(ev.id))}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#7E22CE] transition">
                        {ev.nombre}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {ev.tipo || ev.categoria || 'Evento'} • Límite: {ev.fecha ? formatearFechaDisplay(ev.fecha) : 'Sin fecha'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 justify-between sm:justify-end">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-bold text-slate-600">{completadas}/{total} subtareas ({porc}%)</span>
                      <div className="w-32 bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div className="bg-[#7E22CE] h-2 rounded-full" style={{ width: `${porc}%` }} />
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#7E22CE] bg-purple-50 group-hover:bg-[#7E22CE] group-hover:text-white px-3.5 py-2 rounded-xl transition">
                      Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISTA 2: DISEÑO A DETALLE DE UN EVENTO ESPECÍFICO (Sin cambios respecto al diseño original) */
        <>
          {/* Título e Información del Evento */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {eventoActivo?.nombre}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] rounded-full text-xs font-bold">
                {eventoActivo?.estado || 'En preparación'}
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-bold">
                {eventoActivo?.tipo || eventoActivo?.categoria || 'Evento'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Límite: {eventoActivo?.fecha ? formatearFechaDisplay(eventoActivo.fecha) : 'Sin fecha'}
              </span>
              {eventoActivo?.limite_diario_horas && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-purple-600" /> Máx. {eventoActivo.limite_diario_horas} hrs/día
                </span>
              )}
            </div>
          </div>

          {/* Tarjeta de Progreso */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span className="uppercase tracking-wider">Progreso del evento</span>
              <span className="text-slate-900 font-extrabold">{completadas}/{totalGestiones} subtareas <span className="text-purple-700 ml-1">{porcentaje}%</span></span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#7E22CE] transition-all duration-500 rounded-full"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>

          {/* Lista de Subtareas */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Subtareas</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">{totalGestiones} subtareas</span>
                <button
                  onClick={handleAbrirCrear}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 font-bold text-xs sm:text-sm rounded-xl transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Agregar subtarea
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {gestionesEv.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">
                  No hay subtareas creadas para este evento. Haz clic en "+ Agregar subtarea".
                </p>
              ) : (
                gestionesEv.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={sub.completada || false}
                        onChange={() => handleToggleGestion(sub)}
                        className="w-5 h-5 rounded text-purple-700 focus:ring-purple-600 cursor-pointer accent-purple-700 flex-shrink-0"
                      />
                      <span className={`text-sm font-semibold truncate ${
                        sub.completada ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}>
                        {sub.descripcion}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap justify-end">
                      {sub.plazo && (
                        <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <CalendarClock className="w-3.5 h-3.5 text-slate-400" /> {formatearFechaDisplay(sub.plazo)}
                        </span>
                      )}

                      {sub.horas_estimadas !== undefined && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {sub.horas_estimadas} hrs
                        </span>
                      )}
                      
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        sub.completada 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {sub.completada ? '✓ Completada' : 'Pendiente'}
                      </span>

                      <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                        <button
                          onClick={() => handleAbrirEditar(sub)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 rounded-lg transition cursor-pointer"
                          title="Editar subtarea"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminarGestion(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                          title="Eliminar subtarea"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL: EDITAR EVENTO */}
      {modalEvento && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              Editar Datos del Evento
            </h3>
            
            <form onSubmit={handleGuardarEvento} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nombre del Evento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={formEvento.nombre}
                  onChange={(e) => setFormEvento({ ...formEvento, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition cursor-pointer"
                    value={formEvento.tipo}
                    onChange={(e) => setFormEvento({ ...formEvento, tipo: e.target.value })}
                  >
                    <option value="">Selecciona</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Social">Social</option>
                    <option value="Academico">Académico</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Fecha Límite <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={hoyStr}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                    value={formEvento.fecha}
                    onChange={(e) => setFormEvento({ ...formEvento, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Límite Diario de Horas <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={formEvento.limite_diario_horas}
                  onChange={(e) => setFormEvento({ ...formEvento, limite_diario_horas: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEvento(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR SUBTAREA */}
      {modalGestion.abierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              {modalGestion.modo === 'crear' ? 'Añadir Nueva Subtarea' : 'Editar Subtarea'}
            </h3>
            
            <form onSubmit={handleGuardarGestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Búsqueda y cotización"
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
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
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  value={eventoActivo?.fecha || formGestion.plazo || ''}
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
                  placeholder="Ej. 2.0"
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
                  value={formGestion.horas_estimadas}
                  onChange={(e) => setFormGestion({ ...formGestion, horas_estimadas: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalGestion({ abierto: false, modo: 'crear', gestionId: null })}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  Guardar Subtarea
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