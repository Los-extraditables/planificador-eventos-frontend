import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Timeout de 15s para evitar cuelgues
});

// Función auxiliar para obtener el token almacenado
const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Función para limpiar la sesión guardada
export const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

// Interceptor de Solicitud (Request): Adjunta el JWT Token en las cabeceras
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuesta (Response): Manejo centralizado de expiración y errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const currentPath = window.location.pathname;

    // Redirigir a login si el token expiró o es inválido (401 o 403)
    if ((status === 401 || status === 403) && !['/login', '/registro'].includes(currentPath)) {
      console.warn('Sesión caducada o no autorizada. Redirigiendo a Login...');
      clearAuthSession();
      window.location.href = '/login';
      return Promise.reject(new Error('Sesión expirada. Por favor, inicia sesión nuevamente.'));
    }

    // Formatear mensaje de error proveniente del servidor
    const mensajeError =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Error al procesar la solicitud con el servidor.';

    return Promise.reject(new Error(mensajeError));
  }
);

export default api;