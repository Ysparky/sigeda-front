import type { TurnoResponse } from "../../TurnosPage/types";

interface TurnoOperacionesCardProps {
  turno: TurnoResponse;
  onModify: (turno: TurnoResponse) => void;
  onDelete: (turno: TurnoResponse) => void;
}

export function TurnoOperacionesCard({
  turno,
  onModify,
  onDelete,
}: TurnoOperacionesCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {turno.nombre}
          </h3>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            {new Date(turno.fechaEval).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onModify(turno)}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50
                     transition-colors duration-200"
            title="Modificar turno"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(turno)}
            className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50
                     transition-colors duration-200"
            title="Eliminar turno"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Programa:</span>
          <span className="text-sm font-medium text-gray-900">
            {turno.programa}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Fase:</span>
          <span className="text-sm font-medium text-gray-900">
            {turno.fase}
          </span>
        </div>
      </div>
    </div>
  );
}
