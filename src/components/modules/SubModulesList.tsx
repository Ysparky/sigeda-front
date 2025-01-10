import { ModuleCard } from './ModuleCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { getSubModuleIcon } from '../../utils/moduleIcons';
import type { Fase } from '../../services/fases.service';
import { useEffect, useState } from 'react';

interface SubModulesListProps {
  fase: Fase;
  isLoading: boolean;
}

export const SubModulesList = ({ fase, isLoading }: SubModulesListProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, [fase.id]);

  if (isLoading) return <LoadingSpinner />;

  if (!fase.subFases || fase.subFases.length === 0) {
    return (
      <div className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            No hay sub-módulos disponibles para este módulo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`transition-all duration-300 transform
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
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
    </div>
  );
}; 