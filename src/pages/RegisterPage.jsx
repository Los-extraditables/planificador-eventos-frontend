import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Clases compartidas: el espaciado se cambia aquí y afecta a todos los campos por igual
const ETIQUETA = 'block text-xs font-bold text-slate-700 uppercase tracking-wider';
const ICONO = 'absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400';
const CAMPO =
  'w-full pl-11 pr-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7E22CE] focus:border-transparent transition';
const CAMPO_CON_OJO = CAMPO.replace('pr-4', 'pr-12');
const BOTON_OJO = 'absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer';

// Variante en rojo cuando el campo tiene un error
const conEstadoError = (clase, hayError) =>
  hayError
    ? clase.replace('border-slate-200', 'border-red-400').replace('focus:ring-[#7E22CE]', 'focus:ring-red-500')
    : clase;

const SIN_ERROR = { campo: '', texto: '', titulo: '', enlaceLogin: false };
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ===================== Traducción de errores del backend ===================== */
// Junta en un solo texto todo lo que el backend pudo devolver
const recolectarTexto = (err) => {
  const partes = [];

  const agregar = (valor) => {
    if (valor === null || valor === undefined) return;

    if (typeof valor === 'string') {
      partes.push(valor);
    } else if (Array.isArray(valor)) {
      valor.forEach(agregar);
    } else if (typeof valor === 'object') {
      Object.entries(valor).forEach(([clave, v]) => {
        partes.push(clave);
        agregar(v);
      });
    }
  };

  agregar(err?.message);
  agregar(err?.data);
  agregar(err?.response?.data);
  agregar(err?.errors);

  return partes.join(' ').toLowerCase();
};

const tiene = (texto, palabras) => palabras.some((p) => texto.includes(p));

// Devuelve { campo, texto, titulo, enlaceLogin }
const traducirError = (err) => {
  const t = recolectarTexto(err);
  const habla = (campo) => tiene(t, campo);

  // Sin conexión o servidor caído
  // (los códigos 5xx se buscan como número completo para no confundirlos con otros textos)
  if (
    /\b50[0-4]\b/.test(t) ||
    tiene(t, [
      'failed to fetch',
      'network',
      'networkerror',
      'load failed',
      'timeout',
      'error del servidor',
      'server error'
    ])
  ) {
    return {
      campo: 'general',
      titulo: '',
      texto: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo en unos segundos.'
    };
  }

  // Correo
  if (habla(['email', 'correo', 'e-mail'])) {
    if (
      tiene(t, [
        'already',
        'already exists',
        'already registered',
        'exists',
        'ya existe',
        'ya está',
        'ya esta',
        'registered',
        'registrado',
        'registrada',
        'unique',
        'taken',
        'en uso',
        'duplicate',
        'duplicad',
        'correo electrónico ya',
        'email address is already',
        'user with this email',
        'este correo ya'
      ])
    ) {
      return {
        campo: 'email',
        titulo: 'Este correo ya está registrado.',
        texto: 'Inicia sesión con él o usa otro correo para crear tu cuenta.',
        enlaceLogin: true
      };
    }

    if (tiene(t, ['invalid', 'inválid', 'valid', 'válid', 'formato'])) {
      return {
        campo: 'email',
        titulo: 'El correo no es válido.',
        texto: 'Revisa que esté bien escrito, por ejemplo tu@correo.com.'
      };
    }

    if (tiene(t, ['blank', 'required', 'obligatorio', 'vacío', 'vacio', 'may not be'])) {
      return {
        campo: 'email',
        titulo: 'Falta el correo.',
        texto: 'Escribe tu correo electrónico.'
      };
    }

    // Cualquier otro problema con el correo
    return {
      campo: 'email',
      titulo: 'Hay un problema con este correo.',
      texto: 'Revisa que esté bien escrito o prueba con otro.'
    };
  }

  // Contraseña
  if (habla(['password', 'contraseña', 'contrasena'])) {
    if (tiene(t, ['too common', 'muy común', 'muy comun', 'common password'])) {
      return {
        campo: 'password',
        texto: 'Esa contraseña es muy común. Elige una más difícil de adivinar.'
      };
    }

    if (tiene(t, ['entirely numeric', 'solo números', 'solo numeros', 'only numbers', 'numeric'])) {
      return {
        campo: 'password',
        texto: 'La contraseña no puede tener solo números. Agrega letras.'
      };
    }

    if (tiene(t, ['too short', 'at least', 'muy corta', 'mínimo', 'minimo', 'min_length', 'short'])) {
      return {
        campo: 'password',
        texto: 'La contraseña es muy corta. Usa al menos 6 caracteres.'
      };
    }

    if (tiene(t, ['too similar', 'similar', 'se parece'])) {
      return {
        campo: 'password',
        texto: 'La contraseña se parece demasiado a tu nombre o correo. Elige otra.'
      };
    }

    if (tiene(t, ['match', 'coinciden', 'confirmation', 'confirmación', 'confirmacion'])) {
      return {
        campo: 'confirm',
        texto: 'Las contraseñas no coinciden.'
      };
    }

    return {
      campo: 'password',
      texto: 'Esa contraseña no es válida. Prueba con una más larga y combinada.'
    };
  }

  // Nombre
  if (habla(['nombre_completo', 'nombre', 'name'])) {
    return {
      campo: 'nombre',
      texto: 'Escribe tu nombre completo.'
    };
  }

  // Error sin información útil: el backend puede haber creado la cuenta y haber fallado
  // en un paso posterior (inicio de sesión automático, lectura de la respuesta, etc.).
  // Por eso NO se afirma que la cuenta no se creó: se invita a iniciar sesión.
  return {
    campo: 'general',
    titulo: 'Puede que tu cuenta ya esté creada.',
    texto: 'Algo falló justo después de registrarte. Intenta iniciar sesión con tu correo y contraseña.',
    enlaceLogin: true
  };
};

