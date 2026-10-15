import { createContext, useContext, useEffect, useState } from 'react';

const CargaDiariaContext = createContext();

export const CargaDiariaProvider = ({ children }) => {
  // Cargar límite inicial de localStorage o usar 6.0h por defecto
  const [limiteDiarioMax, setLimiteDiarioMax] = useState(() => {
    const guardado = localStorage.getItem('limiteDiarioMax');
    return guardado ? parseFloat(guardado) : 6.0;
  });

  useEffect(() => {
    localStorage.setItem('limiteDiarioMax', limiteDiarioMax.toString());
  }, [limiteDiarioMax]);

  const incrementarLimite = () => {
    setLimiteDiarioMax((prev) => parseFloat((prev + 0.5).toFixed(1)));
  };

  const decrementarLimite = () => {
    setLimiteDiarioMax((prev) => (prev > 0.5 ? parseFloat((prev - 0.5).toFixed(1)) : 0.5));
  };

  return (
    <CargaDiariaContext.Provider
      value={{
        limiteDiarioMax,
        setLimiteDiarioMax,
        incrementarLimite,
        decrementarLimite,
      }}
    >
      {children}
    </CargaDiariaContext.Provider>
  );
};

export const useCargaDiaria = () => useContext(CargaDiariaContext);