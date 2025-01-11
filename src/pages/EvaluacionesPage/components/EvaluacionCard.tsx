import { useNavigate, useParams } from "react-router-dom";
import type { Evaluacion } from "../types";

interface EvaluacionCardProps {
  evaluacion: Evaluacion;
}

export function EvaluacionCard({ evaluacion }: EvaluacionCardProps) {
  const navigate = useNavigate();
  const { subFaseId, turnoId } = useParams();

  const handleClick = () => {
    navigate(
      `/turnos/${subFaseId}/turno/${turnoId}/evaluaciones/${evaluacion.codigo}`
    );
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-6 cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {evaluacion.nombre}
          </h3>
          <p className="text-sm text-gray-600">{evaluacion.fase}</p>
        </div>
        <span className="text-sm text-gray-500">{evaluacion.fecha}</span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Alumno:</span>
          <span className="font-medium">{evaluacion.alumno}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Evaluador:</span>
          <span className="font-medium">{evaluacion.evaluador}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Promedio:</span>
            <span className="font-medium text-yellow-500">
              {evaluacion.promedio ?? "Pendiente"}
            </span>
          </div>
          <span
            className={`text-sm font-medium ${
              evaluacion.clasificacion === "Bueno"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {evaluacion.clasificacion}
          </span>
        </div>
      </div>
    </div>
  );
}
