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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
      setLastUpdated(new Date());
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
      showNotification("Turno eliminado exitosamente", "success");
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

  // Filter turnos based on search term
  const filteredTurnos = turnos.filter((turno) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase().trim();
    return (
      turno.nombre.toLowerCase().includes(searchLower) ||
      turno.subfase.toLowerCase().includes(searchLower) ||
      turno.programa.toLowerCase().includes(searchLower)
    );
  });

  // Sort turnos based on sortBy option
  const sortedTurnos = [...filteredTurnos].sort((a, b) => {
    switch (sortBy) {
      case "alfabetico":
        return a.nombre.localeCompare(b.nombre);
      case "fecha":
        return (
          new Date(b.fechaEval).getTime() - new Date(a.fechaEval).getTime()
        );
      case "maniobras":
        return b.cantManiobra - a.cantManiobra;
      default:
        return 0;
    }
  });

  // Check if we have any active filters
  const hasActiveFilters = searchTerm.trim() !== "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Inicio", path: "/" },
            { label: "Módulos", path: "/" },
            { label: "Programación de Turnos" },
          ]}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Programación de Turnos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los turnos de evaluación del programa
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {!isLoading && !error && lastUpdated && (
              <div className="flex items-center text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                <span className="text-gray-600">
                  Última actualización: {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            )}
            <TurnosActions onNewTurno={() => setIsModalOpen(true)} />
          </div>
        </div>

        <SearchSort
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalResults={sortedTurnos.length}
        />

        <div className="min-h-[300px] transition-all duration-300">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <ErrorDisplay
              title="No pudimos cargar los turnos"
              message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
              onRetry={() => loadTurnos(currentPage)}
              showHeader={false}
            />
          ) : sortedTurnos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasActiveFilters
                  ? "No se encontraron turnos con ese criterio"
                  : "No hay turnos programados"}
              </h3>
              <p className="text-gray-500 mb-4">
                {hasActiveFilters
                  ? "Intenta con otros términos de búsqueda o limpia los filtros"
                  : "Crea un nuevo turno para comenzar"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <TurnosList
                  turnos={sortedTurnos}
                  onModifyTurno={handleModifyTurno}
                  onDeleteTurno={handleDeleteTurno}
                  onClickTurno={handleTurnoClick}
                />

                {totalPages > 1 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl animate-fade-in">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ¿Está seguro de eliminar este turno?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setTurnoToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
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
