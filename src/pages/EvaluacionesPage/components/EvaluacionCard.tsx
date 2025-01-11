import { useNavigate, useParams } from "react-router-dom";
import type { Evaluacion } from "../types";

interface EvaluacionCardProps {
  evaluacion: Evaluacion;
}

export function EvaluacionCard({ evaluacion }: EvaluacionCardProps) {
  const navigate = useNavigate();
  const { subfaseId, turnoId } = useParams();

  const handleClick = () => {
    if (!subfaseId || !turnoId) {
      console.error("Missing required params:", { subfaseId, turnoId });
      return;
    }

    navigate(
      `/subfase/${subfaseId}/turnos/${turnoId}/evaluaciones/${evaluacion.codigo}`
    );
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-6 cursor-pointer transform hover:-translate-y-1"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {evaluacion.nombre}
          </h3>
          <p className="text-sm text-gray-600">{evaluacion.fase}</p>
        </div>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
          {evaluacion.fecha}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Alumno</p>
            <p className="text-sm font-medium text-gray-900">
              {evaluacion.alumno}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Evaluador</p>
            <p className="text-sm font-medium text-gray-900">
              {evaluacion.evaluador}
            </p>
          </div>
        </div>

        <div className="border-t pt-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Promedio:</span>
            <span className="text-sm font-medium text-yellow-600">
              {evaluacion.promedio ?? "Pendiente"}
            </span>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              evaluacion.clasificacion === "Bueno"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {evaluacion.clasificacion}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
          Ver detalle
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
