import { useAuth } from "../../contexts/auth";

interface UserInfoErrorProps {
  onRetry: () => Promise<void>;
}

export function UserInfoError({ onRetry }: UserInfoErrorProps) {
  const { logout } = useAuth();

  const handleRetry = async () => {
    try {
      await onRetry();
    } catch (error) {
      console.error("Error retrying user info load:", error);
    }
  };

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
          No se pudo obtener la información del usuario. Por favor, intente
          nuevamente.
        </p>
        <div className="space-y-4">
          <button
            onClick={handleRetry}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors duration-200 hover:shadow-lg"
          >
            Intentar nuevamente
          </button>
          <button
            onClick={logout}
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
