import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';

const DetalleEvento = () => {
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

  const obtenerEventos = async () => {
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

      if (response.status === 401) {
        authService.logout();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('No se pudieron cargar los eventos.');

      const data = await response.json();
      setEventos(data);

      if (!eventoSeleccionadoId && data.length > 0) {
        setEventoSeleccionadoId(data[0].id);
      }
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

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
  };

  const eventoActivo = eventos.find(e => e.id === parseInt(eventoSeleccionadoId)) || eventos[0];

  const handleToggleGestion = async (gestion) => {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/gestiones/${gestion.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completada: !gestion.completada })
      });

      if (response.status === 401) {
        authService.logout();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('Error al actualizar gestión.');
      obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  const handleAbrirCrear = () => {
    setFormGestion({ descripcion: '', plazo: '', horas_estimadas: '' });
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

    try {
      if (modalGestion.modo === 'crear') {
        // 1. Preparamos la nueva gestión con el formato exacto del backend (horas_estimadas como String)
        const nuevaGestion = {
          descripcion: formGestion.descripcion,
          plazo: formGestion.plazo || eventoActivo.fecha,
          horas_estimadas: String(formGestion.horas_estimadas || '0'),
          completada: false
        };

        // Obtener la lista actual de gestiones que ya tiene el evento
        const gestionesActuales = eventoActivo.gestiones || eventoActivo.gestiones_plan || [];

        // 2. Intentamos primero crearlo mediante el endpoint de gestiones (enviando horas como string)
        let response = await fetch(`${API_URL}/gestiones/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...nuevaGestion,
            evento: parseInt(eventoActivo.id, 10),
            evento_id: parseInt(eventoActivo.id, 10)
          })
        });

        // 3. Si el endpoint individual falla (Error 500), agregamos la gestión actualizando el evento
        if (!response.ok) {
          const payloadEvento = {
            ...eventoActivo,
            gestiones: [...gestionesActuales, nuevaGestion]
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

        if (response.status === 401) {
          authService.logout();
          window.location.href = '/login';
          return;
        }

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            const mensajeError = typeof errorData === 'object' 
              ? Object.entries(errorData).map(([k, v]) => `${k}: ${v}`).join(' | ') 
              : 'No se pudo añadir la gestión.';
            throw new Error(mensajeError);
          } else {
            const textError = await response.text();
            console.error('Error devuelto por el servidor:', textError);
            throw new Error(`Error ${response.status}: Revisa la consola del navegador o los logs del backend.`);
          }
        }

        mostrarMensaje('exito', 'Gestión añadida con éxito.');
      } else {
        // Edición de gestión existente
        const payloadEditar = {
          descripcion: formGestion.descripcion,
          plazo: formGestion.plazo,
          horas_estimadas: String(formGestion.horas_estimadas || '0')
        };

        const response = await fetch(`${API_URL}/gestiones/${modalGestion.gestionId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payloadEditar)
        });

        if (response.status === 401) {
          authService.logout();
          window.location.href = '/login';
          return;
        }

        if (!response.ok) throw new Error('No se pudo actualizar la gestión.');
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
      const response = await fetch(`${API_URL}/gestiones/${gestionId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        authService.logout();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('No se pudo eliminar la gestión.');

      mostrarMensaje('exito', 'Gestión eliminada.');
      obtenerEventos();
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontFamily: 'sans-serif' }}>
        <p>⏳ Cargando detalle de eventos...</p>
      </div>
    );
  }

  if (error || eventos.length === 0) {
    return (
      <div style={{ padding: '30px 20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', textAlign: 'left' }}>
        <h2>Detalle de Eventos</h2>
        <p style={{ color: '#64748b' }}>No hay eventos disponibles para mostrar. Crea un evento en la pestaña "Crear Evento".</p>
      </div>
    );
  }

  const gestionesEv = eventoActivo?.gestiones || eventoActivo?.gestiones_plan || [];
  const completadas = gestionesEv.filter(g => g.completada).length;
  const totalGestiones = gestionesEv.length;
  const porcentaje = totalGestiones > 0 ? Math.round((completadas / totalGestiones) * 100) : 0;

  return (
    <div style={{ padding: '30px 20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', textAlign: 'left' }}>
      
      {mensaje.texto && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '500', textAlign: 'left',
          backgroundColor: mensaje.tipo === 'exito' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${mensaje.tipo === 'exito' ? '#bbf7d0' : '#fecaca'}`,
          color: mensaje.tipo === 'exito' ? '#16a34a' : '#dc2626'
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Selector de Evento */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>Seleccionar Evento:</label>
        <select
          value={eventoActivo?.id || ''}
          onChange={(e) => setEventoSeleccionadoId(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#fff', cursor: 'pointer' }}
        >
          {eventos.map(e => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </div>

      {/* Cabecera del Evento Activo */}
      <h1 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 10px 0', textAlign: 'left' }}>{eventoActivo?.nombre}</h1>
      
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
          En preparación
        </span>
        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
          {eventoActivo?.tipo || 'Evento'}
        </span>
        <span style={{ fontSize: '0.88rem', color: '#64748b', marginLeft: '6px' }}>
          📅 Límite: {eventoActivo?.fecha || 'Sin fecha'}
        </span>
      </div>

      {/* Tarjeta de Progreso */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>
          <span>Progreso del evento</span>
          <span>{completadas}/{totalGestiones} subtareas <strong>{porcentaje}%</strong></span>
        </div>
        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${porcentaje}%`, height: '100%', background: '#2563eb', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Lista de Subtareas */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Subtareas / Gestiones</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', color: '#64748b' }}>{totalGestiones} tareas</span>
            <button
              onClick={handleAbrirCrear}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
            >
              + Añadir Gestión
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {gestionesEv.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
              No hay subtareas creadas para este evento. Haz clic en "+ Añadir Gestión".
            </p>
          ) : (
            gestionesEv.map((sub) => (
              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={sub.completada || false}
                    onChange={() => handleToggleGestion(sub)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                  <span style={{
                    fontSize: '0.95rem',
                    color: sub.completada ? '#94a3b8' : '#1e293b',
                    textDecoration: sub.completada ? 'line-through' : 'none',
                    fontWeight: '500'
                  }}>
                    {sub.descripcion}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>📅 {sub.plazo}</span>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>⏱ {sub.horas_estimadas} hrs</span>
                  
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: sub.completada ? '#16a34a' : '#64748b'
                  }}>
                    {sub.completada ? '✓ Completada' : 'Pendiente'}
                  </span>

                  <button
                    onClick={() => handleAbrirEditar(sub)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#64748b' }}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleEliminarGestion(sub.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#ef4444' }}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalGestion.abierto && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', textAlign: 'left' }}>
              {modalGestion.modo === 'crear' ? 'Añadir Nueva Gestión' : 'Editar Gestión'}
            </h3>
            <form onSubmit={handleGuardarGestion} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Descripción</label>
                <input
                  type="text"
                  required
                  style={inputStyle}
                  value={formGestion.descripcion}
                  onChange={(e) => setFormGestion({ ...formGestion, descripcion: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Plazo</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={formGestion.plazo}
                  onChange={(e) => setFormGestion({ ...formGestion, plazo: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Horas estimadas</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  style={inputStyle}
                  value={formGestion.horas_estimadas}
                  onChange={(e) => setFormGestion({ ...formGestion, horas_estimadas: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalGestion({ abierto: false, modo: 'crear', gestionId: null })}
                  style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
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

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};

const modalContentStyle = {
  background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
};

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '4px', textAlign: 'left' };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box', textAlign: 'left' };

export default DetalleEvento;