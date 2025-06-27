import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { useAuth } from "../../contexts/auth";
import { useRoles } from "../../hooks/useRoles";
import { turnosService } from "../../services/turnos.service";
import { EmptyState } from "./components/EmptyState";
import { FaseSubfaseFilter } from "./components/FaseSubfaseFilter";
import { SearchSort } from "./components/SearchSort";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { TurnosList } from "./components/TurnosList";
import type { SortOption, TurnoResponse } from "./types";

const ITEMS_PER_PAGE = 10;

function TurnosPage() {
  const { subfaseId } = useParams();
  
  const { userInfo } = useAuth();
  const { isAlumno } = useRoles();
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("fecha");
  const [selectedSubfaseId, setSelectedSubfaseId] = useState<number | null>(
    subfaseId ? parseInt(subfaseId) : null
  );
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Ref to track if this is the initial load
  const initialLoadRef = useRef(true);
  // Ref to track the turnos container for scroll position management
  const turnosContainerRef = useRef<HTMLDivElement>(null);

  // Load turnos based on current filters
  const loadTurnos = useCallback(
    async (subfaseIdToUse: number | null = selectedSubfaseId) => {
      if (!userInfo) {
        console.log("Missing user info");
        return;
      }

      if (!userInfo.idGrupo) {
        setError("No se encontró información del grupo");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const paginationParams = {
          page: currentPage,
          size: ITEMS_PER_PAGE
        };

        const logParams = {
          idGrupo: userInfo.idGrupo,
          subfaseId: subfaseIdToUse,
          programa: "PDI",
          ...paginationParams
        };

        let response;
        // Determine which endpoint to use based on user role and filters
        if (isAlumno) {
          console.log("Fetching turnos for alumno with params:", logParams);
          response = await turnosService.getTurnosByGrupo(
            userInfo.idGrupo,
            subfaseIdToUse || undefined,
            paginationParams
          );
        } else if (subfaseId) {
          console.log("Fetching turnos for instructor with params:", { subfaseId, userInfo });
          response = await turnosService.getTurnosBySubFase(
            subfaseId,
            userInfo,
            paginationParams
          );
        } else {
          response = {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: ITEMS_PER_PAGE,
            number: 0
          };
        }

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
    },
    [subfaseId, userInfo, isAlumno, selectedSubfaseId, currentPage]
  );

  // Initial load
  useEffect(() => {
    if (initialLoadRef.current) {
      loadTurnos();
      initialLoadRef.current = false;
    }
  }, [loadTurnos]);

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

  // Handle filter change from the FaseSubfaseFilter component
  const handleFilterChange = useCallback(
    (subfaseId: number | null) => {
      // Reset to first page when filter changes
      setCurrentPage(0);
      setSelectedSubfaseId(subfaseId);
      loadTurnos(subfaseId);
    },
    [loadTurnos]
  );

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

  // Handle clearing all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedSubfaseId(null);
    setCurrentPage(0);
    loadTurnos(null);
  }, [loadTurnos]);

  // Check if we have any active filters
  const hasActiveFilters =
    selectedSubfaseId !== null || searchTerm.trim() !== "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "Turnos" }]} showHome={true} />

      <div className="space-y-6 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Turnos Disponibles
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

        {isAlumno && (
          <FaseSubfaseFilter
            onFilterChange={handleFilterChange}
            initialSubfaseId={selectedSubfaseId}
          />
        )}

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
              onClearFilters={handleClearFilters}
            />
          ) : (
            <>
              <TurnosList turnos={filteredTurnos} />
              
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

export default TurnosPage;
