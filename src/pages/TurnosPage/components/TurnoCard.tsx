import { useNavigate, useParams } from "react-router-dom";
import type { TurnoResponse } from "../types";

interface TurnoCardProps {
  turno: TurnoResponse;
}

export function TurnoCard({ turno }: TurnoCardProps) {
  const navigate = useNavigate();
  const { subfaseId } = useParams();

  const handleClick = () => {
    if (!subfaseId) {
      console.error("Missing subfaseId");
      return;
    }
    navigate(`/subfase/${subfaseId}/turnos/${turno.id}/evaluaciones`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-6 cursor-pointer transform hover:-translate-y-1"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{turno.nombre}</h3>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
          {new Date(turno.fechaEval).toLocaleDateString()}
        </span>
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

        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium text-gray-600">
                {turno.cantManiobra}
              </span>
              <span className="text-sm text-gray-500">maniobras</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium text-gray-600">
                {turno.cantGrupo}
              </span>
              <span className="text-sm text-gray-500">grupos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
          Ver evaluaciones
          <svg
            className="ml-1 w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
