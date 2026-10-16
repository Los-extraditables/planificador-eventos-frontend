import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const rawApiUrl = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
  const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

  // Al cargar la página, comprueba si el usuario ya tenía sesión iniciada
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // Función para iniciar sesión 
  const login = async (username, password) => {
    const response = await fetch(`${API_URL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const textResponse = await response.text();
    let data;
    
    try {
      data = textResponse ? JSON.parse(textResponse) : {};
    } catch (e) {
      throw new Error(`Error del servidor (${response.status}): El servidor no devolvió una respuesta válida.`);
    }

    if (!response.ok) {
      const errorMsg = data.detail || data.non_field_errors?.[0] || Object.values(data)[0]?.[0] || 'Credenciales inválidas.';
      throw new Error(errorMsg);
    }

    const accessToken = data.access;
    if (!accessToken) {
      throw new Error('No se recibió el token de acceso.');
    }

    // 1. Guardamos de inmediato en el almacenamiento local
    localStorage.setItem('token', accessToken);
    if (data.refresh) {
      localStorage.setItem('refresh_token', data.refresh);
    }

    const usuarioTemporal = { email: username, username: username };
    localStorage.setItem('user', JSON.stringify(usuarioTemporal));

    // 2. ACTUALIZAMOS LOS ESTADOS DE REACT DE FORMA SÍNCRONA
    setToken(accessToken);
    setUser(usuarioTemporal);

    return data;
  };

  // Función para registrar usuario directamente con fetch
  const register = async (userData) => {
    const response = await fetch(`${API_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_completo: userData.nombre_completo,
        email: userData.email,
        password: userData.password,
        password_confirmation: userData.password_confirmation
      })
    });

    const data = await response.json();
    if (!response.ok) {
      // Formatear errores de Django si vienen en objeto
      const errorMsg = typeof data === 'object' 
        ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(' | ') 
        : 'Error al crear la cuenta.';
      throw new Error(errorMsg);
    }

    // Si el backend devuelve token y usuario al registrar
    if (data.token) {
      setToken(data.token);
      setTokenStorage(data.token);
    }
    
    const usuarioRegistrado = data.user || data;
    if (usuarioRegistrado) {
      setUser(usuarioRegistrado);
      localStorage.setItem('user', JSON.stringify(usuarioRegistrado));
    }

    return data;
  };

  // Función para salir
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Obtener el nombre para mostrar
  const getUserDisplayName = () => {
    if (!user) return '';
    
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    if (user.nombre_completo) return user.nombre_completo;
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    
    if (user.username && !user.username.includes('@')) {
      return user.username;
    }
    
    return user.email || user.username || 'Usuario';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      isAuthenticated: !!token, 
      loading,
      userDisplayName: getUserDisplayName()
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};