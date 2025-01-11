import type { Fase } from "../../services/fases.service";
import { getModuleIcon } from "../../utils/moduleIcons";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ModuleCard } from "./ModuleCard";

interface ModulesListProps {
  fases: Fase[];
  isLoading: boolean;
  selectedFaseId: number | null;
  onFaseClick: (fase: Fase) => void;
}

export const ModulesList = ({
  fases,
  isLoading,
  selectedFaseId,
  onFaseClick,
}: ModulesListProps) => {
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {fases.map((fase) => (
        <ModuleCard
          key={fase.id}
          icon={<span className="text-xl">{getModuleIcon(fase.nombre)}</span>}
          title={fase.nombre}
          onClick={() => onFaseClick(fase)}
          selected={selectedFaseId === fase.id}
        />
      ))}
    </div>
  );
};
