const API_URL = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.detail || data.non_field_errors?.[0] || data.email?.[0] || data.username?.[0] || 'Error en la petición';
      throw new Error(errorMsg);
    }
    return data;
  } else {
    const textText = await response.text();
    console.error('Respuesta no JSON del servidor:', textText);
    throw new Error(`El servidor respondió con un error HTTP ${response.status} (${response.statusText}).`);
  }
};

// Función auxiliar para manejar errores de red / Fetch
const safeFetch = async (url, options) => {
  try {
    const response = await fetch(url, options);
    return await handleResponse(response);
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté encendido.');
    }
    throw error;
  }
};

export const authService = {
  // 1. Iniciar Sesión (POST /api/login/)
  login: async (username, password) => {
    const data = await safeFetch(`${API_URL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (data.access) {
      localStorage.setItem('accessToken', data.access);
      if (data.refresh) localStorage.setItem('refreshToken', data.refresh);

      try {
        const userProfile = await authService.getProfile(data.access);
        localStorage.setItem('user', JSON.stringify(userProfile));
        return { token: data.access, user: userProfile };
      } catch {
        const fallbackUser = { username };
        localStorage.setItem('user', JSON.stringify(fallbackUser));
        return { token: data.access, user: fallbackUser };
      }
    }

    return data;
  },

  // 2. Registro de Usuario (POST /api/register/)
  register: async (userData) => {
    return await safeFetch(`${API_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userData.fullName || userData.email,
        email: userData.email,
        password: userData.password,
        password_confirmation: userData.password,
      }),
    });
  },

  // 3. Obtener Perfil (GET /api/users/profile/)
  getProfile: async (token) => {
    const authToken = token || localStorage.getItem('accessToken');
    return await safeFetch(`${API_URL}/users/profile/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
  },

  // 4. Recuperar Contraseña (POST /api/password-reset/)
forgotPassword: async (email) => {
  return await safeFetch(`${API_URL}/password-reset/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
},

  // 5. Cerrar Sesión
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // 6. Consultas auxiliares
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem('accessToken');
  },
};