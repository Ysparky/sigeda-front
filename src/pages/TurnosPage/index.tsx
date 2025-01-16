import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";
import { turnosService } from "../../services/turnos.service";
import { EmptyState } from "./components/EmptyState";
import { SearchSort } from "./components/SearchSort";
import { TurnosList } from "./components/TurnosList";
import type { SortOption, TurnoResponse } from "./types";

function TurnosPage() {
  const { subfaseId } = useParams();
  const { userInfo } = useAuth();
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("fecha");

  useEffect(() => {
    const loadTurnos = async () => {
      if (!subfaseId || !userInfo) {
        console.log("Missing data:", { subfaseId, userInfo });
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching turnos with:", { subfaseId, userInfo });
        const data = await turnosService.getTurnosBySubFase(
          subfaseId,
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
  }, [subfaseId, userInfo]);

  const renderContent = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error) {
      return (
        <ErrorDisplay
          title="No pudimos cargar los turnos"
          message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
          onRetry={() => window.location.reload()}
          showHeader={false}
        />
      );
    }
    if (turnos.length === 0) return <EmptyState />;

    return (
      <div className="space-y-8">
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
      </div>
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
