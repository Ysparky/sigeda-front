interface WelcomeHeaderProps {
  username: string | null;
}

export function WelcomeHeader({ username }: WelcomeHeaderProps) {
  return (
    <div className="border-b pb-4">
      <h1 className="text-2xl font-semibold text-gray-900">Hola, {username}</h1>
      <p className="text-sm text-gray-600 mt-1">
        Selecciona un módulo para ver sus sub-módulos
      </p>
    </div>
  );
} 