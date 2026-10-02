import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la página, comprueba si el usuario ya tenía sesión iniciada
  useEffect(() => {
    const savedToken = authService.getToken();
    const savedUser = authService.getCurrentUser();

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  // Función para iniciar sesión
  const login = async (username, password) => {
    const data = await authService.login(username, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  // Función para registrar usuario
  const register = async (userData) => {
    const data = await authService.register(userData);
    // Intenta iniciar sesión automáticamente después del registro
    try {
      return await login(userData.email, userData.password);
    } catch {
      return data;
    }
  };

  // Función para salir
  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  // Obtener el nombre para mostrar (prioriza Nombre + Apellido)
  const getUserDisplayName = () => {
    if (!user) return '';
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) return fullName;
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    return user.username || user.email || 'Usuario';
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