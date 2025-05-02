import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { useRoles } from "../../hooks/useRoles";
import { turnosService } from "../../services/turnos.service";
import { EmptyState } from "../TurnosPage/components/EmptyState";
import { SearchSort } from "../TurnosPage/components/SearchSort";
import { SkeletonLoader } from "../TurnosPage/components/SkeletonLoader";
import { TurnosList } from "../TurnosPage/components/TurnosList";
import type { SortOption, TurnoResponse } from "../TurnosPage/types";

function TurnosInstructorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryIdGrupo = searchParams.get("idGrupo") ? parseInt(searchParams.get("idGrupo")!) : null;
  const queryAlumnoId = searchParams.get("alumno");
  
  const { isInstructor } = useRoles();
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("fecha");

  // Ref to track if this is the initial load
  const initialLoadRef = useRef(true);
  // Ref to track the turnos container for scroll position management
  const turnosContainerRef = useRef<HTMLDivElement>(null);

  // Redirect if not an instructor or missing required params
  useEffect(() => {
    if (!isInstructor) {
      navigate("/turnos");
      return;
    }
    
    if (!queryIdGrupo || !queryAlumnoId) {
      navigate("/mi-escuadron");
      return;
    }
  }, [isInstructor, queryIdGrupo, queryAlumnoId, navigate]);

  // Load turnos for the specific alumno
  const loadTurnos = useCallback(async () => {
    if (!queryIdGrupo) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Instructor fetching turnos for grupo:", queryIdGrupo);
      const data = await turnosService.getTurnosByGrupo(queryIdGrupo);
      console.log("Turnos for specific alumno loaded:", data);
      setTurnos(data);
    } catch (err) {
      console.error("Error loading turnos:", err);
      setError("Error al cargar los turnos");
    } finally {
      setIsLoading(false);
    }
  }, [queryIdGrupo]);

  // Initial load
  useEffect(() => {
    if (initialLoadRef.current && queryIdGrupo) {
      console.log("Initial load, loading turnos for grupo:", queryIdGrupo);
      loadTurnos();
      initialLoadRef.current = false;
    }
  }, [loadTurnos, queryIdGrupo]);

  // Filter and sort turnos based on search term and sort option
  const filteredTurnos = useMemo(() => {
    if (!turnos.length) return [];

    // First filter by search term
    let filtered = turnos;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = turnos.filter(
        (turno) =>
          turno.nombre.toLowerCase().includes(searchLower) ||
          turno.subfase.toLowerCase().includes(searchLower)
      );
    }

    // Then sort
    return [...filtered].sort((a, b) => {
      if (sortBy === "alfabetico") {
        return a.nombre.localeCompare(b.nombre);
      } else if (sortBy === "fecha") {
        return (
          new Date(b.fechaEval).getTime() - new Date(a.fechaEval).getTime()
        );
      } else if (sortBy === "maniobras") {
        return b.cantManiobra - a.cantManiobra;
      }
      return 0;
    });
  }, [turnos, searchTerm, sortBy]);

  // Handle back button
  const handleBackToEscuadron = () => {
    navigate("/mi-escuadron");
  };

  // Check if we have any active filters
  const hasActiveFilters = searchTerm.trim() !== "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb 
        items={[
          { label: "Mi Escuadrón", path: "/mi-escuadron" },
          { label: `Turnos de Alumno: ${queryAlumnoId}`, path: "" }
        ]} 
      />

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Turnos de Alumno: {queryAlumnoId}
          </h1>

          <button
            onClick={handleBackToEscuadron}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <span className="mr-1">←</span> Volver a Mi Escuadrón
          </button>
        </div>

        <SearchSort
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalResults={filteredTurnos.length}
        />

        <div
          ref={turnosContainerRef}
          className="min-h-[300px] transition-all duration-300"
        >
          {isLoading ? (
            <SkeletonLoader />
          ) : error ? (
            <ErrorDisplay
              title="No pudimos cargar los turnos"
              message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
              onRetry={() => loadTurnos()}
              showHeader={false}
            />
          ) : turnos.length === 0 || filteredTurnos.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters}
              onClearFilters={() => setSearchTerm("")}
            />
          ) : (
            <TurnosList turnos={filteredTurnos} />
          )}
        </div>
      </div>
    </div>
  );
}

export default TurnosInstructorPage; 