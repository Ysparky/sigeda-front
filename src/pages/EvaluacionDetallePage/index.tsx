import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { evaluacionesService } from "../../services/evaluaciones.service";
import { CalificacionesTable } from "./components/CalificacionesTable";
import { EvaluacionHeader } from "./components/EvaluacionHeader";
import type { EvaluacionDetalle } from "./types";

function EvaluacionDetallePage() {
  const { evaluacionId, turnoId } = useParams();
  const navigate = useNavigate();
  const [evaluacion, setEvaluacion] = useState<EvaluacionDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        setError("Error al cargar los detalles de la evaluación");
        console.error("Error loading evaluacion detalle:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvaluacionDetalle();
  }, [evaluacionId]);

  const handleBack = () => {
    if (turnoId) {
      navigate(`/turnos/${turnoId}/evaluaciones`);
    } else {
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Módulos", path: "/" },
            { label: "Turnos", path: "/turnos" },
            {
              label: "Evaluaciones",
              path: turnoId ? `/turnos/${turnoId}/evaluaciones` : undefined,
            },
            { label: "Detalle" },
          ]}
        />
        <div className="w-full min-h-[300px] flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !evaluacion) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Módulos", path: "/" },
            { label: "Turnos", path: "/turnos" },
            {
              label: "Evaluaciones",
              path: turnoId ? `/turnos/${turnoId}/evaluaciones` : undefined,
            },
            { label: "Detalle" },
          ]}
        />
        <ErrorDisplay
          title="No pudimos cargar los detalles de la evaluación"
          message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Módulos", path: "/" },
          { label: "Turnos", path: "/turnos" },
          {
            label: "Evaluaciones",
            path: turnoId ? `/turnos/${turnoId}/evaluaciones` : undefined,
          },
          { label: "Detalle" },
        ]}
      />

      <div className="mb-8">
        <button
          onClick={handleBack}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver a Evaluaciones
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Detalle de Evaluación
        </h1>
      </div>

      <EvaluacionHeader evaluacion={evaluacion} />
      <CalificacionesTable calificaciones={evaluacion.calificaciones} />
    </div>
  );
}

export default EvaluacionDetallePage;
