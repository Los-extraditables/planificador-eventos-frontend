import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
      setEmail('');
    } catch (err) {
      const msjError =
        err.message?.includes('500') || err.message?.includes('servidor')
          ? 'El backend no pudo enviar el correo (Falta configuración SMTP en el servidor).'
          : err.message || 'No se pudo procesar la solicitud en este momento.';

      setError(msjError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-left flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Recupera tu contraseña
      </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      </div>

      {message && (
        <div
          role="status"
          className="bg-emerald-50 text-emerald-700 text-xs p-3.5 rounded-xl border border-emerald-100 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl border border-red-100 flex items-center justify-between gap-2"
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="correo-recuperacion" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Correo electrónico
          </label>
          <input
            id="correo-recuperacion"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
            placeholder="Ingresa tu correo electrónico"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition bg-white text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
              <span>Enviando...</span>
            </>
          ) : (
            'Enviar enlace'
          )}
        </button>
      </form>

      <div className="text-xs text-center text-slate-500">
        <Link to="/login" className="text-purple-600 font-bold hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;