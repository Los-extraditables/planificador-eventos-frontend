import { useMemo } from 'react';

export function useFiltradoGestiones(todasLasGestiones, filtroEstado) {
  // 1. Filtrado principal según la opción seleccionada ('todos', 'en_preparacion', 'completados')
  const gestionesFiltradas = useMemo(() => {
    return todasLasGestiones.filter((g) => {
      if (filtroEstado === 'en_preparacion') {
        return !g.completada;
      } else if (filtroEstado === 'completados') {
        return Boolean(g.completada);
      }
      return true; // 'todos'
    });
  }, [todasLasGestiones, filtroEstado]);

  // Obtener fecha actual local en formato YYYY-MM-DD
  const hoyStr = useMemo(() => {
    const hoyLocal = new Date();
    const year = hoyLocal.getFullYear();
    const month = String(hoyLocal.getMonth() + 1).padStart(2, '0');
    const day = String(hoyLocal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Clasificación por estado completado 
  const gestionesCompletadas = useMemo(() => {
    return gestionesFiltradas.filter((g) => Boolean(g.completada));
  }, [gestionesFiltradas]);

  //  Clasificación de pendientes por fechas 
  const gestionesAtrasadas = useMemo(() => {
    return gestionesFiltradas.filter((g) => {
      if (g.completada) return false;
      const fechaValor = g.plazo || g.fecha;
      if (!fechaValor) return false;
      const fechaLimpia = fechaValor.toString().split('T')[0].split(' ')[0];
      return fechaLimpia < hoyStr;
    });
  }, [gestionesFiltradas, hoyStr]);

  const gestionesHoy = useMemo(() => {
    return gestionesFiltradas.filter((g) => {
      if (g.completada) return false;
      const fechaValor = g.plazo || g.fecha;
      if (!fechaValor) return true;
      const fechaLimpia = fechaValor.toString().split('T')[0].split(' ')[0];
      return fechaLimpia === hoyStr;
    });
  }, [gestionesFiltradas, hoyStr]);

  const gestionesProximas = useMemo(() => {
    return gestionesFiltradas.filter((g) => {
      if (g.completada) return false;
      const fechaValor = g.plazo || g.fecha;
      if (!fechaValor) return false;
      const fechaLimpia = fechaValor.toString().split('T')[0].split(' ')[0];
      return fechaLimpia > hoyStr;
    });
  }, [gestionesFiltradas, hoyStr]);

  return {
    gestionesFiltradas,
    gestionesAtrasadas,
    gestionesHoy,
    gestionesProximas,
    gestionesCompletadas,
  };
}