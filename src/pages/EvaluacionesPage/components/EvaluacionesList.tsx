import { useRef } from "react";
import type { Evaluacion, FilterOption } from "../types";
import { EvaluacionCard } from "./EvaluacionCard";

interface EvaluacionesListProps {
  evaluaciones: Evaluacion[];
  searchTerm: string;
  filterBy: FilterOption;
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function EvaluacionesList({
  evaluaciones,
  searchTerm,
  filterBy,
  hasFilters,
  onClearFilters,
}: EvaluacionesListProps) {
  // Reference to the list for animation purposes
  const listRef = useRef<HTMLDivElement>(null);

  // Filter evaluaciones based on search term and filter option
  const filteredEvaluaciones = evaluaciones.filter((evaluacion) => {
    const searchValue = searchTerm.toLowerCase().trim();
    if (!searchValue) return true;

    switch (filterBy) {
      case "fecha":
        return evaluacion.fecha.toLowerCase().includes(searchValue);
      case "clasificacion":
        return evaluacion.clasificacion.toLowerCase().includes(searchValue);
      case "calificacion":
        return (
          evaluacion.promedio?.toLowerCase().includes(searchValue) || false
        );
      default:
        return true;
    }
  });

  if (filteredEvaluaciones.length === 0) {
    return (
      <div className="w-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-6xl mb-4 opacity-75">
          {hasFilters ? "🔍" : "📋"}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {hasFilters
            ? "No se encontraron evaluaciones"
            : "No hay evaluaciones disponibles"}
        </h3>
        <p className="text-gray-600 max-w-md mb-6">
          {hasFilters
            ? "No hay evaluaciones que coincidan con los filtros aplicados. Intenta con otros criterios de búsqueda."
            : "No hay evaluaciones disponibles para este turno en este momento."}
        </p>

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200 flex items-center"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full animate-fade-in"
    >
      {filteredEvaluaciones.map((evaluacion, index) => (
        <EvaluacionCard
          key={evaluacion.codigo}
          evaluacion={evaluacion}
          index={index}
        />
      ))}
    </div>
  );
}
