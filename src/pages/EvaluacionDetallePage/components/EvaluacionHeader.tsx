import type { EvaluacionDetalle } from "../types";

interface EvaluacionHeaderProps {
  evaluacion: EvaluacionDetalle;
}

export function EvaluacionHeader({ evaluacion }: EvaluacionHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {evaluacion.nombre}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h2 className="font-medium text-gray-900 mb-4">
            Información General
          </h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-gray-600">Fecha:</span>{" "}
              <span className="font-medium">{evaluacion.fecha}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Programa:</span>{" "}
              <span className="font-medium">{evaluacion.programa}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Fase:</span>{" "}
              <span className="font-medium">{evaluacion.fase}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Sub-Fase:</span>{" "}
              <span className="font-medium">{evaluacion.subFase}</span>
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-medium text-gray-900 mb-4">Evaluación</h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-gray-600">Categoría:</span>{" "}
              <span className="font-medium">{evaluacion.categoria}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Clasificación:</span>{" "}
              <span
                className={`font-medium ${
                  evaluacion.clasificacion === "Bueno"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {evaluacion.clasificacion}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Promedio:</span>{" "}
              <span className="font-medium text-yellow-500">
                {evaluacion.promedio}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Estado del Alumno:</span>{" "}
              <span className="font-medium">{evaluacion.estadoAlumno}</span>
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-medium text-gray-900 mb-4">Participantes</h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-gray-600">Alumno:</span>{" "}
              <span className="font-medium">{evaluacion.alumno}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Evaluador:</span>{" "}
              <span className="font-medium">{evaluacion.evaluador}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
