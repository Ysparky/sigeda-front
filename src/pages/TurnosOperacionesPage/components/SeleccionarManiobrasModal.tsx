import { useEffect, useState } from "react";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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

        <h2 className="text-xl font-bold mb-6">Seleccionar Maniobras</h2>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : maniobras.length === 0 ? (
          <div className="text-center py-8">
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
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Maniobra
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Requerido
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maniobras.map((maniobra, index) => (
                  <tr
                    key={maniobra.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={maniobra.selected}
                        onChange={() => handleToggleManiobra(maniobra.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {maniobra.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {maniobra.descripcion}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="text"
                        maxLength={1}
                        value={maniobra.requerido}
                        onChange={(e) =>
                          handleRequeridoChange(maniobra.id, e.target.value)
                        }
                        disabled={!maniobra.selected}
                        className="w-12 px-2 py-1 border border-gray-300 rounded-md 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500
                                 disabled:bg-gray-100 disabled:text-gray-400
                                 uppercase"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center space-x-3 mt-6">
          <p className="text-sm text-gray-500">
            {!isAcceptEnabled && maniobras.some((m) => m.selected) && (
              <span className="text-red-500">
                * Complete el campo Requerido para todas las maniobras
                seleccionadas
              </span>
            )}
          </p>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Regresar
            </button>
            <button
              type="button"
              onClick={() => onAccept(maniobras.filter((m) => m.selected))}
              disabled={!isAcceptEnabled}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200
                        ${
                          isAcceptEnabled
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