/* ============================ Mensaje bajo el campo ============================ */
const EnlaceLogin = () => (
  <Link to="/login" className="text-[#7E22CE] font-bold underline hover:text-[#6B21A8]">
    Inicia sesión
  </Link>
);

const MensajeCampo = ({ id, error }) =>
  error.texto ? (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-xs text-red-700 leading-relaxed">
      <AlertCircle
        className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <span>
        {error.titulo && <strong className="font-extrabold">{error.titulo} </strong>}
        <span className="font-medium">{error.texto}</span>
        {error.enlaceLogin && (
          <>
            {' '}
            <EnlaceLogin />
          </>
        )}
      </span>
    </p>
  ) : null;

export const RegisterPage = () => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(SIN_ERROR);
  const [mensajeExito, setMensajeExito] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Marca el campo con problema, muestra el mensaje y le da el foco
  const fallar = (campo, texto, extra = {}) => {
    setError({ ...SIN_ERROR, campo, texto, ...extra });

    if (campo !== 'general') {
      document.getElementById(`reg-${campo}`)?.focus();
    }
  };

  const limpiarError = () => {
    if (error.texto) {
      setError(SIN_ERROR);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // evita envíos dobles que crearían la cuenta dos veces

    setError(SIN_ERROR);
    setMensajeExito('');

    // Validación en el orden visual de los campos
    if (!nombreCompleto.trim()) {
      return fallar('nombre', 'Escribe tu nombre completo.');
    }

    if (!email.trim()) {
      return fallar('email', 'Escribe tu correo electrónico.');
    }

    if (!EMAIL_VALIDO.test(email.trim())) {
      return fallar('email', 'Escribe un correo válido, por ejemplo tu@correo.com.');
    }

    if (!password) {
      return fallar('password', 'Crea una contraseña.');
    }

    if (password.length < 6) {
      return fallar('password', 'La contraseña es muy corta. Usa al menos 6 caracteres.');
    }

    if (!confirmPassword) {
      return fallar('confirm', 'Repite tu contraseña para confirmarla.');
    }

    if (password !== confirmPassword) {
      return fallar('confirm', 'Las contraseñas no coinciden.');
    }

    setLoading(true);

    try {
      // Enviamos exactamente el payload que el RegisterSerializer espera recibir
      await register({
        nombre_completo: nombreCompleto.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword
      });

      setMensajeExito('¡Cuenta creada exitosamente! Redirigiendo...');

      setTimeout(() => {
        navigate('/hoy');
      }, 1500);
    } catch (err) {
      // Se deja el error real en consola para poder ver qué paso falló
      console.error('Error de registro:', err, err?.data ?? err?.response?.data);

      const { campo, texto, titulo, enlaceLogin } = traducirError(err);

      fallar(campo, texto, {
        titulo: titulo || '',
        enlaceLogin: Boolean(enlaceLogin)
      });
    } finally {
      setLoading(false);
    }
  };

  const errorEn = (campo) => (error.campo === campo ? error : SIN_ERROR);

  const ariaCampo = (campo) => ({
    'aria-invalid': error.campo === campo ? 'true' : undefined,
    'aria-describedby': error.campo === campo ? `reg-${campo}-error` : undefined
  });

  return (
    <div className="text-left w-full max-w-md mx-auto font-sans flex flex-col gap-6">
      <div className="flex flex-col gap-2 pb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Crear cuenta
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Únete a Evora y empieza a planificar tus eventos y subtareas.
        </p>
      </div>

      {/* Errores generales (conexión, servidor, desconocidos) */}
      {error.campo === 'general' && (
        <div
          role="alert"
          className="bg-red-50 text-red-700 text-xs font-semibold p-4 rounded-2xl border border-red-200 flex items-start gap-2.5 shadow-sm"
        >
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {error.titulo && <strong className="font-extrabold">{error.titulo} </strong>}
            {error.texto}
            {error.enlaceLogin && (
              <>
                {' '}
                <EnlaceLogin />
              </>
            )}
          </span>
        </div>
      )}

      {mensajeExito && (
        <div
          role="status"
          className="bg-emerald-50 text-emerald-700 text-xs font-semibold p-4 rounded-2xl border border-emerald-200 flex items-center gap-2.5 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
          <span>{mensajeExito}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* NOMBRE COMPLETO */}
        <div className="flex flex-col gap-2">
          <label htmlFor="reg-nombre" className={ETIQUETA}>
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className={ICONO}>
              <User className="w-4 h-4" aria-hidden="true" />
            </span>
            <input
              id="reg-nombre"
              type="text"
              autoComplete="name"
              placeholder="Ej. Juan Rojas"
              className={conEstadoError(CAMPO, error.campo === 'nombre')}
              value={nombreCompleto}
              {...ariaCampo('nombre')}
              onChange={(e) => {
                setNombreCompleto(e.target.value);
                limpiarError();
              }}
            />
          </div>
          <MensajeCampo id="reg-nombre-error" error={errorEn('nombre')} />
        </div>

        {/* CORREO ELECTRÓNICO */}
        <div className="flex flex-col gap-2">
          <label htmlFor="reg-email" className={ETIQUETA}>
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className={ICONO}>
              <Mail className="w-4 h-4" aria-hidden="true" />
            </span>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              className={conEstadoError(CAMPO, error.campo === 'email')}
              value={email}
              {...ariaCampo('email')}
              onChange={(e) => {
                setEmail(e.target.value);
                limpiarError();
              }}
            />
          </div>
          <MensajeCampo id="reg-email-error" error={errorEn('email')} />
        </div>

        {/* CONTRASEÑA */}
        <div className="flex flex-col gap-2">
          <label htmlFor="reg-password" className={ETIQUETA}>
            Contraseña <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className={ICONO}>
              <Lock className="w-4 h-4" aria-hidden="true" />
            </span>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className={conEstadoError(CAMPO_CON_OJO, error.campo === 'password')}
              value={password}
              {...ariaCampo('password')}
              onChange={(e) => {
                setPassword(e.target.value);
                limpiarError();
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={BOTON_OJO}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <MensajeCampo id="reg-password-error" error={errorEn('password')} />
        </div>

        {/* CONFIRMAR CONTRASEÑA */}
        <div className="flex flex-col gap-2">
          <label htmlFor="reg-confirm" className={ETIQUETA}>
            Confirmar contraseña <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className={ICONO}>
              <Lock className="w-4 h-4" aria-hidden="true" />
            </span>
            <input
              id="reg-confirm"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              className={conEstadoError(CAMPO_CON_OJO, error.campo === 'confirm')}
              value={confirmPassword}
              {...ariaCampo('confirm')}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                limpiarError();
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={BOTON_OJO}
              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <MensajeCampo id="reg-confirm-error" error={errorEn('confirm')} />
        </div>

        {/* BOTÓN SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 "
        >
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>

      <p className="text-xs text-center text-slate-500 pt-2 font-medium">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-[#7E22CE] font-bold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
};