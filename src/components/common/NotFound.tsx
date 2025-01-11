import { useNavigate } from "react-router-dom";

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <span className="text-8xl animate-bounce hover:animate-none cursor-pointer transform hover:scale-110 transition-transform duration-300">
            ✈️
          </span>
        </div>
        <div className="animate-fade-in">
          <h1 className="text-6xl font-bold text-gray-900 mb-4 animate-slide-up">
            404
          </h1>
          <p className="text-xl text-gray-600 mb-8 animate-slide-up delay-150">
            Parece que esta página ha perdido su rumbo
          </p>
          <div className="space-y-4 md:space-y-0 animate-slide-up delay-300">
            <button
              onClick={() => navigate(-1)}
              className="block w-full md:inline md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5
                       transition-all duration-200 ease-out"
            >
              ← Volver atrás
            </button>
            <button
              onClick={() => navigate("/")}
              className="block w-full md:inline md:w-auto md:ml-4 px-6 py-3 bg-gray-100 text-gray-700 
                       rounded-lg hover:bg-gray-200 hover:shadow-lg transform hover:-translate-y-0.5
                       transition-all duration-200 ease-out"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
