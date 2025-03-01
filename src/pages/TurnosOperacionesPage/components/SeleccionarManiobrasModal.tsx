import { useEffect, useState } from "react";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { Portal } from "../../../components/common/Portal";
import {
  maniobrasService,
  type Maniobra,
} from "../../../services/maniobras.service";

export interface ManiobraSeleccionada extends Maniobra {
  selected: boolean;
  requerido: string;
}

interface SeleccionarManiobrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (selectedManiobras: ManiobraSeleccionada[]) => void;
  subfaseId: number;
  currentSelections?: ManiobraSeleccionada[];
}

export function SeleccionarManiobrasModal({
  isOpen,
  onClose,
  onAccept,
  subfaseId,
  currentSelections = [],
}: SeleccionarManiobrasModalProps) {
  const [maniobras, setManiobras] = useState<ManiobraSeleccionada[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadManiobras = async () => {
      if (!subfaseId) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await maniobrasService.getManiobrasBySubFase(subfaseId);

        const mergedManiobras = data.map((maniobra) => {
          const existingSelection = currentSelections.find(
            (s) => s.id === maniobra.id
          );
          return (
            existingSelection || { ...maniobra, selected: false, requerido: "" }
          );
        });

        setManiobras(mergedManiobras);
      } catch (err) {
        if (err instanceof Error && err.message.includes("404")) {
          setManiobras([]);
        } else {
          setError("Error al cargar las maniobras");
          console.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadManiobras();
    }
  }, [isOpen, subfaseId, currentSelections]);

  const handleToggleManiobra = (maniobraId: number) => {
    setManiobras((prev) =>
      prev.map((m) => {
        if (m.id === maniobraId) {
          return {
            ...m,
            selected: !m.selected,
            requerido: !m.selected ? m.requerido : "",
          };
        }
        return m;
      })
    );
  };

  const handleRequeridoChange = (maniobraId: number, value: string) => {
    setManiobras((prev) =>
      prev.map((m) => {
        if (m.id === maniobraId) {
          return { ...m, requerido: value.toUpperCase() };
        }
        return m;
      })
    );
  };

  const isAcceptEnabled =
    maniobras.every(
      (m) => !m.selected || (m.selected && m.requerido.trim() !== "")
    ) && maniobras.some((m) => m.selected);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-lg w-full max-w-5xl p-8 relative animate-fade-in overflow-y-auto max-h-[90vh] shadow-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
            Seleccionar Maniobras
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          ) : maniobras.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hay maniobras
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No se encontraron maniobras para esta subfase
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">
                  Seleccione las maniobras y especifique el valor requerido para
                  cada una
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Total: {maniobras.length}
                  </span>
                  <span className="text-sm text-blue-600">
                    Seleccionadas: {maniobras.filter((m) => m.selected).length}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
                        <span className="sr-only">Seleccionar</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Maniobra
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requerido
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {maniobras.map((maniobra, index) => (
                      <tr
                        key={maniobra.id}
                        className={`${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-blue-50 transition-colors duration-150`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={maniobra.selected}
                            onChange={() => handleToggleManiobra(maniobra.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {maniobra.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {maniobra.descripcion}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="relative">
                            <input
                              type="text"
                              maxLength={1}
                              value={maniobra.requerido}
                              onChange={(e) =>
                                handleRequeridoChange(
                                  maniobra.id,
                                  e.target.value
                                )
                              }
                              disabled={!maniobra.selected}
                              className={`w-12 px-2 py-1 border rounded-md 
                                       focus:outline-none focus:ring-2 focus:ring-blue-500
                                       transition-all duration-200 uppercase
                                       ${
                                         !maniobra.selected
                                           ? "bg-gray-100 text-gray-400 border-gray-300"
                                           : maniobra.requerido
                                           ? "border-green-300 bg-green-50"
                                           : "border-gray-300"
                                       }`}
                            />
                            {maniobra.selected && maniobra.requerido && (
                              <span className="absolute right-0 top-1/2 transform -translate-y-1/2 -translate-x-4">
                                <svg
                                  className="h-4 w-4 text-green-500"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center space-x-3 mt-6 pt-4 border-t">
            <p className="text-sm text-gray-500">
              {!isAcceptEnabled && maniobras.some((m) => m.selected) && (
                <span className="text-red-500 flex items-center">
                  <svg
                    className="h-4 w-4 mr-1 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Complete el campo Requerido para todas las maniobras
                  seleccionadas
                </span>
              )}
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onAccept(maniobras.filter((m) => m.selected))}
                disabled={!isAcceptEnabled}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 flex items-center
                          ${
                            isAcceptEnabled
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-gray-400 cursor-not-allowed"
                          }`}
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
