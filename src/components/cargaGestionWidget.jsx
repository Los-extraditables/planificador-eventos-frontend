import { AlertTriangle } from "lucide-react";
import { useId } from "react";

export default function CargaGestionWidget({
  horasTotalesHoy,
  limiteDiarioMax,
  alertaIgnorada,
  porcentajeCarga,
  aplicarSolucion // eslint-disable-line no-unused-vars -- reservado para acciones de solución
}) {
  // Siempre números válidos (el backend puede enviar "6.00" como texto)
  const horas = Number(horasTotalesHoy) || 0;
  const limite = Number(limiteDiarioMax) || 0;
  const porcentaje = Math.min(Math.max(Number(porcentajeCarga) || 0, 0), 100);

  const isOverloaded = horas > limite && !alertaIgnorada;
  const idTitulo = useId();

  const textoHoras = `${horas.toFixed(1)} de ${limite.toFixed(1)} horas`;
  const porcentajeRedondeado = Math.round(porcentaje);

  return (
    <section
      aria-labelledby={idTitulo}
      className={`w-full bg-white rounded-xl p-5 shadow-sm space-y-3 transition-colors duration-300 motion-reduce:transition-none ${
        isOverloaded ? 'border border-amber-600' : 'border border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3 font-bold text-sm">
        <div className="flex items-center gap-2 text-[#314A5F]">
          <span id={idTitulo}>Carga de gestión</span>
          {isOverloaded && <AlertTriangle className="w-5 h-5 text-amber-700" aria-hidden="true" />}
        </div>
        {/* Texto visible: "x / y h"; el lector de pantalla lo lee como "x de y horas" */}
        <span className={`tabular-nums ${isOverloaded ? 'text-amber-800' : 'text-slate-700'}`}>
          <span aria-hidden="true">
            {horas.toFixed(1)} / {limite.toFixed(1)} h
          </span>
          <span className="sr-only">{textoHoras}</span>
        </span>
      </div>

      {/* Riel con borde y relleno de alto contraste (>= 3:1 contra el riel) */}
      <div
        role="progressbar"
        aria-labelledby={idTitulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentajeRedondeado}
        aria-valuetext={`${textoHoras}, ${porcentajeRedondeado}% del límite diario${isOverloaded ? ', límite excedido' : ''}`}
        className="w-full h-3 rounded-full bg-slate-200 border border-slate-300 overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${
            isOverloaded ? 'bg-amber-700' : 'bg-cyan-700'
          }`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* La advertencia se anuncia al aparecer (role="alert") y no depende solo del color: lleva icono y texto */}
      {isOverloaded && (
        <div role="alert" className="flex items-center justify-between text-xs pt-1 font-medium">
          <span className="text-amber-800">
            Advertencia de agenda: Has excedido la cuota recomendada.
          </span>
        </div>
      )}

      {!isOverloaded && alertaIgnorada && (
        <div role="status" className="flex items-center justify-between text-xs pt-1 font-medium">
          <span className="text-slate-600">
            Has decidido ignorar la advertencia de sobrecarga.
          </span>
        </div>
      )}
    </section>
  );
}