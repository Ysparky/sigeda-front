
interface UserInfoErrorProps {
  onRetry: () => void;
  onLogout: () => void;
}

export function UserInfoError({ onRetry, onLogout }: UserInfoErrorProps) {
  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 animate-bounce">
          <span className="text-6xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Error al cargar información
        </h1>
        <p className="text-gray-600 mb-8">
          No se pudo obtener la información del usuario. Por favor, intente nuevamente.
        </p>
        <div className="space-y-4">
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors duration-200 hover:shadow-lg"
          >
            Intentar nuevamente
          </button>
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                     transition-colors duration-200 hover:shadow-lg"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
} 