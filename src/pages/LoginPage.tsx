import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface LoginError {
  show: boolean;
  message: string;
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoginError>({ show: false, message: '' });
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError({ show: false, message: '' });
    setIsLoading(true);

    try {
      await login({ username, password });
      navigate('/');
    } catch (err: unknown) {
      setError({
        show: true,
        message: err instanceof Error 
          ? err.message 
          : 'Credenciales inválidas. Por favor, intente nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Panel Izquierdo - Decorativo */}
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

      {/* Panel Derecho - Formulario de Inicio de Sesión */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido!</h1>
            <p className="text-gray-500 mt-3">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
            {error.show && (
              <div className="animate-slide-in bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error.message}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="transition-all duration-300 ease-in-out hover:transform hover:translate-y-[-2px]">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         transition-all duration-200"
                required
                autoComplete="username"
                placeholder="Ingresa tu nombre de usuario"
              />
            </div>

            <div className="transition-all duration-300 ease-in-out hover:transform hover:translate-y-[-2px]">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         transition-all duration-200"
                required
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded
                           transition-all duration-200"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Recordar sesión
                </label>
              </div>
              <button 
                type="button" 
                className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
                       shadow-sm text-sm font-medium text-white bg-[#1e3a8a] hover:bg-blue-800 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                       transition-all duration-200 transform hover:-translate-y-0.5
                       ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              Sistema de uso exclusivo para personal autorizado de la{' '}
              <span className="font-medium">Fuerza Aérea del Perú</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage; 