import { useState } from "react";
import type { Calificacion } from "../types";

interface CalificacionesTableProps {
  calificaciones: Calificacion[];
}

export function CalificacionesTable({
  calificaciones,
}: CalificacionesTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Toggle row expansion
  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Get color based on nota vs notaMin
  const getScoreColor = (nota: string, notaMin: string) => {
    const score = Number(nota);
    const minScore = Number(notaMin);

    if (score >= minScore + 2) {
      return "bg-green-100 text-green-800";
    } else if (score >= minScore) {
      return "bg-blue-100 text-blue-800";
    } else if (score >= minScore - 1) {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 animate-fade-in"
      style={{ animationDelay: "600ms" }}
    >
      <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Detalle de Calificaciones
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Lista de maniobras y sus respectivas calificaciones
            </p>
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
            <span className="mr-3">Aprobado</span>
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
            <span>No aprobado</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Maniobra
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nota Mínima
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nota
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Causa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Observación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Recomendación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:hidden">
                Detalles
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calificaciones.map((calificacion, index) => (
              <>
                <tr
                  key={calificacion.idManiobra}
                  className={`hover:bg-gray-50 transition-colors duration-150 ${
                    expandedRow === calificacion.idManiobra ? "bg-blue-50" : ""
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {calificacion.maniobra.nombre}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {calificacion.maniobra.descripcion}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calificacion.notaMin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${getScoreColor(
                        calificacion.nota,
                        calificacion.notaMin
                      )}`}
                    >
                      {calificacion.nota}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {calificacion.causa || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                    {calificacion.observacion || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                    {calificacion.recomendacion || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 md:hidden">
                    <button
                      onClick={() => toggleRow(calificacion.idManiobra)}
                      className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                    >
                      {expandedRow === calificacion.idManiobra ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
                {/* Mobile expanded row */}
                {expandedRow === calificacion.idManiobra && (
                  <tr className="bg-gray-50 md:hidden">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="text-sm text-gray-700 space-y-2 animate-fade-in">
                        <div>
                          <span className="font-medium">Causa:</span>{" "}
                          {calificacion.causa || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Observación:</span>{" "}
                          {calificacion.observacion || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Recomendación:</span>{" "}
                          {calificacion.recomendacion || "-"}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {calificaciones.length === 0 && (
        <div className="p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
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
          <p className="text-gray-600">No hay calificaciones disponibles</p>
        </div>
      )}
    </div>
  );
}
