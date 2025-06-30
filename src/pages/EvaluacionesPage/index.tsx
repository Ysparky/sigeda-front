import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { useAuth } from "../../contexts/auth";
import { useAlumnos } from "../../contexts/data/AlumnosContext";
import { useRoles } from "../../hooks/useRoles";
import { evaluacionesService } from "../../services/evaluaciones.service";
import { turnosService } from "../../services/turnos.service";
import { EvaluacionesList } from "./components/EvaluacionesList";
import { RegistrarEvaluacionModal } from "./components/RegistrarEvaluacionModal";
import { SearchFilter } from "./components/SearchFilter";
import { SkeletonLoader } from "./components/SkeletonLoader";
import type { Evaluacion, FilterOption } from "./types";

function EvaluacionesPage() {
  const { turnoId } = useParams();
  const [searchParams] = useSearchParams();
  const alumnoId = searchParams.get("alumno");
  
  const { userInfo } = useAuth();
  const { isInstructor, isAlumno } = useRoles();
  const { getAlumnoById } = useAlumnos();
  const alumno = alumnoId ? getAlumnoById(alumnoId) : undefined;
  
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [turnoNombre, setTurnoNombre] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<FilterOption>("fecha");
  const [isRegistrarModalOpen, setIsRegistrarModalOpen] = useState(false);

  // Determine which personaId to use based on role
  const getPersonaId = useCallback(() => {
    if (isInstructor && alumnoId) {
      return alumnoId;
    }
    
    if (isAlumno && userInfo) {
      return userInfo.codigo;
    }
    
    return null;
  }, [isInstructor, isAlumno, alumnoId, userInfo]);

  // Load evaluaciones data
  const loadData = useCallback(async () => {
    if (!turnoId || !userInfo) return;
    
    const personaId = getPersonaId();
    if (!personaId) {
      setError("No se pudo determinar el alumno");
      setIsLoading(false);
      return;
    }

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

      const data = await evaluacionesService.getEvaluacionesByFilter({
        personaId,
        property: filterBy,
        idTurno: parseInt(turnoId),
      });
      setEvaluaciones(data);
    } catch (err) {
      console.error("Error loading evaluaciones:", err);
      setError("Error al cargar las evaluaciones");
    } finally {
      setIsLoading(false);
    }
  }, [turnoId, userInfo, getPersonaId, filterBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (newFilter: FilterOption) => {
    setFilterBy(newFilter);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterBy("fecha");
  };

  const filteredEvaluaciones = useMemo(() => {
    return evaluaciones.filter((evaluacion) => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        evaluacion.nombre.toLowerCase().includes(searchTermLower) ||
        evaluacion.alumno.toLowerCase().includes(searchTermLower) ||
        evaluacion.evaluador.toLowerCase().includes(searchTermLower)
      );
    });
  }, [evaluaciones, searchTerm]);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Turnos", path: "/turnos" },
          { label: turnoNombre || "Turno", path: `/turnos/${turnoId}` },
          {
            label: alumno ? `Evaluaciones de ${alumno.nombre}` : "Evaluaciones",
            path: "#",
          },
        ]}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {alumno ? `Evaluaciones de ${alumno.nombre}` : "Evaluaciones"}
        </h1>
        {isInstructor && alumnoId && turnoId && (
          <button
            onClick={() => setIsRegistrarModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Nueva Evaluación
          </button>
        )}
      </div>

      <SearchFilter
        searchTerm={searchTerm}
        filterBy={filterBy}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
      />

      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <EvaluacionesList
          evaluaciones={filteredEvaluaciones}
          searchTerm={searchTerm}
          filterBy={filterBy}
          hasFilters={searchTerm !== "" || filterBy !== "fecha"}
          onClearFilters={handleClearFilters}
        />
      )}

      {isInstructor && alumnoId && turnoId && (
        <RegistrarEvaluacionModal
          isOpen={isRegistrarModalOpen}
          onClose={() => setIsRegistrarModalOpen(false)}
          onEvaluacionCreated={loadData}
          turnoId={parseInt(turnoId)}
          alumnoId={alumnoId}
        />
      )}
    </div>
  );
}

export default EvaluacionesPage;
