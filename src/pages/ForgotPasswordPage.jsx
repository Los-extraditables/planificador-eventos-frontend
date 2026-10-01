import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setMessage('Se han enviado las instrucciones de recuperación a tu correo electrónico.');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-left">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
        Recupera tu contraseña
      </h1>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 text-xs p-3.5 rounded-xl mb-5 border border-emerald-100">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl mb-5 border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            required
            placeholder="Ingresa tu correo electrónico"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3B0764] hover:bg-[#2E1065] text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-purple-950/20 mt-2"
        >
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>

      <p className="text-xs text-center text-gray-600 mt-8">
        <Link to="/login" className="text-purple-900 font-bold hover:underline inline-flex items-center gap-1">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
};