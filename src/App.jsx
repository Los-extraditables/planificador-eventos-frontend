import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { MainLayout } from './layouts/MainLayout';

// Páginas Públicas (Autenticación)
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';

// Páginas Privadas
import Hoy from './pages/Hoy';
import CrearEvento from './pages/CrearEvento';
import DetalleEvento from './pages/DetalleEvento';
import Progreso from './pages/Progreso';

// Wrapper para conectar Hoy.jsx con la navegación de React Router
const HoyWrapper = () => {
  const navigate = useNavigate();

  const handleCrearEvento = () => {
    navigate('/crear');
  };

  const handleVerDetalle = (tipo, id) => {
    if (id) {
      navigate(`/detalle-evento/${id}`);
    } else {
      navigate('/detalle-evento');
    }
  };

  return (
    <Hoy 
      onCrearEvento={handleCrearEvento} 
      onVerDetalle={handleVerDetalle} 
    />
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 1. RUTAS PÚBLICAS */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* 2. RUTAS PRIVADAS PROTEGIDAS */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/hoy" element={<HoyWrapper />} />
              <Route path="/crear" element={<CrearEvento />} />
              {/* Se permite entrar con o sin ID en la URL */}
              <Route path="/detalle-evento/:id?" element={<DetalleEvento />} />
              <Route path="/progreso" element={<Progreso />} />
            </Route>
          </Route>

          {/* Redirecciones por defecto */}
          <Route path="/" element={<Navigate to="/hoy" replace />} />
          <Route path="*" element={<Navigate to="/hoy" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;