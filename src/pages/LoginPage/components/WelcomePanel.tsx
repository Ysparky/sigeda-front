export function WelcomePanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-[#1e3a8a] p-12 flex-col justify-between animate-fade-in">
      <div className="text-white">
        <div className="flex items-center space-x-3 mb-6">
          <span className="text-4xl animate-bounce">✈️</span>
          <h1 className="text-4xl font-bold animate-slide-in">SIGEDA</h1>
        </div>
        <h2 className="text-2xl font-bold animate-slide-in" style={{ animationDelay: '100ms' }}>
          Sistema de Gestión de Entrenamiento y Desarrollo Aeronáutico
        </h2>
        <p className="mt-4 text-blue-100 animate-slide-in" style={{ animationDelay: '200ms' }}>
          Plataforma integral para la gestión y seguimiento del entrenamiento aeronáutico 
          de la Fuerza Aérea del Perú.
        </p>
      </div>
      <div className="text-blue-100 text-sm animate-fade-in" style={{ animationDelay: '300ms' }}>
        Fuerza Aérea del Perú - Pisco
      </div>
    </div>
  );
} 