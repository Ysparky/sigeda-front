import { ErrorDisplay } from "../../../components/common/ErrorDisplay";
import { SubModulesList } from "../../../components/modules/SubModulesList";
import type { Fase } from "../../../services/fases.service";

interface SubModulesSectionProps {
  fase: Fase;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function SubModulesSection({
  fase,
  isLoading,
  error,
  onRetry,
}: SubModulesSectionProps) {
  return (
    <section className="border-t pt-8">
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">
          Sub-módulos de {fase.nombre}
        </h2>

        <div className="space-y-4">
          {error ? (
            <ErrorDisplay
              title="No pudimos cargar los sub-módulos"
              message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
              onRetry={onRetry}
              showHeader={false}
            />
          ) : (
            <SubModulesList fase={fase} isLoading={isLoading} />
          )}
        </div>
      </div>
    </section>
  );
}
