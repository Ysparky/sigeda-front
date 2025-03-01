import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useAuth } from "../../contexts/auth";
import { useRoles } from "../../hooks/useRoles";
import { turnosService } from "../../services/turnos.service";
import { EmptyState } from "./components/EmptyState";
import { FaseSubfaseFilter } from "./components/FaseSubfaseFilter";
import { SearchSort } from "./components/SearchSort";
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

        // If we're an Alumno and have a selected subfase, use the filter endpoint
        if (isAlumno && subfaseIdToUse) {
          console.log("Fetching filtered turnos with:", {
            subfaseId: subfaseIdToUse,
            programa: "PDI",
            idGrupo: userInfo.idGrupo,
          });
          const data = await turnosService.getTurnosByFilter(
            subfaseIdToUse,
            "PDI",
            userInfo.idGrupo
          );
          console.log("Filtered turnos loaded:", data);
          setTurnos(data);
        }
        // If we're an Alumno without a subfase filter, use the direct grupo endpoint
        else if (isAlumno) {
          console.log("Fetching turnos by grupo:", userInfo.idGrupo);
          const data = await turnosService.getTurnosByGrupo(userInfo.idGrupo);
          console.log("Turnos by grupo loaded:", data);
          setTurnos(data);
        }
        // Otherwise use the original subfase endpoint
        else if (subfaseId) {
          console.log("Fetching turnos with:", { subfaseId, userInfo });
          const data = await turnosService.getTurnosBySubFase(
            subfaseId,
            userInfo
          );
          console.log("Turnos loaded:", data);
          setTurnos(data);
        }
      } catch (err) {
        console.error("Error loading turnos:", err);
        setError("Error al cargar los turnos");
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

  const renderTurnosList = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error) {
      return (
        <ErrorDisplay
          title="No pudimos cargar los turnos"
          message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
          onRetry={() => loadTurnos()}
          showHeader={false}
        />
      );
    }
    if (turnos.length === 0) return <EmptyState />;

    return <TurnosList turnos={filteredTurnos} />;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[{ label: "Módulos", path: "/" }, { label: "Turnos" }]}
      />
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Turnos Disponibles
        </h1>
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
        />
        <div ref={turnosContainerRef}>{renderTurnosList()}</div>
      </div>
    </div>
  );
}

export default TurnosPage;
