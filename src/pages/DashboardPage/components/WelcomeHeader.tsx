import { UserInfo } from "../../../types/auth.types";
import { getFullName } from "../../../utils/userUtils";

interface WelcomeHeaderProps {
  userInfo: UserInfo | null;
}

export function WelcomeHeader({ userInfo }: WelcomeHeaderProps) {
  return (
    <div className="border-b pb-4">
      <h1 className="text-2xl font-semibold text-gray-900">
        Hola, {getFullName(userInfo)}
      </h1>
      <p className="text-sm text-gray-600 mt-1">
        Selecciona un módulo para ver sus sub-módulos
      </p>
    </div>
  );
}
