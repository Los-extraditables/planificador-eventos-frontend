import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return null; 
  }

  // Verificamos el estado de React O consultamos directamente el localStorage
  const isLogged = !!token || !!localStorage.getItem('token');

  if (!isLogged) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};