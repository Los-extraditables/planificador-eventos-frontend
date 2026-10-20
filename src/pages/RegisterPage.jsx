import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Clases compartidas: el espaciado se cambia aquí y afecta a todos los campos por igual
const ETIQUETA = 'block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider';
const ICONO = 'absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400';
const CAMPO =
  'w-full pl-11 pr-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7E22CE] focus:border-transparent transition';
const CAMPO_CON_OJO = CAMPO.replace('pr-4', 'pr-12');
const BOTON_OJO = 'absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer';

export const RegisterPage = () => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // Enviamos exactamente el payload que el RegisterSerializer espera recibir
      await register({
        nombre_completo: nombreCompleto.trim(),
        email,
        password,
        password_confirmation: confirmPassword
      });

      setMensajeExito('¡Cuenta creada exitosamente! Redirigiendo...');
      setTimeout(() => {
        navigate('/hoy');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-left w-full max-w-md mx-auto font-sans">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Crear cuenta
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Únete a Evora y empieza a planificar tus eventos y subtareas.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs font-semibold p-4 rounded-2xl mb-6 border border-red-200 flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mensajeExito && (
        <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold p-4 rounded-2xl mb-6 border border-emerald-200 flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* NOMBRE COMPLETO */}
        <div>
          <label className={ETIQUETA}>
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className={ICONO}>
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              required
              placeholder="Ej. Juan Rojas"
              className={CAMPO}
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
            />
          </div>
        </div>

        {/* CORREO ELECTRÓNICO */}
        <div>
          <label className={ETIQUETA}>
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className={ICONO}>
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              className={CAMPO}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* CONTRASEÑA */}
        <div>
          <label className={ETIQUETA}>
            Contraseña <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className={ICONO}>
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Mínimo 6 caracteres"
              className={CAMPO_CON_OJO}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={BOTON_OJO}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* CONFIRMAR CONTRASEÑA */}
        <div>
          <label className={ETIQUETA}>
            Confirmar contraseña <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className={ICONO}>
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              placeholder="Repite tu contraseña"
              className={CAMPO_CON_OJO}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={BOTON_OJO}
              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* BOTÓN SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 mt-3"
        >
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>

      <p className="text-xs text-center text-slate-500 mt-8 font-medium">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-[#7E22CE] font-bold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
};