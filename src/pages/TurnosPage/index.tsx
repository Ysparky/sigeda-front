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

        let data: TurnoResponse[] = [];
        const logParams = {
          idGrupo: userInfo.idGrupo,
          subfaseId: subfaseIdToUse,
          programa: "PDI",
        };

        // Determine which endpoint to use based on user role and filters
        if (isAlumno) {
          console.log("Fetching turnos for alumno with params:", logParams);
          data = await turnosService.getTurnosByGrupo(
            userInfo.idGrupo,
            subfaseIdToUse || undefined
          );
        } else if (subfaseId) {
          console.log("Fetching turnos for instructor with params:", { subfaseId, userInfo });
          data = await turnosService.getTurnosBySubFase(subfaseId, userInfo);
        }

        console.log("Turnos loaded successfully:", { count: data.length });
        setTurnos(data);
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
    [subfaseId, userInfo, isAlumno, selectedSubfaseId]
  );

  // Initial load
  useEffect(() => {
    if (initialLoadRef.current) {
      loadTurnos();
      initialLoadRef.current = false;
    }
  }, [loadTurnos]);

  // Handle filter change from the FaseSubfaseFilter component
  const handleFilterChange = useCallback(
    (subfaseId: number | null) => {
      // Save current scroll position
      const scrollPosition = window.scrollY;

      setSelectedSubfaseId(subfaseId);

      // Only reload the turnos section, not the entire page
      loadTurnos(subfaseId);

      // Scroll to the turnos container after loading
      setTimeout(() => {
        if (turnosContainerRef.current) {
          window.scrollTo({
            top: scrollPosition,
            behavior: "auto",
          });
        }
      }, 100);
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
              onClearFilters={handleClearFilters}
            />
          ) : (
            <TurnosList turnos={filteredTurnos} />
          )}
        </div>
      </div>
    </div>
  );
}

export default TurnosPage;
