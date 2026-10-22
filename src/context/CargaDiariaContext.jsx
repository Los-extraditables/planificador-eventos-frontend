import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const CargaDiariaContext = createContext(null);

const LIMITE_MIN = 0.5;
const LIMITE_MAX = 24;
const LIMITE_DEFECTO = 6.0;
const PASO = 0.5;
const ESPERA_GUARDADO_MS = 600;

const rawApiUrl =
  import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
const API_URL = rawApiUrl.replace(/\/+$/, '');

// Endpoint donde se guarda limite_diario_horas (confirmar con backend).
const RUTA_PERFIL = '/users/profile/';

// Convierte "6.00" / 6 / "6" a número dentro del rango permitido; null si no es válido.
const normalizar = (valor) => {
  const n = parseFloat(valor);
  if (!Number.isFinite(n)) return null;
  return Math.min(LIMITE_MAX, Math.max(LIMITE_MIN, parseFloat(n.toFixed(1))));
};

// Caché local por usuario: evita que dos cuentas en el mismo navegador compartan el límite.
const claveLocal = (id) => `limiteDiarioMax:${id}`;

export const CargaDiariaProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const limiteBackend = user?.limite_diario_horas;

  const [limiteDiarioMax, setLimiteInterno] = useState(LIMITE_DEFECTO);

  // Último valor que el backend ya conoce (evita guardar lo que acaba de llegar de él).
  const valorBackendRef = useRef(null);
  const temporizadorRef = useRef(null);

  // Setter público: siempre número válido y dentro del rango.
  const setLimiteDiarioMax = useCallback((valor) => {
    setLimiteInterno((prev) => {
      const siguiente = typeof valor === 'function' ? valor(prev) : valor;
      return normalizar(siguiente) ?? prev;
    });
  }, []);

  const incrementarLimite = useCallback(
    () => setLimiteDiarioMax((prev) => prev + PASO),
    [setLimiteDiarioMax]
  );

  const decrementarLimite = useCallback(
    () => setLimiteDiarioMax((prev) => prev - PASO),
    [setLimiteDiarioMax]
  );

  // Al cambiar de usuario (login / logout): carga caché local y luego el valor del backend.
  useEffect(() => {
    if (userId === null) {
      valorBackendRef.current = null;
      setLimiteInterno(LIMITE_DEFECTO);
      return;
    }

    const local = normalizar(localStorage.getItem(claveLocal(userId)));
    if (local !== null) setLimiteInterno(local);

    const remoto = normalizar(limiteBackend);
    if (remoto !== null) {
      valorBackendRef.current = remoto;
      setLimiteInterno(remoto);
    }
  }, [userId, limiteBackend]);

  // Persiste: caché local inmediata y guardado en backend con retraso (debounce).
  useEffect(() => {
    if (userId === null) return undefined;

    try {
      localStorage.setItem(claveLocal(userId), String(limiteDiarioMax));
    } catch {
      /* noop */
    }

    if (valorBackendRef.current === null || limiteDiarioMax === valorBackendRef.current) {
      return undefined;
    }

    window.clearTimeout(temporizadorRef.current);
    temporizadorRef.current = window.setTimeout(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}${RUTA_PERFIL}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ limite_diario_horas: limiteDiarioMax })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        valorBackendRef.current = limiteDiarioMax;
      } catch (error) {
        // Queda en la caché local; se reintenta con el próximo cambio.
        console.warn('No se pudo guardar el límite diario en el servidor:', error);
      }
    }, ESPERA_GUARDADO_MS);

    return () => window.clearTimeout(temporizadorRef.current);
  }, [limiteDiarioMax, userId]);

  return (
    <CargaDiariaContext.Provider
      value={{
        limiteDiarioMax,
        setLimiteDiarioMax,
        incrementarLimite,
        decrementarLimite
      }}
    >
      {children}
    </CargaDiariaContext.Provider>
  );
};

export const useCargaDiaria = () => {
  const context = useContext(CargaDiariaContext);
  if (!context) {
    throw new Error('useCargaDiaria debe usarse dentro de un CargaDiariaProvider');
  }
  return context;
};