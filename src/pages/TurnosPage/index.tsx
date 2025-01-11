import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useData } from "../../contexts/DataContext";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { turnosService } from "../../services/turnos.service";
import type { TurnoResponse, SortOption } from "./types";
import { TurnosList } from "./components/TurnosList";
import { SearchSort } from "./components/SearchSort";
import { EmptyState } from "./components/EmptyState";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";

function TurnosPage() {
  const { subFaseId } = useParams();
  const { userInfo } = useData();
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("fecha");

  useEffect(() => {
    const loadTurnos = async () => {
      if (!subFaseId || !userInfo) {
        console.log("Missing data:", { subFaseId, userInfo });
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching turnos with:", { subFaseId, userInfo });
        const data = await turnosService.getTurnosBySubFase(
          subFaseId,
          userInfo
        );
        console.log("Turnos loaded:", data);
        setTurnos(data);
      } catch (err) {
        console.error("Error loading turnos:", err);
        setError("Error al cargar los turnos");
      } finally {
        setIsLoading(false);
      }
    };

    loadTurnos();
  }, [subFaseId, userInfo]);

  const renderContent = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error) {
      return (
        <ErrorDisplay
          title="No pudimos cargar los turnos"
          message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
          onRetry={() => window.location.reload()}
          showHeader={true}
        >
          <Breadcrumb
            items={[{ label: "Módulos", path: "/" }, { label: "Turnos" }]}
          />
        </ErrorDisplay>
      );
    }
    if (turnos.length === 0) return <EmptyState />;

    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Turnos Disponibles
        </h1>
        <SearchSort
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <TurnosList turnos={turnos} />
      </>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[{ label: "Módulos", path: "/" }, { label: "Turnos" }]}
      />
      {renderContent()}
    </div>
  );
}

export default TurnosPage;
