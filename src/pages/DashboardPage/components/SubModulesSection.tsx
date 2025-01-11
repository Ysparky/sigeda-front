import { SubModulesList } from '../../../components/modules/SubModulesList';
import type { SubModulesSectionProps } from '../types';

export function SubModulesSection({ fase, isLoading }: SubModulesSectionProps) {
  return (
    <div className="mt-8 pt-8 border-t">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Sub-módulos de {fase.nombre}
      </h2>
      <SubModulesList
        fase={fase}
        isLoading={isLoading}
      />
    </div>
  );
} 