import { useEffect, useState } from "react";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import {
  Grupo,
  Instructor as InstructorType,
  gruposService,
} from "../../../services/grupos.service";

export interface GrupoSeleccionado extends Grupo {
  selected: boolean;
  instructor: string;
  instructorId: string;
}

interface SeleccionarGruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (selectedGrupos: GrupoSeleccionado[]) => void;
  programa: string;
  currentSelections?: GrupoSeleccionado[];
}

export function SeleccionarGruposModal({
  isOpen,
  onClose,
  onAccept,
  programa,
  currentSelections = [],
}: SeleccionarGruposModalProps) {
  const [grupos, setGrupos] = useState<GrupoSeleccionado[]>([]);
  const [instructores, setInstructores] = useState<InstructorType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInstructores, setIsLoadingInstructores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorInstructores, setErrorInstructores] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadGrupos = async () => {
      if (!programa) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await gruposService.getGruposByPrograma(programa);

        const mergedGrupos = data.map((grupo) => {
          const existingSelection = currentSelections.find(
            (s) => s.id === grupo.id
          );
          return (
            existingSelection || {
              ...grupo,
              selected: false,
              instructor: "",
              instructorId: "",
            }
          );
        });

        setGrupos(mergedGrupos);
      } catch (err) {
        if (err instanceof Error && err.message.includes("404")) {
          setGrupos([]);
        } else {
          setError("Error al cargar los grupos");
          console.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const loadInstructores = async () => {
      if (!programa) return;

      try {
        setIsLoadingInstructores(true);
        setErrorInstructores(null);
        const data = await gruposService.getInstructoresByPrograma(programa);
        setInstructores(data);
      } catch (err) {
        if (err instanceof Error && err.message.includes("404")) {
          setInstructores([]);
        } else {
          setErrorInstructores("Error al cargar los instructores");
          console.error(err);
        }
      } finally {
        setIsLoadingInstructores(false);
      }
    };

    if (isOpen) {
      loadGrupos();
      loadInstructores();
    }
  }, [isOpen, programa, currentSelections]);

  const handleToggleGrupo = (grupoId: number) => {
    setGrupos((prev) =>
      prev.map((g) => {
        if (g.id === grupoId) {
          return {
            ...g,
            selected: !g.selected,
            instructor: !g.selected ? g.instructor : "",
            instructorId: !g.selected ? g.instructorId : "",
          };
        }
        return g;
      })
    );
  };

  const handleInstructorChange = (
    grupoId: number,
    instructorId: string,
    nombre: string,
    aPaterno: string,
    aMaterno: string
  ) => {
    setGrupos((prev) =>
      prev.map((g) => {
        if (g.id === grupoId) {
          return {
            ...g,
            instructor: `${nombre} ${aPaterno} ${aMaterno}`.trim(),
            instructorId: instructorId,
          };
        }
        return g;
      })
    );
  };

  const isAcceptEnabled =
    grupos.every(
      (g) => !g.selected || (g.selected && g.instructor.trim() !== "")
    ) && grupos.some((g) => g.selected);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl p-8 relative animate-fade-in">
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

        <h2 className="text-2xl font-bold mb-8">Seleccionar Grupos</h2>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : grupos.length === 0 ? (
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
              No hay grupos
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron grupos para este programa
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-4"></th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Grupo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Alumnos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Instructor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grupos.map((grupo, index) => (
                  <tr
                    key={grupo.id ?? index}
                    className={`${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-gray-100`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={grupo.selected}
                        onChange={() => handleToggleGrupo(grupo.id ?? 0)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Grupo {grupo.nombre || (grupo.id ?? "N/A")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <ul className="list-disc list-inside space-y-1">
                        {grupo.personas.map((persona) => (
                          <li key={persona.codigo}>
                            {persona.nombre} {persona.aPaterno}{" "}
                            {persona.aMaterno}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <select
                        value={grupo.instructorId || ""}
                        onChange={(e) => {
                          const instructor = instructores.find(
                            (i) => i.codigo === e.target.value
                          );
                          if (instructor) {
                            handleInstructorChange(
                              grupo.id ?? 0,
                              instructor.codigo,
                              instructor.nombre,
                              instructor.aPaterno,
                              instructor.aMaterno
                            );
                          }
                        }}
                        disabled={!grupo.selected || isLoadingInstructores}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500
                                 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">
                          {isLoadingInstructores
                            ? "Cargando instructores..."
                            : errorInstructores
                            ? "Error al cargar instructores"
                            : "Seleccione instructor"}
                        </option>
                        {instructores.map((instructor) => (
                          <option
                            key={instructor.codigo}
                            value={instructor.codigo}
                          >
                            {instructor.nombre} {instructor.aPaterno}{" "}
                            {instructor.aMaterno}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center space-x-3 mt-6">
          <p className="text-sm text-gray-500">
            {!isAcceptEnabled && grupos.some((g) => g.selected) && (
              <span className="text-red-500">
                * Complete el campo Instructor para todos los grupos
                seleccionados
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
              onClick={() => onAccept(grupos.filter((g) => g.selected))}
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
