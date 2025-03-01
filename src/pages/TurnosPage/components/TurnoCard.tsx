import { useNavigate } from "react-router-dom";
import type { TurnoResponse } from "../types";

interface TurnoCardProps {
  turno: TurnoResponse;
}

export function TurnoCard({ turno }: TurnoCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/turnos/${turno.id}/evaluaciones`);
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

  // Get singular or plural form based on count
  const getGrupoText = (count: number) => {
    return count === 1 ? "grupo" : "grupos";
  };

  const getManiobrasText = (count: number) => {
    return count === 1 ? "maniobra" : "maniobras";
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 cursor-pointer 
                transform hover:-translate-y-1 border border-gray-100 hover:border-blue-100 h-full
                relative overflow-hidden group"
    >
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

      <div className="flex justify-between items-start mb-4 relative">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
            {turno.nombre}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Programa: <span className="font-medium">{turno.programa}</span>
          </p>
        </div>
        <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          {formatDate(turno.fechaEval)}
        </span>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500">
            <svg
              className="w-4 h-4 mr-1 text-blue-500"
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
            <span className="font-medium">{turno.cantGrupo}</span>&nbsp;
            {getGrupoText(turno.cantGrupo)}
          </div>
          <div className="flex items-center text-gray-500">
            <svg
              className="w-4 h-4 mr-1 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <span className="font-medium">{turno.cantManiobra}</span>&nbsp;
            {getManiobrasText(turno.cantManiobra)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span className="inline-flex items-center text-sm text-blue-600 group-hover:text-blue-800 transition-colors duration-300">
          Ver evaluaciones
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
