import type { TurnoResponse } from "../types";
import { TurnoCard } from "./TurnoCard";

interface TurnosListProps {
  turnos: TurnoResponse[];
}

export function TurnosList({ turnos }: TurnosListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
      {turnos.map((turno) => (
        <TurnoCard key={turno.id} turno={turno} />
      ))}
    </div>
  );
}
