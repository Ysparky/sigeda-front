import { useNavigate } from "react-router-dom";

interface ErrorPageProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorPage({
  message = "Ha ocurrido un error al cargar la información",
  onRetry,
}: ErrorPageProps) {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    try {
      navigate("/login");
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <span className="text-6xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Error de Sistema
        </h1>
        <p className="text-gray-600 mb-8">{message}</p>
        <div className="space-y-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors duration-200"
            >
              Intentar nuevamente
            </button>
          )}
          <button
            onClick={handleLoginClick}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                     transition-colors duration-200"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
