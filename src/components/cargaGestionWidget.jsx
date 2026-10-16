import { AlertTriangle } from "lucide-react";

export default function CargaGestionWidget({
  horasTotalesHoy,
  limiteDiarioMax,
  alertaIgnorada,
  porcentajeCarga,
  aplicarSolucion
}) {
  const isOverloaded = horasTotalesHoy > limiteDiarioMax && !alertaIgnorada;

  return (
    <div className={`w-full bg-white rounded-xl p-6 shadow-sm space-y-3 transition-colors duration-300 ${isOverloaded ? 'border border-[#F49F30]' : 'border border-slate-200'}`}>
      <div className="flex items-center justify-between font-bold text-sm">
        <div className="flex items-center gap-2 text-[#314A5F]">
          <span>Carga de gestión</span>
          {isOverloaded && <AlertTriangle className="w-5 h-5 text-[#F5A623]" />}
        </div>
        <span className={`${isOverloaded ? 'text-[#A47648]' : 'text-slate-600'}`}>
          {horasTotalesHoy.toFixed(1)} / {limiteDiarioMax.toFixed(1)} h
        </span>
      </div>

      <div className="w-full bg-[#E8EAEB] rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            isOverloaded ? 'bg-[#F5A623]' : 'bg-[#26C6DA]'
          }`}
          style={{ width: `${porcentajeCarga}%` }}
        ></div>
      </div>

      {/* Solo se muestra el footer si hay sobrecarga activa o si el usuario la ignoró */}
      {isOverloaded && (
        <div className="flex items-center justify-between text-xs pt-1 font-medium">
          <span className="text-[#A47648]">
            Advertencia de agenda: Has excedido la cuota recomendada.
          </span>
        </div>
      )}

      {!isOverloaded && alertaIgnorada && (
        <div className="flex items-center justify-between text-xs pt-1 font-medium">
          <span className="text-slate-600">
            Has decidido ignorar la advertencia de sobrecarga.
          </span>
        </div>
      )}
    </div>
  );
}