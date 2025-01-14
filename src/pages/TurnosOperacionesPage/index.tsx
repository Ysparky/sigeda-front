import { useEffect, useState } from "react";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { operacionesTurnosService } from "../../services/operacionesTurnos.service";
import { TurnoDetalle } from "../../types/turno.types";
import { SearchSort } from "../TurnosPage/components/SearchSort";
import type { SortOption, TurnoResponse } from "../TurnosPage/types";
import { Pagination } from "./components/Pagination";
import { RegistrarTurnoModal } from "./components/RegistrarTurnoModal";
import { TurnosActions } from "./components/TurnosActions";
import { TurnosList } from "./components/TurnosList";

function TurnosOperacionesPage() {
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("fecha");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(9);

  const loadTurnos = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await operacionesTurnosService.getAllTurnos({
        page,
        size: pageSize,
      });
      setTurnos(data.content);
      setTotalPages(data.totalPages);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error al cargar los turnos", err);
      setError("Error al cargar los turnos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTurnos(0);
  }, []);

  const handlePageChange = (newPage: number) => {
    loadTurnos(newPage);
  };

  const handleModifyTurno = (turno: TurnoResponse) => {
    // TODO: Implement modify functionality
    console.log("Modify turno:", turno);
  };

  const handleDeleteTurno = (turno: TurnoResponse) => {
    // TODO: Implement delete functionality
    console.log("Delete turno:", turno);
  };

  const handleTurnoCreated = (newTurno: TurnoDetalle) => {
    const turnoResponse: TurnoResponse = {
      id: newTurno.id,
      nombre: newTurno.nombre,
      fase: newTurno.fase,
      fechaEval: newTurno.fechaEval,
      programa: newTurno.programa,
      cantGrupo: newTurno.cantGrupo,
      cantManiobra: newTurno.cantManiobra,
    };

    setTurnos((prev) => [...prev, turnoResponse]);
    loadTurnos(0); // Refresh the first page after creating a new turno
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: "Módulos", path: "/" },
          { label: "Programación de Turnos" },
        ]}
      />

      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Programación de Turnos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los turnos de evaluación del programa
            </p>
          </div>
          <TurnosActions onNewTurno={() => setIsModalOpen(true)} />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <SearchSort
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {error ? (
            <ErrorDisplay
              title="No pudimos cargar los turnos"
              message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
              onRetry={() => loadTurnos(currentPage)}
              showHeader={false}
            />
          ) : (
            <>
              <div className="mt-6">
                <TurnosList
                  turnos={turnos}
                  onModifyTurno={handleModifyTurno}
                  onDeleteTurno={handleDeleteTurno}
                />
              </div>
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <RegistrarTurnoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTurnoCreated={handleTurnoCreated}
      />
    </div>
  );
}

export default TurnosOperacionesPage;
