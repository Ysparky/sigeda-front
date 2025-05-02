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
import { SearchFilter } from "./components/SearchFilter";
import { SkeletonLoader } from "./components/SkeletonLoader";
import type { Evaluacion, FilterOption } from "./types";

function EvaluacionesPage() {
  const { turnoId } = useParams();
  const [searchParams] = useSearchParams();
  const alumnoId = searchParams.get("alumno");
  const sourceGrupoId = searchParams.get("sourceGrupoId");
  
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

      // Load evaluaciones
      const data = await evaluacionesService.getEvaluacionesByFilter({
        personaId,
        idTurno: parseInt(turnoId)
      });
      setEvaluaciones(data);
    } catch (err) {
      setError("Error al cargar las evaluaciones");
      console.error("Error loading evaluaciones:", err);
    } finally {
      setIsLoading(false);
    }
  }, [turnoId, userInfo, getPersonaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle clearing filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterBy("fecha");
  }, []);

  // Filter evaluaciones based on search term
  const filteredEvaluaciones = useMemo(() => {
    if (!evaluaciones.length) return [];

    if (!searchTerm.trim()) return evaluaciones;

    const searchLower = searchTerm.toLowerCase().trim();
    return evaluaciones.filter((evaluacion) => {
      switch (filterBy) {
        case "fecha":
          return evaluacion.fecha.toLowerCase().includes(searchLower);
        case "clasificacion":
          return evaluacion.clasificacion.toLowerCase().includes(searchLower);
        case "calificacion":
          return (
            evaluacion.promedio?.toLowerCase().includes(searchLower) || false
          );
        default:
          return true;
      }
    });
  }, [evaluaciones, searchTerm, filterBy]);

  // Check if we have any active filters
  const hasActiveFilters = searchTerm.trim() !== "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          ...(isInstructor && alumnoId 
            ? [
                { label: "Mi Escuadrón", path: "/mi-escuadron" },
                { label: "Turnos de Alumno", path: `/turnos/instructor?alumno=${alumnoId}${sourceGrupoId ? `&idGrupo=${sourceGrupoId}` : ''}` },
              ] 
            : [{ label: "Turnos", path: "/turnos" }]
          ),
          { label: "Evaluaciones" }
        ]}
        showHome={true}
      />

      <div className="space-y-6 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isInstructor && alumnoId 
              ? `Evaluaciones de ${alumno?.nombre}: ${turnoNombre}`
              : `Evaluaciones: ${turnoNombre}`
            }
          </h1>

          {/* Status indicator */}
          {!isLoading && !error && (
            <div className="flex items-center text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-600">
                Última actualización: {new Date().toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <SearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          totalResults={filteredEvaluaciones.length}
        />

        <div className="min-h-[300px] transition-all duration-300">
          {isLoading ? (
            <SkeletonLoader />
          ) : error ? (
            <ErrorDisplay
              title="No pudimos cargar las evaluaciones"
              message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
              onRetry={() => loadData()}
              showHeader={false}
            />
          ) : (
            <EvaluacionesList
              evaluaciones={evaluaciones}
              searchTerm={searchTerm}
              filterBy={filterBy}
              hasFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default EvaluacionesPage;
