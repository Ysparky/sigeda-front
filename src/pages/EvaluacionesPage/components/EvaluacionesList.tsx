import type { Evaluacion, FilterOption } from "../types";
import { EvaluacionCard } from "./EvaluacionCard";

interface EvaluacionesListProps {
  evaluaciones: Evaluacion[];
  searchTerm: string;
  filterBy: FilterOption;
}

export function EvaluacionesList({
  evaluaciones,
  searchTerm,
  filterBy,
}: EvaluacionesListProps) {
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
      <div className="w-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No hay evaluaciones
        </h3>
        <p className="text-gray-600">
          {searchTerm
            ? "No se encontraron evaluaciones con los filtros aplicados"
            : "No hay evaluaciones disponibles para este turno"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in w-full">
      {filteredEvaluaciones.map((evaluacion) => (
        <EvaluacionCard key={evaluacion.codigo} evaluacion={evaluacion} />
      ))}
    </div>
  );
}
