import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Capturamos los parámetros uid y token que vienen en la URL
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const rawApiUrl = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
  const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Enlace incompleto o inválido</h2>
          <p className="text-xs text-slate-500 mb-6">
            El enlace no contiene los parámetros necesarios (<code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">uid</code> y <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">token</code>).
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 bg-[#3B0764] hover:bg-[#2E1065] text-white font-bold text-xs rounded-xl transition shadow-md"
          >
            Volver al Inicio de Sesión
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (nuevaPassword !== confirmarPassword) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      return;
    }

    if (nuevaPassword.length < 8) {
      setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    try {
      setCargando(true);
      setMensaje({ tipo: '', texto: '' });

      const response = await fetch(`${API_URL}/auth/users/reset_password_confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          token,
          new_password: nuevaPassword,
          re_new_password: confirmarPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.non_field_errors?.[0] || 'Error al restablecer la contraseña. El enlace puede haber expirado.');
      }

      setMensaje({ tipo: 'exito', texto: '¡Contraseña restablecida con éxito! Redirigiendo al login...' });

      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1 text-center">
          Restablecer Contraseña
        </h2>
        <p className="text-xs text-slate-500 mb-6 text-center">
          Ingresa tu nueva contraseña para actualizar la cuenta.
        </p>

        {mensaje.texto && (
          <div className={`p-3.5 rounded-xl mb-4 text-xs font-semibold ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Nueva Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 bg-[#3B0764] hover:bg-[#2E1065] text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {cargando ? 'Procesando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;