import { ModulesList } from "../../../components/modules/ModulesList";
import type { ModulesSectionProps } from "../types";

export function ModulesSection({
  fases,
  isLoading,
  selectedFase,
  onFaseClick,
}: ModulesSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Módulos disponibles
      </h2>
      <ModulesList
        fases={fases}
        isLoading={isLoading}
        selectedFaseId={selectedFase?.id ?? null}
        onFaseClick={onFaseClick}
      />
    </div>
  );
}
