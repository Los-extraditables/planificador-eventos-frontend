import React, { useState } from 'react';
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
      setError(
        err.message || 'Error al iniciar sesión. Revisa tus credenciales e intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 text-left">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
        Iniciar Sesión
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 mb-6">
        Bienvenido de nuevo a la plataforma de gestión de eventos.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl mb-5 border border-red-100 flex items-center justify-between gap-2">
          <span>⚠️ {error}</span>
          <button 
            type="button" 
            onClick={() => setError('')} 
            className="text-red-400 hover:text-red-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Nombre de usuario
          </label>
          <input
            type="text"
            required
            placeholder="Ingresa tu usuario"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition bg-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Ingresa tu contraseña"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition pr-10 bg-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1 cursor-pointer"
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 text-purple-700 focus:ring-purple-600 cursor-pointer"
            />
            Recordarme
          </label>
          <Link to="/forgot-password" className="text-purple-900 font-semibold hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3B0764] hover:bg-[#2E1065] text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-purple-950/20 mt-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      <p className="text-xs text-center text-gray-500 mt-8">
        ¿No tienes una cuenta?{' '}
        <Link to="/registro" className="text-purple-900 font-bold hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;