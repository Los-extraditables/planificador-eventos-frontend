import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CargaDiariaProvider } from './context/CargaDiariaContext'; // 1. Importamos el proveedor

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { MainLayout } from './layouts/MainLayout';

// Páginas Públicas (Autenticación)
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Páginas Privadas
import CrearEvento from './pages/CrearEvento';
import DetalleEvento from './pages/DetalleEvento';
import Hoy from './pages/Hoy';
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
      {/* 2. Envolvemos toda la aplicación con CargaDiariaProvider */}
      <CargaDiariaProvider>
        <Router>
          <Routes>
            {/* 1. RUTA 100% LIBRE E INDEPENDIENTE DE CUALQUIER LAYOUT O GUARD */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* 2. RUTAS PÚBLICAS DE AUTENTICACIÓN (Con AuthLayout) */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* 3. RUTAS PRIVADAS PROTEGIDAS */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/hoy" element={<HoyWrapper />} />
                <Route path="/crear" element={<CrearEvento />} />
                <Route path="/detalle-evento/:id?" element={<DetalleEvento />} />
                <Route path="/progreso" element={<Progreso />} />
              </Route>
            </Route>

            {/* Redirecciones por defecto */}
            <Route path="/" element={<Navigate to="/hoy" replace />} />
            <Route path="*" element={<Navigate to="/hoy" replace />} />
          </Routes>
        </Router>
      </CargaDiariaProvider>
    </AuthProvider>
  );
}

export default App;