import type { TurnoResponse } from "../types";

interface TurnoCardProps {
  turno: TurnoResponse;
}

export function TurnoCard({ turno }: TurnoCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{turno.nombre}</h3>
        <span className="text-sm text-gray-500">
          {new Date(turno.fechaEval).toLocaleDateString()}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Programa: <span className="font-medium">{turno.programa}</span>
        </p>
        <p className="text-sm text-gray-600">
          Fase: <span className="font-medium">{turno.fase}</span>
        </p>
        <div className="border-t pt-2">
          <p className="text-sm font-medium text-gray-700">Asignaciones</p>
          <div className="flex justify-between mt-1">
            <span className="text-sm text-gray-600">
              {turno.cantManiobra} maniobras
            </span>
            <span className="text-sm text-gray-600">
              {turno.cantGrupo} Grupos
            </span>
          </div>
        </div>
      </div>

      <button
        className="mt-4 w-full text-blue-600 text-sm hover:text-blue-800 
                 transition-colors duration-200 text-center"
      >
        Ver más información del turno →
      </button>
    </div>
  );
}
