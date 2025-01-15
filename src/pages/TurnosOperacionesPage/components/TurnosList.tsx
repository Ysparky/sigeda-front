import type { TurnoResponse } from "../../TurnosPage/types";
import { TurnoOperacionesCard } from "./TurnoOperacionesCard";

interface TurnosListProps {
  turnos: TurnoResponse[];
  onModifyTurno: (turno: TurnoResponse) => void;
  onDeleteTurno: (turno: TurnoResponse) => void;
  onClickTurno: (turno: TurnoResponse) => void;
}

export function TurnosList({
  turnos,
  onModifyTurno,
  onDeleteTurno,
  onClickTurno,
}: TurnosListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {turnos.map((turno) => (
        <TurnoOperacionesCard
          key={turno.id}
          turno={turno}
          onModify={onModifyTurno}
          onDelete={onDeleteTurno}
          onClick={onClickTurno}
        />
      ))}
    </div>
  );
}
