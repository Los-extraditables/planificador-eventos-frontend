import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  // Si no está autenticado, bloquea la vista y redirige a /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si sí está autenticado, le permite ver las páginas internas
  return <Outlet />;
};