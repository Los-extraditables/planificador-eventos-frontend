import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

// Datos simulados por el usuario Demo 

const DATOS_DEMO_HOY = [
  {
    id: 1,
    titulo: 'Reservar salón de eventos',
    categoria: 'Espacio',
    horasEstimadas: 2,
    urgente: true,
    estado: 'pendiente'
  },
  {
    id: 2,
    titulo: 'Confirmar servicio de catering',
    categoria: 'Alimentación',
    horasEstimadas: 3,
    urgente: true,
    estado: 'pendiente'
  },
  {
    id: 3,
    titulo: 'Enviar invitaciones a proveedores',
    categoria: 'Logística',
    horasEstimadas: 1,
    urgente: false,
    estado: 'pendiente'
  }
];

// Vista /hoy que consume los endpoint simulados del usuario demo 
const Hoy = () => {
  const [gestiones, setGestiones] = useState([]);
  const [cargando, setCargando] = useState(true);

   useEffect(() => {
    // Simulación de petición HTTP GET al backend (con delay de 800ms)
    const obtenerGestionesHoy = async () => {
      try {
        setCargando(true);
        //simula respuesta desde la API REST
        await new Promise((resolve) => setTimeout(resolve, 800));
        setGestiones(DATOS_DEMO_HOY);
      } catch (error) {
        console.error('Error al cargar gestiones:', error);
      } finally {
        setCargando(false);
      }
    };

    obtenerGestionesHoy();
   }, []);

   return (
    <div style={{ padding: '0 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Vista Hoy: Gestiones urgentes del día</h2>
      <p style={{ color: '#888', fontSize: '0.9em' }}>
        <strong>Modo Demo:</strong> Mostrando gestiones pendientes para el evento actual.
      </p>

      {/* Estado 1: Cargando */}
      {cargando && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
          <p>⏳ Cargando gestiones urgentes...</p>
        </div>
      )}

      {/* Estado 2: Éxito (Lista de tareas) */}
      {!cargando && gestiones.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {gestiones.map((item) => (
            <li
              key={item.id}
              style={{
                background: '#242424',
                color: '#fff',
                margin: '12px 0',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: item.urgente ? '5px solid #ff4d4d' : '5px solid #4da6ff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1em' }}>{item.titulo}</h3>
                <span style={{ fontSize: '0.85em', color: '#aaa', marginRight: '15px' }}>
                  📁 {item.categoria}
                </span>
                <span style={{ fontSize: '0.85em', color: '#aaa' }}>
                  ⏱️ {item.horasEstimadas} hrs estimadas
                </span>
              </div>
              {item.urgente && (
                <span
                  style={{
                    background: '#ff4d4d22',
                    color: '#ff4d4d',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8em',
                    fontWeight: 'bold'
                  }}
                >
                  URGENTE
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Vistas secundarias
const CrearEvento = () => <div style={{ padding: '0 20px' }}><h2>Vista Crear: Crear un evento y plan inicial</h2></div>;
const DetalleEvento = () => <div style={{ padding: '0 20px' }}><h2>Vista Evento: Detalles y edición del evento</h2></div>;
const Progreso = () => <div style={{ padding: '0 20px' }}><h2>Vista Progreso: Registro de tareas y avance</h2></div>;

function App() {
  return (
    <Router>
      <nav style={{ padding: '15px 20px', borderBottom: '1px solid #333', marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <a href="/hoy" style={{ color: '#646cff', textDecoration: 'none', fontWeight: 'bold' }}>Hoy</a>
        <a href="/crear" style={{ color: '#646cff', textDecoration: 'none' }}>Crear Evento</a>
        <a href="/evento/1" style={{ color: '#646cff', textDecoration: 'none' }}>Evento (ID: 1)</a>
        <a href="/progreso" style={{ color: '#646cff', textDecoration: 'none' }}>Progreso</a>
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/hoy" replace />} />
        <Route path="/hoy" element={<Hoy />} />
        <Route path="/crear" element={<CrearEvento />} />
        <Route path="/evento/:id" element={<DetalleEvento />} />
        <Route path="/progreso" element={<Progreso />} />
      </Routes>
    </Router>
  );
}

export default App;

