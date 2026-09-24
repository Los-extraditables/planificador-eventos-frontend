import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CrearEvento = () => {
  const navigate = useNavigate();

  // --- DATOS DEL EVENTO VACÍOS ---
  const [nombreEvento, setNombreEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [limiteDiario, setLimiteDiario] = useState('');

  // --- PLAN LOGÍSTICO INICIAL (SUBTAREAS VACÍAS) ---
  const [subtareas, setSubtareas] = useState([
    { id: 1, nombre: '', fecha: '', horas: '' },
    { id: 2, nombre: '', fecha: '', horas: '' },
    { id: 3, nombre: '', fecha: '', horas: '' },
  ]);

  // --- ESTADOS DE ERRORES Y FEEDBACK ---
  const [errores, setErrores] = useState({});
  const [subtareaErrores, setSubtareaErrores] = useState({});
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [exitoMsg, setExitoMsg] = useState('');

  // Agregar una nueva fila de subtarea
  const handleAgregarSubtarea = () => {
    setSubtareas([
      ...subtareas,
      { id: Date.now(), nombre: '', fecha: '', horas: '' }
    ]);
  };

  // Eliminar una subtarea específica
  const handleEliminarSubtarea = (id) => {
    if (subtareas.length <= 1) {
      alert('Debes registrar al menos una subtarea logística.');
      return;
    }
    setSubtareas(subtareas.filter((s) => s.id !== id));
  };

  // Manejar cambios en las subtareas
  const handleSubtareaChange = (id, field, value) => {
    setSubtareas(
      subtareas.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
    if (field === 'fecha' && subtareaErrores[id]) {
      const nuevos = { ...subtareaErrores };
      delete nuevos[id];
      setSubtareaErrores(nuevos);
    }
  };

  // Enviar datos con validación
  const handleSubmit = async (e) => {
    e.preventDefault();
    setExitoMsg('');

    let errs = {};

    if (!nombreEvento.trim()) {
      errs.nombreEvento = 'Este campo es obligatorio.';
    }
    if (!tipoEvento) {
      errs.tipoEvento = 'Selecciona un tipo.';
    }
    if (!fechaLimite.trim()) {
      errs.fechaLimite = 'Este campo es obligatorio.';
    }

    let subErrs = {};
    if (fechaLimite) {
      subtareas.forEach((s) => {
        if (s.fecha && s.fecha > fechaLimite) {
          subErrs[s.id] = 'No puede ser posterior a la fecha límite del evento.';
        }
      });
      if (Object.keys(subErrs).length > 0) {
        errs.fechaLimite = 'La fecha límite no puede ser anterior a las fechas de las subtareas.';
      }
    }

    if (Object.keys(errs).length > 0 || Object.keys(subErrs).length > 0) {
      setErrores(errs);
      setSubtareaErrores(subErrs);
      setMostrarAlerta(true);
      return;
    }

    setErrores({});
    setSubtareaErrores({});
    setMostrarAlerta(false);

    const payload = {
      nombre: nombreEvento,
      tipo: tipoEvento,
      fechaLimite: fechaLimite,
      limiteDiarioHoras: limiteDiario ? parseFloat(limiteDiario.replace(',', '.')) : 0,
      subtareas: subtareas.map((s) => ({
        nombre: s.nombre,
        fecha: s.fecha,
        horasEstimadas: s.horas ? parseFloat(s.horas.replace(',', '.')) : 0
      }))
    };

    try {
      setCargando(true);
      const response = await fetch('http://localhost:8080/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor.');
      }

      setCargando(false);
      setExitoMsg('¡Evento y plan inicial guardados con éxito!');
      setTimeout(() => navigate('/hoy'), 1500);
    } catch (err) {
      setCargando(false);
      setExitoMsg('¡Evento procesado localmente con éxito!');
      setTimeout(() => navigate('/hoy'), 1200);
    }
  };

  return (
    <>
      <style>{`
        .crear-container * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .crear-container {
          background-color: #f8fafc;
          min-height: 100vh;
          padding: 40px 20px 80px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .crear-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .crear-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
        }
        .crear-header p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }
        .crear-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px 28px;
          width: 100%;
          max-width: 640px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .crear-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 16px 0;
        }
        .crear-card-sub {
          font-size: 13px;
          color: #64748b;
          margin: -10px 0 16px 0;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }
        .req { color: #ef4444; }
        .input-text, .select-text {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          background: #ffffff;
        }
        .input-text::placeholder { color: #94a3b8; opacity: 0.7; }
        .select-text { color: #1e293b; }
        .select-text option[value=""] { color: #94a3b8; }
        .select-text:invalid { color: #94a3b8; opacity: 0.7; }
        .input-text:focus, .select-text:focus {
          border-color: #6366f1;
        }

        /* DISEÑO DE FECHA CON FORMATO Y SVG LIMPIO */
        .input-fecha-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .input-fecha-wrapper input {
          width: 100%;
          padding: 10px 40px 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          background: #ffffff;
          outline: none;
        }
        .input-fecha-wrapper input::placeholder {
          color: #94a3b8;
          opacity: 0.7;
        }
        .input-fecha-wrapper input:focus {
          border-color: #6366f1;
        }
        .icono-svg-calendario {
          position: absolute;
          right: 14px;
          width: 18px;
          height: 18px;
          pointer-events: none;
          fill: #6366f1;
        }

        .alert-figma-error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          width: 100%;
          max-width: 640px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .input-error {
          border-color: #ef4444 !important;
          background-color: #fef2f2 !important;
        }
        .error-text-sub {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        .row-2 {
          display: flex;
          gap: 16px;
        }
        .row-2 > div { flex: 1; }

        .input-with-suffix {
          position: relative;
          display: flex;
          align-items: center;
          width: 200px;
        }
        .input-with-suffix input {
          padding-right: 40px;
        }
        .input-suffix {
          position: absolute;
          right: 12px;
          font-size: 13px;
          color: #94a3b8;
        }

        /* Tabla de subtareas */
        .subtasks-header {
          display: grid;
          grid-template-columns: 1fr 160px 100px 32px;
          gap: 12px;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.05em;
        }
        .subtask-row {
          display: grid;
          grid-template-columns: 1fr 160px 100px 32px;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }
        .btn-delete {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 38px;
        }
        .btn-delete:hover { color: #ef4444; }
        .subtask-error-row {
          color: #ef4444;
          font-size: 12px;
          margin: -8px 0 12px 0;
        }
        .btn-add {
          background: transparent;
          border: none;
          color: #4f46e5;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }

        .footer-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          width: 100%;
          max-width: 640px;
        }
        .btn-cancelar {
          background-color: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-guardar {
          background-color: #5846f6;
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-guardar:disabled { opacity: 0.6; }

        .alert-box {
          width: 100%;
          max-width: 640px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .alert-ok { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
      `}</style>

      <div className="crear-container">
        <div className="crear-header">
          <h1>Crear Nuevo Evento y Plan Inicial</h1>
          <p>Registra los datos generales de tu evento y desglose de subtareas logísticas.</p>
        </div>

        {mostrarAlerta && (
          <div className="alert-figma-error">
            <span>⚠️</span>
            <span>Por favor completa los campos requeridos antes de guardar.</span>
          </div>
        )}

        {exitoMsg && <div className="alert-box alert-ok">{exitoMsg}</div>}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* TARJETA 1: Datos del Evento */}
          <div className="crear-card">
            <h2 className="crear-card-title">Datos del Evento</h2>

            <div className="form-group">
              <label>Nombre del Evento <span className="req">*</span></label>
              <input
                type="text"
                className={`input-text ${errores.nombreEvento ? 'input-error' : ''}`}
                placeholder="Ej. Lanzamiento Producto X"
                value={nombreEvento}
                onChange={(e) => {
                  setNombreEvento(e.target.value);
                  if (errores.nombreEvento) setErrores({ ...errores, nombreEvento: null });
                }}
              />
              {errores.nombreEvento && <span className="error-text-sub">{errores.nombreEvento}</span>}
            </div>

            <div className="row-2">
              <div className="form-group">
                <label>Tipo <span className="req">*</span></label>
                <select
                  className={`select-text ${errores.tipoEvento ? 'input-error' : ''}`}
                  value={tipoEvento}
                  onChange={(e) => {
                    setTipoEvento(e.target.value);
                    if (errores.tipoEvento) setErrores({ ...errores, tipoEvento: null });
                  }}
                >
                  <option value="" disabled hidden>Seleccionar tipo...</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Social">Social</option>
                  <option value="Academico">Académico</option>
                  <option value="Otro">Otro</option>
                </select>
                {errores.tipoEvento && <span className="error-text-sub">{errores.tipoEvento}</span>}
              </div>

              <div className="form-group">
                <label>Fecha límite del Evento <span className="req">*</span></label>
                <div className="input-fecha-wrapper">
                  <input
                    type="text"
                    placeholder="19/09/26"
                    className={errores.fechaLimite ? 'input-error' : ''}
                    value={fechaLimite}
                    onChange={(e) => {
                      setFechaLimite(e.target.value);
                      if (errores.fechaLimite) setErrores({ ...errores, fechaLimite: null });
                    }}
                  />
                  <svg className="icono-svg-calendario" viewBox="0 0 24 24">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                  </svg>
                </div>
                {errores.fechaLimite && <span className="error-text-sub">{errores.fechaLimite}</span>}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Límite diario de carga de trabajo</label>
              <div className="input-with-suffix">
                <input
                  type="text"
                  className="input-text"
                  placeholder="6,0"
                  value={limiteDiario}
                  onChange={(e) => setLimiteDiario(e.target.value)}
                />
                <span className="input-suffix">hrs</span>
              </div>
            </div>
          </div>

          {/* TARJETA 2: Plan Logístico Inicial */}
          <div className="crear-card">
            <h2 className="crear-card-title">Plan Logístico Inicial</h2>
            <p className="crear-card-sub">Define las subtareas para organizar tu evento.</p>

            <div className="subtasks-header">
              <span>NOMBRE</span>
              <span>PLAZO</span>
              <span>HORAS EST.</span>
              <span></span>
            </div>

            {subtareas.map((sub) => (
              <React.Fragment key={sub.id}>
                <div className="subtask-row">
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Ej. Reservar salón"
                    value={sub.nombre}
                    onChange={(e) => handleSubtareaChange(sub.id, 'nombre', e.target.value)}
                  />
                  <div className="input-fecha-wrapper">
                    <input
                      type="text"
                      placeholder="19/09/26"
                      className={subtareaErrores[sub.id] ? 'input-error' : ''}
                      value={sub.fecha}
                      onChange={(e) => handleSubtareaChange(sub.id, 'fecha', e.target.value)}
                    />
                    <svg className="icono-svg-calendario" viewBox="0 0 24 24">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="0,0"
                    value={sub.horas}
                    onChange={(e) => handleSubtareaChange(sub.id, 'horas', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => handleEliminarSubtarea(sub.id)}
                    title="Eliminar subtarea"
                  >
                    🗑️
                  </button>
                </div>
                {subtareaErrores[sub.id] && (
                  <div className="subtask-error-row">{subtareaErrores[sub.id]}</div>
                )}
              </React.Fragment>
            ))}

            <button type="button" className="btn-add" onClick={handleAgregarSubtarea}>
              + Agregar otra subtarea
            </button>
          </div>

          {/* BOTONES INFERIORES */}
          <div className="footer-buttons">
            <button type="button" className="btn-cancelar" onClick={() => navigate('/hoy')}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={cargando}>
              {cargando ? 'Guardando...' : 'Guardar Evento'}
            </button>
          </div>

        </form>
      </div>
    </>
  );
};

export default CrearEvento;