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
    const currentUser = authService.getCurrentUser();
    
    if (currentUser) {
      setUser(currentUser);
      setToken(authService.getToken());
    }
    return data;
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
    
    // Si la parte inicial del usuario no es un email directo
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