import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CrearEvento = () => {
  const navigate = useNavigate();

  // Estados del evento y plan logístico
  const [nombreEvento, setNombreEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [limiteDiario, setLimiteDiario] = useState('');

  const [subtareas, setSubtareas] = useState([
    { id: 1, nombre: '', fecha: '', horas: '' },
    { id: 2, nombre: '', fecha: '', horas: '' },
    { id: 3, nombre: '', fecha: '', horas: '' },
  ]);

  // Estados de errores y feedback
  const [errores, setErrores] = useState({});
  const [subtareaErrores, setSubtareaErrores] = useState({});
  const [mensajeAlerta, setMensajeAlerta] = useState({ tipo: '', texto: '' });
  const [cargando, setCargando] = useState(false);

  // Limpiar error o alerta al interactuar
  const limpiarError = (campo) => {
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }));
    if (mensajeAlerta.texto) setMensajeAlerta({ tipo: '', texto: '' });
  };

  const handleAgregarSubtarea = () => {
    setSubtareas(prev => [...prev, { id: Date.now(), nombre: '', fecha: '', horas: '' }]);
  };

  const handleEliminarSubtarea = (id) => {
    if (subtareas.length <= 1) {
      alert('Debes registrar al menos una subtarea logística.');
      return;
    }
    setSubtareas(prev => prev.filter(s => s.id !== id));
    setSubtareaErrores(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleSubtareaChange = (id, field, value) => {
    setSubtareas(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (subtareaErrores[id]) {
      setSubtareaErrores(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
    if (mensajeAlerta.texto) setMensajeAlerta({ tipo: '', texto: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeAlerta({ tipo: '', texto: '' });

    let errs = {};

    if (!nombreEvento.trim()) errs.nombreEvento = 'Este campo es obligatorio.';
    if (!tipoEvento) errs.tipoEvento = 'Selecciona un tipo.';
    if (!fechaLimite) errs.fechaLimite = 'Este campo es obligatorio.';

    let valorLimiteNum = null;
    if (!limiteDiario.trim()) {
      errs.limiteDiario = 'Este campo es obligatorio.';
    } else {
      valorLimiteNum = parseFloat(limiteDiario.replace(',', '.'));
      if (isNaN(valorLimiteNum) || valorLimiteNum <= 0 || valorLimiteNum > 24) {
        errs.limiteDiario = 'Ingresa un valor válido entre 0 y 24 horas.';
      }
    }

    let subErrs = {};
    let subtareasValidas = [];

    subtareas.forEach(s => {
      const tieneNombre = s.nombre.trim() !== '';
      const tieneFecha = s.fecha !== '';
      const tieneHoras = s.horas !== '';

      if (tieneNombre || tieneFecha || tieneHoras) {
        if (!tieneNombre || !tieneFecha || !tieneHoras) {
          subErrs[s.id] = 'Completa nombre, fecha y horas.';
        } else if (fechaLimite && s.fecha > fechaLimite) {
          subErrs[s.id] = 'No puede ser posterior a la fecha límite del evento.';
        } else {
          subtareasValidas.push(s);
        }
      }
    });

    if (subtareasValidas.length === 0) {
      errs.subtareasGeneral = 'Completa por lo menos una subtarea logística.';
    }

    if (Object.keys(errs).length > 0 || Object.keys(subErrs).length > 0) {
      setErrores(errs);
      setSubtareaErrores(subErrs);
      setMensajeAlerta({ tipo: 'error', texto: 'Por favor corrige los errores antes de guardar.' });
      return;
    }

    setErrores({});
    setSubtareaErrores({});
    setMensajeAlerta({ tipo: 'exito', texto: '¡Guardado con éxito!' });

    // PAYLOAD ADAPTADO AL MODELO DE DJANGO
    const payload = {
      nombre: nombreEvento,
      tipo: tipoEvento,
      fecha: fechaLimite,                  // Coincide con models.DateField() de Evento
      limiteDiarioHoras: valorLimiteNum,
      gestiones: subtareasValidas.map(s => ({
        descripcion: s.nombre,             // Coincide con models.CharField() de GestionLogistica
        plazo: s.fecha,                    // Coincide con models.DateField() de plazo
        horas_estimadas: parseFloat(s.horas.replace(',', '.')) // Coincide con horas_estimadas
      }))
    };

    try {
      setCargando(true);
      const response = await fetch('http://localhost:8000/api/eventos/', { // Puerto típico de Django (8000)
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error();
      setTimeout(() => navigate('/hoy'), 1000);
    } catch {
      setTimeout(() => navigate('/hoy'), 1000);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <style>{`
        .crear-container * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .crear-container { background-color: #f8fafc; min-height: 100vh; padding: 40px 20px 80px; display: flex; flex-direction: column; align-items: center; }
        .crear-header { text-align: center; margin-bottom: 28px; }
        .crear-header h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
        .crear-header p { font-size: 14px; color: #64748b; margin: 0; }
        .crear-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px 28px; width: 100%; max-width: 640px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .crear-card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 16px; }
        .crear-card-sub { font-size: 13px; color: #64748b; margin: -10px 0 16px; }
        .form-group { display: flex; flex-direction: column; margin-bottom: 16px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        .req { color: #ef4444; }
        .input-text, .select-text, .input-date { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; color: #1e293b; outline: none; background: #fff; }
        .input-text:focus, .select-text:focus, .input-date:focus { border-color: #6366f1; }
        
        .alert-figma-error, .alert-figma-exito { padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; width: 100%; max-width: 640px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .alert-figma-error { background-color: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        .alert-figma-exito { background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
        
        .input-error { border-color: #ef4444 !important; background-color: #fef2f2 !important; }
        .error-text-sub { color: #ef4444; font-size: 12px; margin-top: 4px; display: block; }
        
        .row-2 { display: flex; gap: 16px; }
        .row-2 > div { flex: 1; }

        .input-with-suffix { position: relative; display: flex; align-items: center; width: 200px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
        .input-with-suffix input { width: 100%; padding: 10px 14px; padding-right: 40px; border: none; outline: none; background: transparent; font-size: 14px; color: #1e293b; }
        .input-suffix { position: absolute; right: 12px; font-size: 13px; color: #94a3b8; pointer-events: none; }

        .subtasks-header { display: grid; grid-template-columns: 1fr 160px 100px 32px; gap: 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
        .subtask-row { display: grid; grid-template-columns: 1fr 160px 100px 32px; gap: 12px; align-items: center; margin-bottom: 12px; }
        .btn-delete { background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; height: 38px; }
        .btn-delete:hover { color: #ef4444; }
        .subtask-error-row { color: #ef4444; font-size: 12px; margin: -8px 0 12px; }
        .btn-add { background: transparent; border: none; color: #4f46e5; font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 0; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; }

        .footer-buttons { display: flex; justify-content: flex-end; gap: 12px; width: 100%; max-width: 640px; }
        .btn-cancelar { background-color: #fff; color: #334155; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .btn-guardar { background-color: #5846f6; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .btn-guardar:disabled { opacity: 0.6; }
      `}</style>

      <div className="crear-container">
        <div className="crear-header">
          <h1>Crear Nuevo Evento y Plan Inicial</h1>
          <p>Registra los datos generales de tu evento y desglose de subtareas logísticas.</p>
        </div>

        {mensajeAlerta.texto && (
          <div className={mensajeAlerta.tipo === 'error' ? 'alert-figma-error' : 'alert-figma-exito'}>
            <span>{mensajeAlerta.tipo === 'error' ? '⚠️' : '✅'}</span>
            <span>{mensajeAlerta.texto}</span>
          </div>
        )}

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
                onChange={(e) => { setNombreEvento(e.target.value); limpiarError('nombreEvento'); }}
              />
              {errores.nombreEvento && <span className="error-text-sub">{errores.nombreEvento}</span>}
            </div>

            <div className="row-2">
              <div className="form-group">
                <label>Tipo <span className="req">*</span></label>
                <select
                  className={`select-text ${errores.tipoEvento ? 'input-error' : ''}`}
                  value={tipoEvento}
                  onChange={(e) => { setTipoEvento(e.target.value); limpiarError('tipoEvento'); }}
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
                <input
                  type="date"
                  className={`input-date ${errores.fechaLimite ? 'input-error' : ''}`}
                  value={fechaLimite}
                  onChange={(e) => { setFechaLimite(e.target.value); limpiarError('fechaLimite'); }}
                />
                {errores.fechaLimite && <span className="error-text-sub">{errores.fechaLimite}</span>}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Límite diario de carga de trabajo <span className="req">*</span></label>
              <div className={`input-with-suffix ${errores.limiteDiario ? 'input-error' : ''}`}>
                <input
                  type="text"
                  placeholder="6,0"
                  value={limiteDiario}
                  onChange={(e) => { setLimiteDiario(e.target.value); limpiarError('limiteDiario'); }}
                />
                <span className="input-suffix">hrs</span>
              </div>
              {errores.limiteDiario && <span className="error-text-sub">{errores.limiteDiario}</span>}
            </div>
          </div>

          {/* TARJETA 2: Plan Logístico Inicial */}
          <div className="crear-card">
            <h2 className="crear-card-title">Plan Logístico Inicial</h2>
            <p className="crear-card-sub">Define al menos una subtarea con su nombre, fecha y horas estimadas.</p>

            {errores.subtareasGeneral && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>
                ⚠️ {errores.subtareasGeneral}
              </div>
            )}

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
                    className={`input-text ${subtareaErrores[sub.id] ? 'input-error' : ''}`}
                    placeholder="Ej. Reservar salón"
                    value={sub.nombre}
                    onChange={(e) => handleSubtareaChange(sub.id, 'nombre', e.target.value)}
                  />
                  <input
                    type="date"
                    className={`input-date ${subtareaErrores[sub.id] ? 'input-error' : ''}`}
                    value={sub.fecha}
                    onChange={(e) => handleSubtareaChange(sub.id, 'fecha', e.target.value)}
                  />
                  <input
                    type="text"
                    className={`input-text ${subtareaErrores[sub.id] ? 'input-error' : ''}`}
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