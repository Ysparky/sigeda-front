import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { useRoles } from "../../hooks/useRoles";
import { evaluacionesService } from "../../services/evaluaciones.service";
import { CalificacionesTable } from "./components/CalificacionesTable";
import { EvaluacionHeader } from "./components/EvaluacionHeader";
import { SkeletonLoader } from "./components/SkeletonLoader";
import type { EvaluacionDetalle } from "./types";

function EvaluacionDetallePage() {
  const { evaluacionId, turnoId } = useParams();
  const [searchParams] = useSearchParams();
  const alumnoId = searchParams.get("alumno");
  const sourceGrupoId = searchParams.get("sourceGrupoId");
  
  const { isInstructor } = useRoles();
  
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          ...(isInstructor && alumnoId
            ? [
                { label: "Mi Escuadrón", path: "/mi-escuadron" },
                { 
                  label: "Turnos de Alumno", 
                  path: `/turnos/instructor?alumno=${alumnoId}${sourceGrupoId ? `&idGrupo=${sourceGrupoId}` : ''}` 
                },
                {
                  label: "Evaluaciones",
                  path: turnoId ? `/turnos/${turnoId}/evaluaciones?alumno=${alumnoId}${sourceGrupoId ? `&sourceGrupoId=${sourceGrupoId}` : ''}` : undefined,
                }
              ]
            : [
                { label: "Turnos", path: "/turnos" },
                {
                  label: "Evaluaciones",
                  path: turnoId ? `/turnos/${turnoId}/evaluaciones` : undefined,
                }
              ]
          ),
          { label: "Detalle" }
        ]}
        showHome={true}
      />

      <div className="space-y-6 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Detalle de Evaluación
          </h1>

          {/* Status indicator */}
          {!isLoading && !error && lastUpdated && (
            <div className="flex items-center text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-600">
                Última actualización: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="min-h-[300px] transition-all duration-300">
          {isLoading ? (
            <SkeletonLoader />
          ) : error || !evaluacion ? (
            <ErrorDisplay
              title="No pudimos cargar los detalles de la evaluación"
              message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
              onRetry={() => window.location.reload()}
              showHeader={false}
            />
          ) : (
            <>
              <EvaluacionHeader evaluacion={evaluacion} />
              <CalificacionesTable calificaciones={evaluacion.calificaciones} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EvaluacionDetallePage;
