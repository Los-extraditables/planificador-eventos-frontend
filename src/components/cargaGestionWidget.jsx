import { AlertTriangle } from "lucide-react";
import { useId } from "react";

export default function CargaGestionWidget({
  horasTotalesHoy,
  limiteDiarioMax,
  alertaIgnorada,
  porcentajeCarga,
  aplicarSolucion
}) {
  const isOverloaded = horasTotalesHoy > limiteDiarioMax && !alertaIgnorada;
  const idTitulo = useId();

  const textoHoras = `${horasTotalesHoy.toFixed(1)} de ${limiteDiarioMax.toFixed(1)} horas`;
  const porcentajeRedondeado = Math.round(porcentajeCarga);

  return (
    <section
      aria-labelledby={idTitulo}
      className={`w-full bg-white rounded-xl p-6 shadow-sm space-y-3 transition-colors duration-300 motion-reduce:transition-none ${
        isOverloaded ? 'border border-amber-600' : 'border border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between font-bold text-sm">
        <div className="flex items-center gap-2 text-[#314A5F]">
          <span id={idTitulo}>Carga de gestión</span>
          {isOverloaded && <AlertTriangle className="w-5 h-5 text-amber-700" aria-hidden="true" />}
        </div>
        {/* Texto visible: "x / y h"; el lector de pantalla lo lee como "x de y horas" */}
        <span className={isOverloaded ? 'text-amber-800' : 'text-slate-600'}>
          <span aria-hidden="true">
            {horasTotalesHoy.toFixed(1)} / {limiteDiarioMax.toFixed(1)} h
          </span>
          <span className="sr-only">{textoHoras}</span>
        </span>
      </div>

      {/* Colores con contraste >= 3:1 contra el fondo de la barra (antes ~1.4:1 y ~1.8:1) */}
      <div
        role="progressbar"
        aria-labelledby={idTitulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentajeRedondeado}
        aria-valuetext={`${textoHoras}, ${porcentajeRedondeado}% del límite diario${isOverloaded ? ', límite excedido' : ''}`}
        className="w-full bg-[#E8EAEB] rounded-full h-2.5 overflow-hidden"
      >
        <div
          className={`h-2.5 rounded-full transition-all duration-500 motion-reduce:transition-none ${
            isOverloaded ? 'bg-amber-700' : 'bg-cyan-700'
          }`}
          style={{ width: `${porcentajeCarga}%` }}
        ></div>
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