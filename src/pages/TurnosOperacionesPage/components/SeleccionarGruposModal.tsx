import { useState } from "react";

interface Alumno {
  id: number;
  nombre: string;
}

interface Grupo {
  id: number;
  nombre: string;
  alumnos: Alumno[];
}

interface SeleccionarGruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (selectedGrupos: Grupo[]) => void;
  grupos: Grupo[];
}

export function SeleccionarGruposModal({
  isOpen,
  onClose,
  onAccept,
  grupos,
}: SeleccionarGruposModalProps) {
  const [selectedGrupos, setSelectedGrupos] = useState<Set<number>>(new Set());
  const [instructores, setInstructores] = useState<Record<number, string>>({});

  if (!isOpen) return null;

  const handleToggleGrupo = (grupoId: number) => {
    const newSelected = new Set(selectedGrupos);
    if (newSelected.has(grupoId)) {
      newSelected.delete(grupoId);
    } else {
      newSelected.add(grupoId);
    }
    setSelectedGrupos(newSelected);
  };

  const handleInstructorChange = (grupoId: number, instructor: string) => {
    setInstructores((prev) => ({
      ...prev,
      [grupoId]: instructor,
    }));
  };

  const handleAccept = () => {
    const selectedGruposList = grupos
      .filter((g) => selectedGrupos.has(g.id))
      .map((g) => ({
        ...g,
        instructor: instructores[g.id] || "",
      }));
    onAccept(selectedGruposList);
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

        <h2 className="text-xl font-bold mb-6">Seleccionar Grupos</h2>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Grupo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Alumnos
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Instructor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grupos.map((grupo, index) => (
                <tr
                  key={grupo.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedGrupos.has(grupo.id)}
                      onChange={() => handleToggleGrupo(grupo.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {grupo.nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <ul className="list-disc list-inside space-y-1">
                      {grupo.alumnos.map((alumno) => (
                        <li key={alumno.id}>{alumno.nombre}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={instructores[grupo.id] || ""}
                      onChange={(e) =>
                        handleInstructorChange(grupo.id, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Elige un instructor</option>
                      {/* Add instructor options */}
                    </select>
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
