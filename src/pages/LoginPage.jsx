import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password, rememberMe);
      navigate('/hoy');
    } catch (err) {
      console.error('Error de autenticación:', err);

      let mensajeError = err.message || 'Error al iniciar sesión. Revisa tus credenciales e intenta nuevamente.';
      if (
        mensajeError.toLowerCase().includes('no active account found') ||
        mensajeError.toLowerCase().includes('credentials')
      ) {
        mensajeError = 'Credenciales incorrectas o cuenta inactiva. Verifica tus datos e inténtalo de nuevo.';
      }

      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-left">
      <h2 className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight">
        Iniciar Sesión
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
        Bienvenido de nuevo a tu plataforma para organizar eventos.
      </p>

      {error && (
        <div
          role="alert"
          className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl mb-5 border border-red-100 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Cerrar aviso"
            className="text-red-400 hover:text-red-600 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-usuario" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Correo electrónico o usuario
          </label>
          <input
            id="login-usuario"
            type="text"
            required
            autoComplete="username"
            disabled={loading}
            placeholder="Ingresa tu correo o usuario"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition bg-white text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              disabled={loading}
              placeholder="Ingresa tu contraseña"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition pr-10 bg-white text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" strokeWidth={2} />
              ) : (
                <Eye className="w-5 h-5" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label htmlFor="login-recordarme" className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
            <input
              id="login-recordarme"
              type="checkbox"
              checked={rememberMe}
              disabled={loading}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-600 cursor-pointer w-4 h-4"
            />
            Recordarme
          </label>
          <Link to="/forgot-password" className="text-purple-600 font-semibold hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-purple-900/15 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Iniciando sesión...</span>
            </>
          ) : (
            'Iniciar Sesión'
          )}
        </button>
      </form>

      <p className="text-xs text-center text-slate-500 mt-6">
        ¿No tienes una cuenta?{' '}
        <Link to="/registro" className="text-purple-600 font-bold hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;