import { ModuleCard } from './ModuleCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { getSubModuleIcon } from '../../utils/moduleIcons';
import type { Fase } from '../../services/fases.service';

interface SubModulesListProps {
  fase: Fase;
  isLoading: boolean;
}

export const SubModulesList = ({ fase, isLoading }: SubModulesListProps) => {
  if (isLoading) return <LoadingSpinner />;

  if (!fase.subFases || fase.subFases.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">
          No hay sub-módulos disponibles para este módulo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {fase.subFases.map((subFase) => (
        <ModuleCard
          key={subFase.id}
          icon={<span className="text-xl">{getSubModuleIcon(subFase.nombre)}</span>}
          title={subFase.nombre}
          to={`/sub-modulos/${subFase.id}`}
        />
      ))}
    </div>
  );
}; 