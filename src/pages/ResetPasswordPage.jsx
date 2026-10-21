
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

// Campo reutilizable para las contraseñas
const PasswordField = ({
  id,
  etiqueta,
  valor,
  setValor,
  visible,
  setVisible,
  disabled,
}) => (
  <div className="w-full min-w-0">
    <label
      htmlFor={id}
      className="block text-sm font-semibold text-slate-700 mb-2"
    >
      {etiqueta}
    </label>

    <div className="relative w-full">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required
        minLength={8}
        autoComplete="new-password"
        disabled={disabled}
        placeholder="Mínimo 8 caracteres"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="w-full min-w-0 px-4 py-3 pr-12
          border border-slate-300 rounded-2xl
          text-base text-slate-900 bg-white
          placeholder:text-slate-400
          focus:outline-none focus:ring-2
          focus:ring-purple-600 focus:border-transparent
          transition disabled:bg-slate-100
          disabled:cursor-not-allowed"
      />

      <button
        type="button"
        onClick={() => setVisible(!visible)}
        disabled={disabled}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-2 top-1/2
          -translate-y-1/2 p-2 rounded-lg
          text-slate-400 hover:text-slate-600
          focus:outline-none focus:ring-2
          focus:ring-purple-500 disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="w-5 h-5" strokeWidth={2} />
        ) : (
          <Eye className="w-5 h-5" strokeWidth={2} />
        )}
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
  const [mensaje, setMensaje] = useState({
    tipo: '',
    texto: '',
  });

  const rawApiUrl =
    import.meta.env.VITE_API_URL ||
    'https://planificador-eventos-backend.onrender.com/api';

  const API_URL = rawApiUrl.endsWith('/')
    ? rawApiUrl.slice(0, -1)
    : rawApiUrl;

  const enlaceInvalido = !rawUid || !rawToken;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMensaje({ tipo: '', texto: '' });

    if (nuevaPassword.length < 8) {
      setMensaje({
        tipo: 'error',
        texto: 'La contraseña debe tener al menos 8 caracteres.',
      });
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setMensaje({
        tipo: 'error',
        texto: 'Las contraseñas no coinciden.',
      });
      return;
    }

    try {
      setCargando(true);

      const cleanUid = decodeURIComponent(rawUid).trim();
      const cleanToken = decodeURIComponent(rawToken).trim();

      const response = await fetch(
        `${API_URL}/password-reset-confirm/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            uid: cleanUid,
            token: cleanToken,
            new_password: nuevaPassword,
            re_new_password: confirmarPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        const errorMsg =
          errorData.detail ||
          errorData.token?.[0] ||
          errorData.uid?.[0] ||
          errorData.new_password?.[0] ||
          errorData.re_new_password?.[0] ||
          errorData.non_field_errors?.[0] ||
          'No se pudo restablecer la contraseña. El enlace puede haber caducado.';

        throw new Error(errorMsg);
      }

      setMensaje({
        tipo: 'exito',
        texto:
          '¡Contraseña restablecida con éxito! Redirigiendo al login...',
      });

      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <main
      className="min-h-screen w-full min-w-0
        bg-slate-50 flex flex-col items-center justify-center
        px-4 py-6 sm:px-6 sm:py-8"
    >
      {/* Tarjeta principal */}
      <section
        className="w-full max-w-lg min-w-0
          bg-white rounded-[28px]
          border border-slate-200/80
          shadow-[0_18px_45px_-20px_rgba(15,23,42,0.22)]
          px-5 py-7
          sm:px-8 sm:py-8"
      >
        {/* Logo y nombre */}
        <div className="flex items-center gap-3 mb-7">
          <div
            className="w-12 h-12 shrink-0 rounded-2xl
              bg-gradient-to-br from-[#253C75] via-[#176A87]
              to-[#10BFA5] flex items-center justify-center
              shadow-sm"
            aria-label="Logo de Evora"
          >
            <svg
              viewBox="0 0 40 40"
              className="w-8 h-8"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M11 10H29M11 20H29M11 30H29"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M11 10L19 10L25 6M11 20H23L29 16M11 30H19L25 34"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="11" cy="10" r="3" fill="white" />
              <circle cx="11" cy="20" r="3" fill="white" />
              <circle cx="11" cy="30" r="3" fill="white" />
            </svg>
          </div>

          <span className="text-2xl font-extrabold
            tracking-tight text-slate-900">
            Evora
          </span>
        </div>

        {/* Título y descripción */}
        <div className="flex flex-col gap-3 mb-6">
          <h1
            className="text-2xl sm:text-[28px]
              font-bold tracking-tight text-slate-950
              leading-tight text-left"
          >
            {enlaceInvalido
              ? 'Enlace inválido'
              : 'Restablecer contraseña'}
          </h1>

          <p className="text-base text-slate-500 leading-7 text-left">
            {enlaceInvalido
              ? 'El enlace no contiene los datos necesarios. Solicita uno nuevo para restablecer tu contraseña.'
              : 'Ingresa tu nueva contraseña para actualizar la cuenta.'}
          </p>
        </div>

        {/* Mensaje de error o éxito */}
        {mensaje.texto && (
          <div
            role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
            aria-live={
              mensaje.tipo === 'exito' ? 'polite' : 'assertive'
            }
            className={`mb-5 w-full min-w-0 p-3.5 rounded-xl
              border flex items-start gap-2 text-sm
              ${
                mensaje.tipo === 'exito'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
          >
            {mensaje.tipo === 'exito' ? (
              <CheckCircle2
                className="w-5 h-5 shrink-0 mt-0.5"
              />
            ) : (
              <AlertCircle
                className="w-5 h-5 shrink-0 mt-0.5"
              />
            )}

            <span className="flex-1 min-w-0 break-words">
              {mensaje.texto}
            </span>

            {mensaje.tipo === 'error' && (
              <button
                type="button"
                onClick={() =>
                  setMensaje({ tipo: '', texto: '' })
                }
                aria-label="Cerrar aviso"
                className="font-bold shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Formulario o enlace inválido */}
        {enlaceInvalido ? (
          <Link
            to="/forgot-password"
            className="w-full min-h-12 px-4 py-3
              bg-[#7C3AED] hover:bg-[#6D28D9]
              text-white font-semibold rounded-xl
              flex items-center justify-center
              text-center text-sm transition"
          >
            Solicitar un enlace nuevo
          </Link>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="w-full min-w-0 flex flex-col gap-5"
          >
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
              className="w-full min-h-12 px-4 py-3 mt-1
                bg-[#7C3AED] hover:bg-[#6D28D9]
                text-white font-semibold text-sm sm:text-base
                rounded-xl transition
                shadow-[0_8px_18px_-10px_rgba(124,58,237,0.65)]
                flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2
                focus:ring-purple-600 focus:ring-offset-2"
            >
              {cargando ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-white
                      border-t-transparent rounded-full animate-spin"
                  />
                  Procesando...
                </>
              ) : (
                'Cambiar contraseña'
              )}
            </button>
          </form>
        )}

        {/* Volver al inicio de sesión */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center
              gap-1.5 text-sm sm:text-base
              font-bold text-purple-600 hover:text-purple-800
              hover:underline"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Volver a iniciar sesión
          </Link>
        </div>
      </section>

      {/* Pie de página */}
      <footer className="mt-5 text-center text-sm text-slate-600">
        Evora · 2026
      </footer>
    </main>
  );
};

export default ResetPasswordPage;
