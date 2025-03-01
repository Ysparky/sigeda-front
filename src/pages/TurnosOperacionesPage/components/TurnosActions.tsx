interface TurnosActionsProps {
  onNewTurno: () => void;
}

export function TurnosActions({ onNewTurno }: TurnosActionsProps) {
  return (
    <button
      onClick={onNewTurno}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-sm flex items-center"
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
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      Nuevo Turno
    </button>
  );
}
