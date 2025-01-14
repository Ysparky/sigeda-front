import type { EvaluacionDetalle } from "../types";

interface EvaluacionHeaderProps {
  evaluacion: EvaluacionDetalle;
}

export function EvaluacionHeader({ evaluacion }: EvaluacionHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {evaluacion.nombre}
          </h1>
          <p className="text-sm text-gray-600">
            Fase: <span className="font-medium">{evaluacion.fase}</span> /
            SubFase: <span className="font-medium">{evaluacion.subFase}</span>
          </p>
        </div>
        <div className="text-right">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
            {evaluacion.clasificacion === 'Bueno' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'}"
          >
            {evaluacion.clasificacion}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h2 className="font-medium text-gray-900 mb-3">
            Información General
          </h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-gray-600">Fecha:</span>{" "}
              <span className="font-medium">
                {new Date(evaluacion.fecha).toLocaleDateString()}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Programa:</span>{" "}
              <span className="font-medium">{evaluacion.programa}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Categoría:</span>{" "}
              <span className="font-medium">{evaluacion.categoria}</span>
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-medium text-gray-900 mb-3">Participantes</h2>
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

        <div>
          <h2 className="font-medium text-gray-900 mb-3">Calificación</h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-gray-600">Promedio:</span>{" "}
              <span className="font-medium text-lg text-yellow-600">
                {evaluacion.promedio}
              </span>
            </p>
            {evaluacion.recomendacion && (
              <p className="text-sm">
                <span className="text-gray-600">Recomendación:</span>{" "}
                <span className="font-medium">{evaluacion.recomendacion}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
