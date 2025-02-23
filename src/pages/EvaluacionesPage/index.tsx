import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useAuth } from "../../contexts/auth";
import { evaluacionesService } from "../../services/evaluaciones.service";
import { EvaluacionesList } from "./components/EvaluacionesList";
import { SearchFilter } from "./components/SearchFilter";
import type { Evaluacion, FilterOption } from "./types";

function EvaluacionesPage() {
  const { turnoId, subfaseId } = useParams();
  const { userInfo } = useAuth();
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<FilterOption>("fecha");

  useEffect(() => {
    const loadEvaluaciones = async () => {
      if (!turnoId || !userInfo) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await evaluacionesService.getEvaluacionesByPersonaAndTurno(
          {
            personaId: userInfo.codigo,
            turnoId: turnoId,
          }
        );
        setEvaluaciones(data);
      } catch (err) {
        setError("Error al cargar las evaluaciones");
        console.error("Error loading evaluaciones:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvaluaciones();
  }, [turnoId, userInfo]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Módulos", path: "/" },
          { label: "Turnos", path: `/subfase/${subfaseId}/turnos` },
          { label: "Evaluaciones" },
        ]}
      />

      {error ? (
        <ErrorDisplay
          title="No pudimos cargar las evaluaciones"
          message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
          onRetry={() => window.location.reload()}
          showHeader={false}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Evaluaciones</h1>
          </div>

          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterBy={filterBy}
            onFilterChange={setFilterBy}
          />

          <EvaluacionesList evaluaciones={evaluaciones} />
        </>
      )}
    </div>
  );
}

export default EvaluacionesPage;
