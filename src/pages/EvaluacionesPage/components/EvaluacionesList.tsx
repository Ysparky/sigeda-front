import type { Evaluacion } from "../types";
import { EvaluacionCard } from "./EvaluacionCard";

interface EvaluacionesListProps {
  evaluaciones: Evaluacion[];
}

export function EvaluacionesList({ evaluaciones }: EvaluacionesListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
      {evaluaciones.map((evaluacion) => (
        <EvaluacionCard key={evaluacion.codigo} evaluacion={evaluacion} />
      ))}
    </div>
  );
}
