export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
      <div className="text-center mb-6">
        <span className="text-6xl mb-4 block">📋</span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No hay turnos disponibles
        </h2>
        <p className="text-gray-600 mb-6">
          No se encontraron turnos programados para este sub-módulo
        </p>
      </div>
      <button
        onClick={() => window.history.back()}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                 transition-colors duration-200 flex items-center space-x-2"
      >
        <span>←</span>
        <span>Volver atrás</span>
      </button>
    </div>
  );
}
