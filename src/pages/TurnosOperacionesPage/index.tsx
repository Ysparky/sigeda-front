import { useEffect, useState } from "react";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Snackbar } from "../../components/common/Snackbar";
import { operacionesTurnosService } from "../../services/operacionesTurnos.service";
import { turnosService } from "../../services/turnos.service";
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
  const [turnoToDelete, setTurnoToDelete] = useState<TurnoResponse | null>(
    null
  );
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "view" | "edit">(
    "create"
  );

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
    setSelectedTurno(turno.id);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleDeleteTurno = async (turno: TurnoResponse) => {
    setTurnoToDelete(turno);
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
  };

  const confirmDelete = async () => {
    if (!turnoToDelete) return;

    try {
      await turnosService.deleteTurno(turnoToDelete.id);
      setTurnos(turnos.filter((t) => t.id !== turnoToDelete.id));
    } catch (err) {
      console.error("Error deleting turno:", err);
      if (err instanceof Error) {
        if (err.message.includes("403")) {
          showNotification(
            "No tiene permisos para realizar esta acción",
            "error"
          );
        } else if (err.message.includes("404")) {
          showNotification("El turno especificado no existe", "error");
        } else {
          showNotification("Error al eliminar el turno", "error");
        }
      }
    } finally {
      setTurnoToDelete(null);
    }
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
      subfase: newTurno.subfase,
    };

    setTurnos((prev) => [...prev, turnoResponse]);
    showNotification("Turno creado exitosamente", "success");
    setIsModalOpen(false);
  };

  const handleTurnoClick = (turno: TurnoResponse) => {
    setSelectedTurno(turno.id);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const handleTurnoUpdated = (changes: string[]) => {
    console.log("changes", changes);
    showNotification("Turno actualizado exitosamente", "success");
    loadTurnos(currentPage);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: "Módulos", path: "/" },
          { label: "Programación de Turnos" },
        ]}
        showHome={true}
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
            totalResults={turnos.length}
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
                  onClickTurno={handleTurnoClick}
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
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTurno(null);
        }}
        onTurnoCreated={handleTurnoCreated}
        onTurnoUpdated={handleTurnoUpdated}
        turnoId={selectedTurno ?? undefined}
        mode={selectedTurno ? modalMode : "create"}
        showNotification={showNotification}
      />

      {turnoToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ¿Está seguro de eliminar este turno?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setTurnoToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <Snackbar
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default TurnosOperacionesPage;
