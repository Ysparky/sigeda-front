import type { EvaluacionDetalle } from "../types";

interface EvaluacionHeaderProps {
  evaluacion: EvaluacionDetalle;
}

export function EvaluacionHeader({ evaluacion }: EvaluacionHeaderProps) {
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
      return dateString;
    }
  };

  // Get classification color based on classification value
  const getClassificationColor = (classification: string | null) => {
    if (!classification) {
      return "bg-gray-100 text-gray-800 border-gray-200";
    }

    const lowerClass = classification.toLowerCase();
    if (
      lowerClass.includes("bueno") ||
      lowerClass.includes("excelente") ||
      lowerClass.includes("sobresaliente")
    ) {
      return "bg-green-100 text-green-800 border-green-200";
    } else if (
      lowerClass.includes("regular") ||
      lowerClass.includes("aceptable")
    ) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    } else if (
      lowerClass.includes("malo") ||
      lowerClass.includes("deficiente")
    ) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-100 hover:border-blue-100 transition-all duration-300 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {evaluacion.nombre}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center">
              <svg
                className="w-4 h-4 mr-1 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Fase: <span className="font-medium ml-1">{evaluacion.fase}</span>
            </span>
            <span className="inline-flex items-center">
              <svg
                className="w-4 h-4 mr-1 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              SubFase:{" "}
              <span className="font-medium ml-1">{evaluacion.subFase}</span>
            </span>
          </div>
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <span
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getClassificationColor(
              evaluacion.clasificacion
            )}`}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {evaluacion.clasificacion || "Sin clasificación"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-gray-50 p-4 rounded-lg animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <h2 className="font-medium text-gray-900 mb-3 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Información General
          </h2>
          <div className="space-y-3">
            <p className="text-sm flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-gray-600">Fecha:</span>{" "}
              <span className="font-medium ml-1">
                {formatDate(evaluacion.fecha)}
              </span>
            </p>
            <p className="text-sm flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span className="text-gray-600">Programa:</span>{" "}
              <span className="font-medium ml-1">{evaluacion.programa}</span>
            </p>
            <p className="text-sm flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <span className="text-gray-600">Categoría:</span>{" "}
              <span className="font-medium ml-1">{evaluacion.categoria}</span>
            </p>
          </div>
        </div>

        <div
          className="bg-gray-50 p-4 rounded-lg animate-slide-up"
          style={{ animationDelay: "400ms" }}
        >
          <h2 className="font-medium text-gray-900 mb-3 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Participantes
          </h2>
          <div className="space-y-3">
            <p className="text-sm flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-gray-600">Alumno:</span>{" "}
              <span className="font-medium ml-1">{evaluacion.alumno}</span>
            </p>
            <p className="text-sm flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span className="text-gray-600">Evaluador:</span>{" "}
              <span className="font-medium ml-1">{evaluacion.evaluador}</span>
            </p>
          </div>
        </div>

        <div
          className="bg-gray-50 p-4 rounded-lg animate-slide-up"
          style={{ animationDelay: "500ms" }}
        >
          <h2 className="font-medium text-gray-900 mb-3 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
            Calificación
          </h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">Promedio:</span>{" "}
              <span className="font-medium text-lg px-2 py-1 rounded bg-yellow-50 text-yellow-700">
                {evaluacion.promedio}
              </span>
            </div>
            {evaluacion.recomendacion && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-sm">
                  <span className="text-gray-600 flex items-center mb-1">
                    <svg
                      className="w-4 h-4 mr-1 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Recomendación:
                  </span>{" "}
                  <span className="font-medium block pl-5 text-gray-700">
                    {evaluacion.recomendacion}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
