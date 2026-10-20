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
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/authService';

// Campo de fecha con icono a la izquierda y placeholder (se muestra como texto hasta que se enfoca)
const DateField = ({ value, onChange, min, max, placeholder, required, hasError }) => {
  const [enfocado, setEnfocado] = useState(false);
  const ref = useRef(null);

  return (
    <div className="relative">
      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        ref={ref}
        type={enfocado || value ? 'date' : 'text'}
        placeholder={placeholder}
        min={min}
        max={max}
        required={required}
        value={value}
        onChange={onChange}
        onFocus={() => {
          setEnfocado(true);
          setTimeout(() => { try { ref.current?.showPicker?.(); } catch { /* noop */ } }, 0);
        }}
        onBlur={() => setEnfocado(false)}
        className={`w-full pl-11 pr-4 py-3.5 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition [&::-webkit-calendar-picker-indicator]:hidden ${
          hasError
            ? 'bg-red-50/70 border-red-400 focus:ring-red-400'
            : 'bg-white border-slate-200 focus:ring-purple-600 focus:border-purple-600'
        }`}
      />
    </div>
  );
};

const DetalleEvento = () => {
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const esPosponer = location.state?.esPosponer;

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
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
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

  // Suma las horas estimadas de una lista de subtareas (opcionalmente excluyendo una)
  const sumarHoras = (gestiones, excluirId = null) =>
    gestiones.reduce((acc, g) => {
      if (excluirId !== null && g.id === excluirId) return acc;
      const h = parseFloat(g.horas_estimadas);
      return acc + (!isNaN(h) && h > 0 ? h : 0);
    }, 0);

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

      // Verificación robusta de token para evitar expulsiones falsas
      let token = localStorage.getItem('token') || authService.getToken();

      if (!token) {
        await new Promise(res => setTimeout(res, 500));
        token = localStorage.getItem('token') || authService.getToken();
      }

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
        if (reintento) {
          await new Promise(res => setTimeout(res, 1000));
          return obtenerEventos(false);
        }
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

    // Validación: el nuevo límite no puede ser menor a las horas ya asignadas
    const nuevoLimite = parseFloat(formEvento.limite_diario_horas);
    const horasUsadas = sumarHoras(eventoActivo?.gestiones || eventoActivo?.gestiones_plan || []);

    if (isNaN(nuevoLimite) || nuevoLimite <= 0) {
      mostrarMensaje('error', 'Ingresa un límite de horas mayor a 0.');
      return;
    }

    if (nuevoLimite < horasUsadas) {
      mostrarMensaje(
        'error',
        `No puedes bajar el límite a ${nuevoLimite} h porque tus subtareas ya suman ${horasUsadas} h. Reduce las horas de las subtareas o elimina alguna, o deja el límite en ${horasUsadas} h o más.`
      );
      return;
    }

    const fechaAnteriorLimpia = (eventoActivo?.fecha || '').split('T')[0].split(' ')[0];
    const fechaNuevaLimpia = (formEvento.fecha || '').split('T')[0].split(' ')[0];
    const cambioFecha = fechaNuevaLimpia !== fechaAnteriorLimpia;

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
          fecha: fechaNuevaLimpia,
          limite_diario_horas: nuevoLimite,
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

      if (cambioFecha) {
        const gestionesActuales = eventoActivo?.gestiones || eventoActivo?.gestiones_plan || [];
        let erroresSubtareas = [];

        for (const sub of gestionesActuales) {
          const resSub = await fetch(`${API_URL}/gestiones/${sub.id}/?forzar_sobrecarga=true`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              plazo: fechaNuevaLimpia,
              estado: 'pospuesto',
              nota_pospuesto: 'Pospuesto por cambio de fecha del evento',
              pospuesto: true,
              forzar_sobrecarga: true,
              forzar: true
            })
          });

          if (!resSub.ok) {
            const errSub = await resSub.json().catch(() => ({}));
            console.error(`Error actualizando subtarea ${sub.id}:`, errSub);
            if (resSub.status === 409) {
              erroresSubtareas.push(`"${sub.descripcion}" excede el límite de horas en esa fecha`);
            } else {
              erroresSubtareas.push(`"${sub.descripcion}": ${errSub.mensaje || 'Error al actualizar'}`);
            }
          }
        }

        if (erroresSubtareas.length > 0) {
          mostrarMensaje('error', `Evento guardado, pero falló en subtareas: ${erroresSubtareas.join(', ')}`);
          setModalEvento(false);
          await obtenerEventos();
          return;
        }
      }

      mostrarMensaje('exito', '¡Evento y subtareas actualizados con éxito!');
      setModalEvento(false);
      await obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  // --- MODAL GESTIONES ---
  const handleAbrirCrear = () => {
    setFormGestion({ descripcion: '', plazo: '', horas_estimadas: '' });
    setModalGestion({ abierto: true, modo: 'crear', gestionId: null });
  };

  const handleAbrirEditar = (gestion) => {
    setFormGestion({
      descripcion: gestion.descripcion,
      plazo: (gestion.plazo || '').toString().split('T')[0].split(' ')[0],
      horas_estimadas: gestion.horas_estimadas ? String(gestion.horas_estimadas) : ''
    });
    setModalGestion({ abierto: true, modo: 'editar', gestionId: gestion.id });
  };

  const handleGuardarGestion = async (e) => {
    e.preventDefault();
    const token = authService.getToken();
    if (!token) return handleSesionExpirada();

    const fechaEvento = (eventoActivo?.fecha || '').toString().split('T')[0].split(' ')[0];
    // Si no se elige plazo, se usa la fecha límite del evento (igual que al crear evento)
    const plazoFinal = formGestion.plazo || fechaEvento;
    const nuevasHoras = parseFloat(formGestion.horas_estimadas);

    if (!plazoFinal) {
      mostrarMensaje('error', 'El evento activo no tiene una fecha definida.');
      return;
    }

    if (formGestion.plazo && formGestion.plazo < hoyStr) {
      mostrarMensaje('error', 'El plazo no puede ser anterior a hoy.');
      return;
    }

    if (formGestion.plazo && fechaEvento && formGestion.plazo > fechaEvento) {
      mostrarMensaje('error', `El plazo no puede ser posterior a la fecha límite del evento (${formatearFechaDisplay(fechaEvento)}).`);
      return;
    }

    if (!formGestion.descripcion || !formGestion.descripcion.trim()) {
      mostrarMensaje('error', 'La descripción de la subtarea es obligatoria.');
      return;
    }

    if (isNaN(nuevasHoras) || nuevasHoras <= 0) {
      mostrarMensaje('error', 'Las horas estimadas deben ser un número mayor que cero.');
      return;
    }

    const limiteEvento = parseFloat(eventoActivo?.limite_diario_horas);
    if (!isNaN(limiteEvento) && limiteEvento > 0) {
      const gestionesActuales = eventoActivo?.gestiones || eventoActivo?.gestiones_plan || [];

      const horasExistentes = sumarHoras(
        gestionesActuales,
        modalGestion.modo === 'editar' ? modalGestion.gestionId : null
      );

      const totalConNuevas = horasExistentes + nuevasHoras;

      if (totalConNuevas > limiteEvento) {
        mostrarMensaje(
          'error',
          `No se puede guardar: las subtareas sumarían ${totalConNuevas} h y el límite del evento es ${limiteEvento} h. Te quedan ${Math.max(limiteEvento - horasExistentes, 0)} h disponibles. Reduce las horas de esta subtarea o aumenta el límite del evento.`
        );
        return;
      }
    }

    try {
      if (modalGestion.modo === 'crear') {
        const response = await fetch(`${API_URL}/gestiones/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            descripcion: formGestion.descripcion.trim(),
            plazo: plazoFinal,
            horas_estimadas: nuevasHoras,
            completada: false,
            evento: parseInt(eventoActivo.id, 10)
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
            pospuesto: false
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

  // --- Avisos en vivo de horas ---
  const limiteActual = parseFloat(eventoActivo?.limite_diario_horas) || 0;
  const horasOtras = sumarHoras(
    gestionesEv,
    modalGestion.modo === 'editar' ? modalGestion.gestionId : null
  );
  const horasNuevas = parseFloat(formGestion.horas_estimadas) || 0;
  const excedeSubtarea = limiteActual > 0 && horasOtras + horasNuevas > limiteActual;

  const horasSubtareasTotal = sumarHoras(gestionesEv);
  const nuevoLimiteForm = parseFloat(formEvento.limite_diario_horas);
  const limiteMuyBajo = !isNaN(nuevoLimiteForm) && nuevoLimiteForm < horasSubtareasTotal;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 text-left bg-slate-50/50 min-h-screen space-y-6">

      {/* MENSAJE FLOTANTE (visible también sobre los modales) */}
      {mensaje.texto && (
        <div
          role="alert"
          className={`fixed top-5 right-5 z-[60] max-w-sm flex items-start gap-2.5 px-5 py-4 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
            mensaje.tipo === 'exito' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/hoy')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Hoy
        </button>

        <div className="flex items-center gap-3 flex-wrap">
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
              const gestionesLista = ev.gestiones || ev.gestiones_plan || [];
              const completadasLista = gestionesLista.filter(g => g.completada).length;
              const total = gestionesLista.length;
              const porc = total > 0 ? Math.round((completadasLista / total) * 100) : 0;

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
                      <span className="text-xs font-bold text-slate-600">{completadasLista}/{total} subtareas ({porc}%)</span>
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
        <>
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
                  <Clock className="w-3.5 h-3.5 text-purple-600" /> Máx. {eventoActivo.limite_diario_horas} hrs (total)
                </span>
              )}
            </div>
          </div>

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
                      {sub.pospuesto && (
                        <span className="shrink-0 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Pospuesto
                        </span>
                      )}
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-[#1e2b4d]">Editar evento</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Actualiza los datos generales y la capacidad diaria de trabajo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEvento(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEvento} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del evento
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition"
                  value={formEvento.nombre}
                  onChange={(e) => setFormEvento({ ...formEvento, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de evento
                  </label>
                  <select
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition cursor-pointer"
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha límite
                  </label>
                  <DateField
                    required
                    min={hoyStr}
                    placeholder="Ej. 20/09/2026"
                    value={formEvento.fecha}
                    onChange={(e) => setFormEvento({ ...formEvento, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Máximo de horas por día
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    required
                    placeholder="Ej. 6"
                    className={`w-full pl-11 pr-24 py-3.5 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                      limiteMuyBajo
                        ? 'bg-red-50/70 border-red-400 focus:ring-red-400'
                        : 'bg-white border-slate-200 focus:ring-purple-600 focus:border-purple-600'
                    }`}
                    value={formEvento.limite_diario_horas}
                    onChange={(e) => setFormEvento({ ...formEvento, limite_diario_horas: e.target.value })}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                    horas/día
                  </span>
                </div>
                {limiteMuyBajo && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    Tus subtareas ya suman {horasSubtareasTotal} h. Reduce o elimina subtareas, o usa un límite de {horasSubtareasTotal} h o más.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEvento(false)}
                  className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR SUBTAREA (GESTIÓN) */}
      {modalGestion.abierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-[#1e2b4d]">
                  {modalGestion.modo === 'crear' ? 'Agregar subtarea' : 'Editar subtarea'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {modalGestion.modo === 'crear'
                    ? 'Añade una nueva subtarea a este evento.'
                    : 'Actualiza los datos de esta subtarea.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalGestion({ abierto: false, modo: 'crear', gestionId: null })}
                className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarGestion} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de la subtarea
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Confirmar servicio de catering"
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition"
                  value={formGestion.descripcion}
                  onChange={(e) => setFormGestion({ ...formGestion, descripcion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha</label>
                  <DateField
                    min={hoyStr}
                    max={(eventoActivo?.fecha || '').toString().split('T')[0].split(' ')[0] || undefined}
                    placeholder="Ej. 20/09/2026"
                    value={formGestion.plazo}
                    onChange={(e) => setFormGestion({ ...formGestion, plazo: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Horas estimadas
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      required
                      placeholder="Ej. 2.5"
                      className={`w-full pl-11 pr-4 py-3.5 border rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                        excedeSubtarea
                          ? 'bg-red-50/70 border-red-400 focus:ring-red-400'
                          : 'bg-white border-slate-200 focus:ring-purple-600 focus:border-purple-600'
                      }`}
                      value={formGestion.horas_estimadas}
                      onChange={(e) => setFormGestion({ ...formGestion, horas_estimadas: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {limiteActual > 0 && (
                <p className={`text-xs font-medium ${excedeSubtarea ? 'text-red-600' : 'text-slate-500'}`}>
                  {excedeSubtarea
                    ? `Superas el límite: ${horasOtras + horasNuevas} h de ${limiteActual} h. Reduce las horas o aumenta el límite del evento.`
                    : `Disponibles: ${Math.max(limiteActual - horasOtras, 0)} h de ${limiteActual} h.`}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalGestion({ abierto: false, modo: 'crear', gestionId: null })}
                  className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer"
                >
                  {modalGestion.modo === 'crear' ? (
                    <>
                      <Plus className="w-4 h-4" /> Agregar subtarea
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
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