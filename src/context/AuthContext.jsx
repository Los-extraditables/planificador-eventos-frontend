import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

// tour_visto NUNCA se guarda en localStorage: la fuente de verdad es el backend.
// Así un valor viejo en caché no puede ocultar ni relanzar el tour por error.
const guardarUsuarioLocal = (usuario) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const { tour_visto, tour_visto_en, ...resto } = usuario || {};
    localStorage.setItem('user', JSON.stringify(resto));
  } catch (error) {
    console.error('No se pudo guardar el usuario en localStorage:', error);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const rawApiUrl =
    import.meta.env.VITE_API_URL || 'https://planificador-eventos-backend.onrender.com/api';
  const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

  // Salir: limpia sesión local y estado
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // Pide el perfil real al backend (incluye tour_visto) y lo mezcla en `user`.
  // Devuelve el perfil, o null si falló (sin romper la sesión salvo que el token sea inválido).
  const cargarPerfil = useCallback(
    async (tokenActual) => {
      if (!tokenActual) return null;

      try {
        const response = await fetch(`${API_URL}/users/profile/`, {
          headers: { Authorization: `Bearer ${tokenActual}` }
        });

        if (response.status === 401) {
          logout(); // token vencido o inválido
          return null;
        }
        if (!response.ok) return null;

        const perfil = await response.json();
        setUser((prev) => {
          const combinado = { ...(prev || {}), ...perfil };
          guardarUsuarioLocal(combinado);
          return combinado;
        });
        return perfil;
      } catch (error) {
        console.error('No se pudo cargar el perfil:', error);
        return null;
      }
    },
    [API_URL, logout]
  );

  // Al cargar la página: restaura la sesión y SIEMPRE refresca el perfil desde el backend
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken) {
      setToken(savedToken);
      try {
        setUser(savedUser ? JSON.parse(savedUser) : null);
      } catch {
        setUser(null);
      }
      cargarPerfil(savedToken);
    }
    setLoading(false);
  }, [cargarPerfil]);

  // Iniciar sesión
  const login = async (username, password) => {
    const response = await fetch(`${API_URL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const textResponse = await response.text();
    let data;

    try {
      data = textResponse ? JSON.parse(textResponse) : {};
    } catch {
      throw new Error(
        `Error del servidor (${response.status}): El servidor no devolvió una respuesta válida.`
      );
    }

    if (!response.ok) {
      const errorMsg =
        data.detail ||
        data.non_field_errors?.[0] ||
        Object.values(data)[0]?.[0] ||
        'Credenciales inválidas.';
      throw new Error(errorMsg);
    }

    const accessToken = data.access;
    if (!accessToken) {
      throw new Error('No se recibió el token de acceso.');
    }

    localStorage.setItem('token', accessToken);
    if (data.refresh) {
      localStorage.setItem('refresh_token', data.refresh);
    }

    // Usuario provisional mientras llega el perfil real
    const usuarioTemporal = { email: username, username };
    guardarUsuarioLocal(usuarioTemporal);

    setToken(accessToken);
    setUser(usuarioTemporal);

    // Perfil real (con tour_visto). Se espera para que la app ya lo tenga al navegar.
    await cargarPerfil(accessToken);

    return data;
  };

  // Registrar usuario
  const register = async (userData) => {
    const response = await fetch(`${API_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_completo: userData.nombre_completo,
        email: userData.email,
        password: userData.password,
        password_confirmation: userData.password_confirmation
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg =
        typeof data === 'object'
          ? Object.entries(data)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')
          : 'Error al crear la cuenta.';
      throw new Error(errorMsg);
    }

    // Si el backend devuelve token al registrar, se inicia sesión y se carga el perfil real.
    // Si no lo devuelve, el login posterior se encarga de cargar el perfil.
    const nuevoToken = data.access || data.token;
    if (nuevoToken) {
      localStorage.setItem('token', nuevoToken);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      setToken(nuevoToken);

      const usuarioRegistrado = data.user || {};
      setUser(usuarioRegistrado);
      guardarUsuarioLocal(usuarioRegistrado);

      await cargarPerfil(nuevoToken);
    }

    return data;
  };

  // Marca el tour como visto en el backend (solo para el tour automático)
  const marcarTourVisto = useCallback(async () => {
    // Optimista: evita que el tour se relance mientras llega el PATCH
    setUser((prev) => (prev ? { ...prev, tour_visto: true } : prev));

    const tokenActual = localStorage.getItem('token');
    if (!tokenActual) return;

    try {
      const response = await fetch(`${API_URL}/usuarios/me/tour/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenActual}`
        },
        body: JSON.stringify({ tour_visto: true })
      });

      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setUser((prev) =>
        prev
          ? { ...prev, tour_visto: data.tour_visto ?? true, tour_visto_en: data.tour_visto_en }
          : prev
      );
    } catch (error) {
      // Se queda en true localmente; en la próxima carga el backend decide.
      console.error('No se pudo guardar el estado del tour:', error);
    }
  }, [API_URL, logout]);

  // Nombre para mostrar
  const getUserDisplayName = () => {
    if (!user) return '';

    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    if (user.nombre_completo) return user.nombre_completo;
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;

    if (user.username && !user.username.includes('@')) {
      return user.username;
    }

    return user.email || user.username || 'Usuario';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        login,
        register,
        logout,
        cargarPerfil,
        marcarTourVisto,
        isAuthenticated: !!token,
        loading,
        userDisplayName: getUserDisplayName()
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};