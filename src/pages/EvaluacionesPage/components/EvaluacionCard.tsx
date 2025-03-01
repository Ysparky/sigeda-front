import { useNavigate, useParams } from "react-router-dom";
import type { Evaluacion } from "../types";

interface EvaluacionCardProps {
  evaluacion: Evaluacion;
  index?: number;
}

export function EvaluacionCard({ evaluacion, index = 0 }: EvaluacionCardProps) {
  const navigate = useNavigate();
  const { turnoId } = useParams();

  const handleClick = () => {
    if (!turnoId) {
      console.error("Missing turnoId");
      return;
    }

    navigate(`/turnos/${turnoId}/evaluaciones/${evaluacion.codigo}`);
  };

  // Format date for better display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch {
      // Return original string if formatting fails
      return dateString;
    }
  };

  // Get color based on classification
  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case "bueno":
      case "excelente":
      case "sobresaliente":
        return "bg-green-100 text-green-800";
      case "regular":
      case "aceptable":
        return "bg-yellow-100 text-yellow-800";
      case "malo":
      case "deficiente":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 cursor-pointer 
                transform hover:-translate-y-1 border border-gray-100 hover:border-blue-100 h-full
                relative overflow-hidden group"
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: "both",
      }}
    >
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

      <div className="flex justify-between items-start mb-4 relative">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
            {evaluacion.nombre}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{evaluacion.fase}</p>
        </div>
        <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          {formatDate(evaluacion.fecha)}
        </span>
      </div>

      <div className="space-y-4 relative">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Alumno
            </p>
            <p className="text-sm font-medium text-gray-900">
              {evaluacion.alumno}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Evaluador
            </p>
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
            className={`px-2 py-1 rounded-full text-xs font-medium ${getClassificationColor(
              evaluacion.clasificacion
            )}`}
          >
            {evaluacion.clasificacion}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span className="inline-flex items-center text-sm text-blue-600 group-hover:text-blue-800 transition-colors duration-300">
          Ver detalle
          <svg
            className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
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
