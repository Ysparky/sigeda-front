import { useNavigate } from 'react-router-dom';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <span className="text-8xl">✈️</span>
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">
          Parece que esta página ha perdido su rumbo
        </p>
        <div className="space-y-4">
          <button
            onClick={() => navigate(-1)}
            className="block w-full md:inline md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            ← Volver atrás
          </button>
          <button
            onClick={() => navigate('/')}
            className="block w-full md:inline md:w-auto md:ml-4 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}; 