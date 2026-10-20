import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

// Definido fuera del componente para que los inputs no pierdan el foco al escribir
const PasswordField = ({ id, etiqueta, valor, setValor, visible, setVisible, disabled }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1.5">
      {etiqueta}
    </label>
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required
        autoComplete="new-password"
        disabled={disabled}
        placeholder="Mínimo 8 caracteres"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition pr-10 bg-white text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
      </button>
    </div>
  </div>
);

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawUid = searchParams.get('uid');
  const rawToken = searchParams.get('token');

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const rawApiUrl = import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
  const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

  if (!rawUid || !rawToken) {
    return (
      <div className="w-full text-left">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight">
          Enlace incompleto o inválido
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          El enlace no contiene los datos necesarios para restablecer tu contraseña. Solicita uno nuevo desde la pantalla de recuperación.
        </p>
        <Link
          to="/forgot-password"
          className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-purple-900/15 flex items-center justify-center"
        >
          Solicitar un enlace nuevo
        </Link>
        <p className="text-xs text-center text-slate-500 mt-6">
          <Link to="/login" className="text-purple-600 font-bold hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a iniciar sesión
          </Link>
        </p>
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

      const cleanUid = decodeURIComponent(rawUid).trim();
      const cleanToken = decodeURIComponent(rawToken).trim();

      // RUTA PERSONALIZADA DEL BACKEND: /password-reset-confirm/
      const response = await fetch(`${API_URL}/password-reset-confirm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          uid: cleanUid,
          token: cleanToken,
          new_password: nuevaPassword,
          re_new_password: confirmarPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        const errorMsg =
          errorData.detail ||
          errorData.token?.[0] ||
          errorData.uid?.[0] ||
          errorData.new_password?.[0] ||
          errorData.non_field_errors?.[0] ||
          'Error al restablecer la contraseña. El enlace puede haber caducado.';

        throw new Error(errorMsg);
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
    <div className="w-full text-left">
      <h2 className="text-2xl font-bold text-slate-900 mb-1.5 tracking-tight">
        Restablecer contraseña
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
        Ingresa tu nueva contraseña para actualizar la cuenta.
      </p>

      {mensaje.texto && (
        <div
          role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
          className={`text-xs p-3.5 rounded-xl mb-5 border flex items-center justify-between gap-2 ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-red-50 text-red-600 border-red-100'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensaje.tipo === 'exito' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            )}
            <span>{mensaje.texto}</span>
          </div>
          {mensaje.tipo === 'error' && (
            <button
              type="button"
              onClick={() => setMensaje({ tipo: '', texto: '' })}
              aria-label="Cerrar aviso"
              className="text-red-400 hover:text-red-600 font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="nueva-password"
          etiqueta="Nueva contraseña"
          valor={nuevaPassword}
          setValor={setNuevaPassword}
          visible={mostrarNueva}
          setVisible={setMostrarNueva}
          disabled={cargando}
        />
        <PasswordField
          id="confirmar-password"
          etiqueta="Confirmar contraseña"
          valor={confirmarPassword}
          setValor={setConfirmarPassword}
          visible={mostrarConfirmar}
          setVisible={setMostrarConfirmar}
          disabled={cargando}
        />

        <button
          type="submit"
          disabled={cargando}
          aria-busy={cargando}
          className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-purple-900/15 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {cargando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Procesando...</span>
            </>
          ) : (
            'Cambiar contraseña'
          )}
        </button>
      </form>

      <p className="text-xs text-center text-slate-500 mt-6">
        <Link to="/login" className="text-purple-600 font-bold hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
};

export default ResetPasswordPage;