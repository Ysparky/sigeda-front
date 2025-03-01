import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useAuth } from "../../contexts/auth";
import { evaluacionesService } from "../../services/evaluaciones.service";
import { turnosService } from "../../services/turnos.service";
import { EvaluacionesList } from "./components/EvaluacionesList";
import { SearchFilter } from "./components/SearchFilter";
import type { Evaluacion, FilterOption } from "./types";

function EvaluacionesPage() {
  const { turnoId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [turnoNombre, setTurnoNombre] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<FilterOption>("fecha");

  useEffect(() => {
    const loadData = async () => {
      if (!turnoId || !userInfo) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load turno details to get the name
        try {
          const turnoDetail = await turnosService.getTurno(parseInt(turnoId));
          setTurnoNombre(turnoDetail.nombre);
        } catch (err) {
          console.error("Error loading turno details:", err);
        }

        // Load evaluaciones
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

    loadData();
  }, [turnoId, userInfo]);

  const handleBack = () => {
    navigate("/turnos");
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Turnos", path: "/turnos" },
            { label: "Evaluaciones" },
          ]}
        />
        <div className="w-full min-h-[300px] flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Turnos", path: "/turnos" },
            { label: "Evaluaciones" },
          ]}
        />
        <ErrorDisplay
          title="No pudimos cargar las evaluaciones"
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
          { label: "Turnos", path: "/turnos" },
          { label: "Evaluaciones" },
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
          Volver a Turnos
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Evaluaciones: {turnoNombre}
        </h1>
      </div>

      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterBy={filterBy}
        onFilterChange={setFilterBy}
      />

      <EvaluacionesList
        evaluaciones={evaluaciones}
        searchTerm={searchTerm}
        filterBy={filterBy}
      />
    </div>
  );
}

export default EvaluacionesPage;
