import { SubModulesList } from "../../../components/modules/SubModulesList";
import { ErrorDisplay } from "../../../components/common/ErrorDisplay";
import type { SubModulesSectionProps } from "../types";

export function SubModulesSection({
  fase,
  isLoading,
  error,
}: SubModulesSectionProps) {
  return (
    <div className="mt-8 pt-8 border-t">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Sub-módulos de {fase.nombre}
      </h2>

      {error ? (
        <ErrorDisplay
          title="No pudimos cargar los sub-módulos"
          message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
          onRetry={() => window.location.reload()}
          showHeader={false}
        />
      ) : (
        <SubModulesList fase={fase} isLoading={isLoading} />
      )}
    </div>
  );
}
