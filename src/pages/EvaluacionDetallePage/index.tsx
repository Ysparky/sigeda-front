import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { EvaluacionHeader } from "./components/EvaluacionHeader";
import { CalificacionesTable } from "./components/CalificacionesTable";
import { evaluacionDetalleService } from "../../services/evaluacionDetalle.service";
import type { EvaluacionDetalle } from "./types";

function EvaluacionDetallePage() {
  const { evaluacionId, turnoId, subFaseId } = useParams();
  const [evaluacion, setEvaluacion] = useState<EvaluacionDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvaluacionDetalle = async () => {
      if (!evaluacionId) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await evaluacionDetalleService.getEvaluacionDetalle(
          evaluacionId
        );
        setEvaluacion(data);
      } catch (err) {
        setError("Error al cargar el detalle de la evaluación");
        console.error("Error loading evaluacion detalle:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvaluacionDetalle();
  }, [evaluacionId]);

  if (isLoading) return <LoadingSpinner />;

  if (error || !evaluacion) {
    return (
      <ErrorDisplay
        title="No pudimos cargar el detalle de la evaluación"
        message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
        onRetry={() => window.location.reload()}
        showHeader={true}
      >
        <Breadcrumb
          items={[
            { label: "Módulos", path: "/" },
            { label: "Turnos", path: `/turnos/${subFaseId}` },
            { label: "Evaluaciones", path: `/turnos/${turnoId}/evaluaciones` },
            { label: "Detalle" },
          ]}
        />
      </ErrorDisplay>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Módulos", path: "/" },
          { label: "Turnos", path: `/turnos/${subFaseId}` },
          { label: "Evaluaciones", path: `/turnos/${turnoId}/evaluaciones` },
          { label: "Detalle" },
        ]}
      />

      <EvaluacionHeader evaluacion={evaluacion} />
      <CalificacionesTable calificaciones={evaluacion.calificaciones} />
    </div>
  );
}

export default EvaluacionDetallePage;