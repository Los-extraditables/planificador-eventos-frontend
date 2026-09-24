import { useEffect, useState } from 'react';
import GestionCard from '../components/GestionCard';

const Hoy = () => {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // --- CONFIGURACIÓN DINÁMICA DE LA URL DE LA API ---
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : 'https://planificador-eventos-backend.onrender.com';

  useEffect(() => {
    const obtenerEventosYGestiones = async () => {
      try {
        setCargando(true);
        const response = await fetch(`${API_URL}/api/eventos/`);
        
        if (!response.ok) {
          throw new Error('No se pudieron cargar los eventos del servidor.');
        }

        const data = await response.json();
        setEventos(data);
      } catch (err) {
        console.error('Error al cargar eventos:', err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    obtenerEventosYGestiones();
  }, []);

  return (
    <div style={{ padding: '0 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Vista Hoy: Eventos y gestiones registradas</h2>
      <p style={{ color: '#0f172a', fontSize: '0.9em' }}>
        <strong>Estado:</strong> Conectado con el backend en vivo de Evans.
      </p>

      {cargando && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#0f172a' }}>
          <p>⏳ Cargando eventos desde el servidor...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '15px', color: '#dc2626', background: '#fef2f2', borderRadius: '8px', marginBottom: '15px' }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {!cargando && !error && eventos.length === 0 && (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>
          No hay eventos registrados todavía. ¡Prueba creando uno nuevo!
        </p>
      )}

      {!cargando && !error && eventos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          {eventos.map((evento) => (
            <div key={evento.id} style={{ border: '1px solid #cbd5e1', padding: '20px', borderRadius: '10px', background: '#fff' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>{evento.nombre}</h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#64748b' }}>
                <strong>Tipo:</strong> {evento.tipo} | <strong>Fecha límite:</strong> {evento.fecha}
              </p>

              <h4 style={{ fontSize: '0.95em', color: '#4f46e5', margin: '15px 0 8px 0' }}>Plan Logístico / Subtareas:</h4>
              {evento.gestiones && evento.gestiones.length > 0 ? (
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  {evento.gestiones.map((sub, index) => (
                    <li key={index} style={{ fontSize: '0.9em', marginBottom: '4px', color: '#334155' }}>
                      {sub.descripcion} (Plazo: {sub.plazo} - {sub.horas_estimadas} hrs)
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.85em', color: '#94a3b8', fontStyle: 'italic' }}>Sin subtareas registradas para este evento.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Hoy;