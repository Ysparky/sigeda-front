import { TurnoCard } from "./TurnoCard";
import type { TurnoResponse, SortOption } from "../types";

interface TurnosListProps {
  turnos: TurnoResponse[];
  searchTerm: string;
  sortBy: SortOption;
}

export function TurnosList({ turnos, searchTerm, sortBy }: TurnosListProps) {
  const filteredTurnos = turnos.filter(
    (turno) =>
      turno.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turno.programa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedTurnos = [...filteredTurnos].sort((a, b) => {
    switch (sortBy) {
      case "alfabetico":
        return a.nombre.localeCompare(b.nombre);
      case "fecha":
        return (
          new Date(b.fechaEval).getTime() - new Date(a.fechaEval).getTime()
        );
      case "conteo":
        return b.cantManiobra - a.cantManiobra;
      default:
        return 0;
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
      {sortedTurnos.map((turno) => (
        <TurnoCard key={turno.id} turno={turno} />
      ))}
    </div>
  );
}
