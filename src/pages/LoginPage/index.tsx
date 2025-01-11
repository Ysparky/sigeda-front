import { LoginForm } from './components/LoginForm';
import { WelcomePanel } from './components/WelcomePanel';

function LoginPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <WelcomePanel />
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido!</h1>
            <p className="text-gray-500 mt-3">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>
          <LoginForm />
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