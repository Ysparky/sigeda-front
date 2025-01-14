import { useState } from "react";

interface Maniobra {
  id: number;
  nombre: string;
  descripcion: string;
  requerido: boolean;
}

interface SeleccionarManiobrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (selectedManiobras: Maniobra[]) => void;
  maniobras: Maniobra[];
}

export function SeleccionarManiobrasModal({
  isOpen,
  onClose,
  onAccept,
  maniobras,
}: SeleccionarManiobrasModalProps) {
  const [selectedManiobras, setSelectedManiobras] = useState<Set<number>>(
    new Set()
  );

  if (!isOpen) return null;

  const handleToggleManiobra = (maniobraId: number) => {
    const newSelected = new Set(selectedManiobras);
    if (newSelected.has(maniobraId)) {
      newSelected.delete(maniobraId);
    } else {
      newSelected.add(maniobraId);
    }
    setSelectedManiobras(newSelected);
  };

  const handleAccept = () => {
    const selectedManiobrasList = maniobras.filter((m) =>
      selectedManiobras.has(m.id)
    );
    onAccept(selectedManiobrasList);
  };

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

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3"></th>
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
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedManiobras.has(maniobra.id)}
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
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {maniobra.requerido ? "Sí" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Regresar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
