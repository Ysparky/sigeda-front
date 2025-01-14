interface TurnosActionsProps {
  onNewTurno: () => void;
}

export function TurnosActions({ onNewTurno }: TurnosActionsProps) {
  return (
    <button
      onClick={onNewTurno}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
    >
      + Nuevo Turno
    </button>
  );
}
