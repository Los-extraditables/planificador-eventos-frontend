import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para enviar el Token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // O la clave donde guardes tu JWT
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para capturar errores de autenticación (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el token expiró o es inválido, limpiar sesión y redirigir
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;