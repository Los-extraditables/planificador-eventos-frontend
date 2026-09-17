import { useEffect, useState } from 'react';
import GestionCard from '../components/GestionCard';
import { DATOS_DEMO_HOY } from '../data/mockData';

const Hoy = () => {
  const [gestiones, setGestiones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerGestionesHoy = async () => {
      try {
        setCargando(true);
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
      <p style={{ color: '#0f172a', fontSize: '0.9em' }}>
        <strong>Modo Demo:</strong> Mostrando gestiones pendientes para el evento actual.
      </p>

      {cargando && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#0f172a' }}>
          <p>⏳ Cargando gestiones urgentes...</p>
        </div>
      )}

      {!cargando && gestiones.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {gestiones.map((item) => (
            <GestionCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default Hoy;