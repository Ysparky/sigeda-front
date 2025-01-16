interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHeader?: boolean;
  children?: React.ReactNode;
}

export function ErrorDisplay({
  title = "Ha ocurrido un error",
  message = "Hubo un problema al obtener la información. Por favor, intente nuevamente.",
  onRetry,
  showHeader = true,
  children,
}: ErrorDisplayProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {showHeader && children}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <span className="text-5xl mb-4 block">😕</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
