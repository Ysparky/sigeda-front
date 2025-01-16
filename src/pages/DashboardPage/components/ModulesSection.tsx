import { ErrorDisplay } from "../../../components/common/ErrorDisplay";
import { ModulesList } from "../../../components/modules/ModulesList";
import type { Fase } from "../../../services/fases.service";

interface ModulesSectionProps {
  fases: Fase[];
  isLoading: boolean;
  selectedFase: Fase | null;
  onFaseClick: (fase: Fase) => void;
  error: string | null;
  onRetry: () => void;
}

export function ModulesSection({
  fases,
  isLoading,
  selectedFase,
  onFaseClick,
  error,
  onRetry,
}: ModulesSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Módulos</h2>

      <div className="space-y-4">
        {error ? (
          <ErrorDisplay
            title="No pudimos cargar los módulos"
            message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
            onRetry={onRetry}
            showHeader={false}
          />
        ) : (
          <ModulesList
            fases={fases}
            isLoading={isLoading}
            selectedFaseId={selectedFase?.id ?? null}
            onFaseClick={onFaseClick}
          />
        )}
      </div>
    </section>
  );
}
