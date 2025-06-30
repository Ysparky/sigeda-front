import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { useAlumnos } from "../../contexts/data/AlumnosContext";
import { useRoles } from "../../hooks/useRoles";
import { turnosService } from "../../services/turnos.service";
import { EmptyState } from "../TurnosPage/components/EmptyState";
import { SearchSort } from "../TurnosPage/components/SearchSort";
import { SkeletonLoader } from "../TurnosPage/components/SkeletonLoader";
import type { SortOption, TurnoResponse } from "../TurnosPage/types";

const ITEMS_PER_PAGE = 10;

function TurnosInstructorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryIdGrupo = searchParams.get("idGrupo") ? parseInt(searchParams.get("idGrupo")!) : null;
  const queryAlumnoId = searchParams.get("alumno");
  
  const { isInstructor } = useRoles();
  const { getAlumnoById } = useAlumnos();
  const alumno = queryAlumnoId ? getAlumnoById(queryAlumnoId) : undefined;
  
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("fecha");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

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

      const paginationParams = {
        page: currentPage,
        size: ITEMS_PER_PAGE
      };
      
      console.log("Instructor fetching turnos for grupo:", queryIdGrupo);
      const response = await turnosService.getTurnosByGrupo(
        queryIdGrupo,
        undefined,
        paginationParams
      );
      console.log("Turnos loaded successfully:", {
        count: response.content.length,
        total: response.totalElements,
        page: response.number + 1,
        pages: response.totalPages
      });

      setTurnos(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err) {
      console.error("Error loading turnos:", err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Error al cargar los turnos";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [queryIdGrupo, currentPage]);

  // Initial load
  useEffect(() => {
    if (initialLoadRef.current && queryIdGrupo) {
      console.log("Initial load, loading turnos for grupo:", queryIdGrupo);
      loadTurnos();
      initialLoadRef.current = false;
    }
  }, [loadTurnos, queryIdGrupo]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    // Save current scroll position
    const scrollPosition = window.scrollY;

    // Scroll to the turnos container after loading
    setTimeout(() => {
      if (turnosContainerRef.current) {
        window.scrollTo({
          top: scrollPosition,
          behavior: "auto",
        });
      }
    }, 100);
  }, []);

  // Reload when page changes
  useEffect(() => {
    if (!initialLoadRef.current) {
      loadTurnos();
    }
  }, [currentPage, loadTurnos]);

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
          { label: "Turnos de Alumno" }
        ]} 
        showHome={true}
      />

      <div className="space-y-6 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Turnos de Alumno: {alumno ? `${alumno.nombre} ${alumno.aPaterno} ${alumno.aMaterno}` : queryAlumnoId}
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
          totalResults={totalElements}
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
              {filteredTurnos.map((turno) => (
                <div
                  key={turno.id}
                  className="turno-card animate-fade-in opacity-0"
                  style={{ animationFillMode: "forwards" }}
                  onClick={() => {
                    navigate(`/turnos/${turno.id}/evaluaciones?alumno=${queryAlumnoId}&sourceGrupoId=${queryIdGrupo}`);
                  }}
                >
                  <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 cursor-pointer 
                            transform hover:-translate-y-1 border border-gray-100 hover:border-blue-100 h-full
                            relative overflow-hidden group">
                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

                    <div className="flex justify-between items-start mb-4 relative">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                          {turno.nombre}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Programa: <span className="font-medium">{turno.programa}</span>
                        </p>
                      </div>
                      <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        {new Date(turno.fechaEval).toLocaleDateString('es-ES')}
                      </span>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-500">
                          <svg
                            className="w-4 h-4 mr-1 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <span className="font-medium">{turno.cantGrupo}</span>&nbsp;
                          {turno.cantGrupo === 1 ? "grupo" : "grupos"}
                        </div>
                        <div className="flex items-center text-gray-500">
                          <svg
                            className="w-4 h-4 mr-1 text-indigo-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                            />
                          </svg>
                          <span className="font-medium">{turno.cantManiobra}</span>&nbsp;
                          {turno.cantManiobra === 1 ? "maniobra" : "maniobras"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <span className="inline-flex items-center text-sm text-blue-600 group-hover:text-blue-800 transition-colors duration-300">
                        Ver evaluaciones
                        <svg
                          className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <nav className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 0}
                      className="px-3 py-1 rounded-md border border-gray-300 
                               disabled:opacity-50 disabled:cursor-not-allowed
                               hover:bg-gray-50 transition-colors duration-200"
                    >
                      Anterior
                    </button>
                    
                    <span className="text-sm text-gray-700">
                      Página {currentPage + 1} de {totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages - 1}
                      className="px-3 py-1 rounded-md border border-gray-300
                               disabled:opacity-50 disabled:cursor-not-allowed
                               hover:bg-gray-50 transition-colors duration-200"
                    >
                      Siguiente
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TurnosInstructorPage; 