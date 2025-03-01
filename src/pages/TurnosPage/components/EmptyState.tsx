interface EmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in w-full bg-gray-50 rounded-lg border border-gray-200 p-8">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4 block animate-bounce-slow">📋</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No hay turnos disponibles
        </h2>
        <p className="text-gray-600 mb-6 max-w-md">
          {hasFilters
            ? "No se encontraron turnos con los filtros seleccionados"
            : "No se encontraron turnos programados para este sub-módulo"}
        </p>
      </div>

      {hasFilters ? (
        <button
          onClick={onClearFilters}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
        >
          <svg
            className="w-4 h-4"
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
          <span>Limpiar filtros</span>
        </button>
      ) : (
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
        >
          <span>←</span>
          <span>Volver atrás</span>
        </button>
      )}
    </div>
  );
}
