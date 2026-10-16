import React from 'react';

const GestionCard = ({ item, onToggleComplete, onDelete, onEdit }) => {
  // Normalizar propiedades del backend o frontend
  const titulo = item.titulo || item.nombre || 'Gestión sin título';
  const categoria = item.categoria || item.tipo || 'General';
  const horas = item.horasEstimadas || item.horas_estimadas || item.horas || 0;
  const esCompletada = Boolean(item.completada || item.completado);
  const esUrgente = Boolean(item.urgente || item.es_urgente);

  const handleCheckboxChange = () => {
    if (onToggleComplete) {
      onToggleComplete(item.id, !esCompletada);
    }
  };

  const handleEliminar = () => {
    if (window.confirm(`¿Deseas eliminar la gestión "${titulo}"?`)) {
      if (onDelete) onDelete(item.id);
    }
  };

  return (
    <li
      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
        esCompletada
          ? 'bg-slate-50 border-slate-200 opacity-75'
          : esUrgente
          ? 'bg-white border-l-4 border-l-rose-500 border-slate-200 hover:shadow-md'
          : 'bg-white border-l-4 border-l-indigo-500 border-slate-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3">
        {/* Checkbox de completado */}
        <input
          type="checkbox"
          checked={esCompletada}
          onChange={handleCheckboxChange}
          className="mt-1 sm:mt-0 w-4 h-4 text-purple-700 rounded border-slate-300 focus:ring-purple-600 cursor-pointer"
        />

        <div className="space-y-1">
          <h3
            className={`text-sm font-bold transition ${
              esCompletada ? 'line-through text-slate-400' : 'text-slate-800'
            }`}
          >
            {titulo}
          </h3>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              📁 <span className="font-medium text-slate-600">{categoria}</span>
            </span>
            <span className="flex items-center gap-1">
              ⏱️ <span className="font-medium text-slate-600">{horas} hrs</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {/* Badge de Urgencia */}
        {esUrgente && !esCompletada && (
          <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
            URGENTE
          </span>
        )}

        {/* Badge de Completada */}
        {esCompletada && (
          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
            ✓ COMPLETADA
          </span>
        )}

        {/* Botones de acción */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 transition rounded-lg hover:bg-slate-100 cursor-pointer text-xs"
              title="Editar gestión"
            >
              ✏️
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={handleEliminar}
              className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50 cursor-pointer text-xs"
              title="Eliminar gestión"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </li>
  );
};

export default GestionCard;