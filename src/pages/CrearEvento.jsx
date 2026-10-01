import React, { useState } from 'react';
import { authService } from '../services/authService';

const CrearEvento = ({ onEventoCreado }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';

  // Datos Generales del Evento
  const [formEvento, setFormEvento] = useState({
    nombre: '',
    tipo: '',
    fecha: '',
    limite_diario_horas: ''
  });

  // Plan Logístico Inicial (Array de subtareas)
  const [gestiones, setGestiones] = useState([
    { id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }
  ]);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  // Manejo de Subtareas / Gestiones
  const handleGestionChange = (id, field, value) => {
    setGestiones(gestiones.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleAgregarSubtarea = () => {
    setGestiones([
      ...gestiones,
      { id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }
    ]);
  };

  const handleEliminarSubtarea = (id) => {
    setGestiones(gestiones.filter(g => g.id !== id));
  };

  // Envío del Formulario
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formEvento.nombre.trim() || !formEvento.tipo || !formEvento.fecha) {
    mostrarMensaje('error', 'Por favor completa todos los campos requeridos del evento.');
    return;
  }

  setCargando(true);
  const token = authService.getToken();

  try {
    const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;

    // 1. Filtrar y limpiar gestiones para evitar objetos incompletos
    const gestionesValidas = gestiones
      .filter(g => g.descripcion && g.descripcion.trim() !== '')
      .map(g => ({
        descripcion: g.descripcion.trim(),
        plazo: g.plazo || formEvento.fecha,
        horas_estimadas: String(g.horas_estimadas || '0'),
        completada: false
      }));

    const payload = {
      nombre: formEvento.nombre,
      tipo: formEvento.tipo,
      fecha: formEvento.fecha,
      limite_diario_horas: parseFloat(formEvento.limite_diario_horas) || 6.00,
      gestiones: gestionesValidas
    };

    const resEvento = await fetch(`${baseUrl}eventos/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (resEvento.status === 401) {
      authService.logout();
      window.location.href = '/login';
      return;
    }

    if (!resEvento.ok) {
      const errData = await resEvento.json();
      console.error('Error estructurado del backend:', errData);

      // Convierte en texto entendible los errores anidados (como [object Object])
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

      throw new Error(formatearError(errData));
    }

    mostrarMensaje('exito', '¡Evento y plan inicial creados con éxito!');

    // Resetear formulario
    setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
    setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);

    if (onEventoCreado) onEventoCreado();

  } catch (err) {
    mostrarMensaje('error', err.message);
  } finally {
    setCargando(false);
  }
};
  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '30px 20px', fontFamily: 'system-ui, sans-serif', color: '#0f172a', textAlign: 'left' }}>
      
      {/* Encabezado Principal */}
      <div style={{ textAlign: 'left', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '6px', textAlign: 'left' }}>
          Crear Nuevo Evento y Plan Inicial
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, textAlign: 'left' }}>
          Registra los datos generales de tu evento y el desglose opcional de subtareas logísticas.
        </p>
      </div>

      {/* Alerta de Mensajes */}
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

      <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
        
        {/* BLOQUE 1: Datos del Evento */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Datos del Evento</h2>

          <div style={{ marginBottom: '18px', textAlign: 'left' }}>
            <label style={labelStyle}>Nombre del Evento <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              required
              placeholder="Ej. Lanzamiento Producto X"
              style={inputStyle}
              value={formEvento.nombre}
              onChange={(e) => setFormEvento({ ...formEvento, nombre: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle}>Tipo <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                required
                style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
                value={formEvento.tipo}
                onChange={(e) => setFormEvento({ ...formEvento, tipo: e.target.value })}
              >
                <option value="">Selecciona el tipo de evento</option>
                <option value="Corporativo">Corporativo</option>
                <option value="Social">Social</option>
                <option value="Academico">Académico</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={labelStyle}>Fecha límite del Evento <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="date"
                required
                style={inputStyle}
                value={formEvento.fecha}
                onChange={(e) => setFormEvento({ ...formEvento, fecha: e.target.value })}
              />
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={labelStyle}>Límite diario de carga de trabajo <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ position: 'relative', maxWidth: '280px' }}>
              <input
                type="number"
                required
                step="0.5"
                placeholder="Ej. 6.00"
                style={{ ...inputStyle, paddingRight: '60px' }}
                value={formEvento.limite_diario_horas}
                onChange={(e) => setFormEvento({ ...formEvento, limite_diario_horas: e.target.value })}
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}>
                hrs/día
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '6px 0 0 0', textAlign: 'left' }}>
              ⓘ Referencia sugerida: 6.00 horas por día.
            </p>
          </div>
        </div>

        {/* BLOQUE 2: Plan Logístico Inicial */}
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Plan Logístico Inicial (Opcional)</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 0, marginBottom: '16px', textAlign: 'left' }}>
            Define las gestiones iniciales necesarias para organizar tu evento.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 40px',
            gap: '12px',
            marginBottom: '8px',
            padding: '0 4px',
            textAlign: 'left'
          }}>
            <span style={colHeaderStyle}>NOMBRE DE LA GESTIÓN</span>
            <span style={colHeaderStyle}>PLAZO</span>
            <span style={colHeaderStyle}>HORAS EST.</span>
            <span></span>
          </div>

          {gestiones.map((gest, index) => (
            <div key={gest.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder={index === 0 ? "Ej. Reservar salón" : "Ej. Confirmar catering"}
                style={inputStyle}
                value={gest.descripcion}
                onChange={(e) => handleGestionChange(gest.id, 'descripcion', e.target.value)}
              />
              <input
                type="date"
                style={inputStyle}
                value={gest.plazo}
                onChange={(e) => handleGestionChange(gest.id, 'plazo', e.target.value)}
              />
              <input
                type="number"
                step="0.5"
                placeholder="0.0"
                style={inputStyle}
                value={gest.horas_estimadas}
                onChange={(e) => handleGestionChange(gest.id, 'horas_estimadas', e.target.value)}
              />
              <button
                type="button"
                onClick={() => handleEliminarSubtarea(gest.id)}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Eliminar subtarea"
              >
                🗑️
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAgregarSubtarea}
            style={{
              background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', fontSize: '0.9rem',
              cursor: 'pointer', padding: '8px 0', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            + Agregar otra subtarea
          </button>
        </div>

        {/* Botones de Acción final */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={() => {
              setFormEvento({ nombre: '', tipo: '', fecha: '', limite_diario_horas: '' });
              setGestiones([{ id: Date.now(), descripcion: '', plazo: '', horas_estimadas: '' }]);
            }}
            style={{
              backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#334155', padding: '10px 20px',
              borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer'
            }}
          >
            Limpiar
          </button>
          <button
            type="submit"
            disabled={cargando}
            style={{
              backgroundColor: '#2563eb', border: 'none', color: '#fff', padding: '10px 24px',
              borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
              opacity: cargando ? 0.7 : 1
            }}
          >
            {cargando ? 'Guardando...' : 'Guardar Evento'}
          </button>
        </div>

      </form>
    </div>
  );
};

// Estilos Compartidos
const cardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  textAlign: 'left'
};

const cardTitleStyle = {
  fontSize: '1.15rem',
  fontWeight: '700',
  color: '#0f172a',
  marginTop: 0,
  marginBottom: '16px',
  textAlign: 'left'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '600',
  color: '#334155',
  marginBottom: '6px',
  textAlign: 'left'
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  outline: 'none',
  color: '#0f172a',
  textAlign: 'left'
};

const colHeaderStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  color: '#64748b',
  letterSpacing: '0.05em',
  textAlign: 'left'
};

export default CrearEvento;