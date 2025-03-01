import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { evaluacionesService } from "../../services/evaluaciones.service";
import { CalificacionesTable } from "./components/CalificacionesTable";
import { EvaluacionHeader } from "./components/EvaluacionHeader";
import { SkeletonLoader } from "./components/SkeletonLoader";
import type { EvaluacionDetalle } from "./types";

function EvaluacionDetallePage() {
  const { evaluacionId, turnoId } = useParams();
  const [evaluacion, setEvaluacion] = useState<EvaluacionDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const loadEvaluacionDetalle = async () => {
      if (!evaluacionId) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await evaluacionesService.getEvaluacionDetalle(
          evaluacionId
        );
        setEvaluacion(data);
        setLastUpdated(new Date());
      } catch (err) {
        setError("Error al cargar los detalles de la evaluación");
        console.error("Error loading evaluacion detalle:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvaluacionDetalle();
  }, [evaluacionId]);

  // Common layout wrapper
  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Turnos", path: "/turnos" },
          {
            label: "Evaluaciones",
            path: turnoId ? `/turnos/${turnoId}/evaluaciones` : undefined,
          },
          { label: "Detalle" },
        ]}
        showHome={false}
      />
      {children}
    </div>
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Cargando detalles de evaluación...
          </h1>
        </div>
        <SkeletonLoader />
      </PageWrapper>
    );
  }

  if (error || !evaluacion) {
    return (
      <PageWrapper>
        <ErrorDisplay
          title="No pudimos cargar los detalles de la evaluación"
          message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
          onRetry={() => window.location.reload()}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Detalle de Evaluación
          </h1>

          {/* Status indicator */}
          {lastUpdated && (
            <div className="flex items-center text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-600">
                Última actualización: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <EvaluacionHeader evaluacion={evaluacion} />
      <CalificacionesTable calificaciones={evaluacion.calificaciones} />
    </PageWrapper>
  );
}

export default EvaluacionDetallePage;
