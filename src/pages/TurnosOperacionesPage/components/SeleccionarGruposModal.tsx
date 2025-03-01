import { useEffect, useState } from "react";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { Portal } from "../../../components/common/Portal";
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
            Seleccionar Grupos
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
          ) : grupos.length === 0 ? (
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
                No hay grupos
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No se encontraron grupos para este programa
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">
                  Seleccione los grupos y asigne un instructor para cada uno
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Total: {grupos.length}
                  </span>
                  <span className="text-sm text-blue-600">
                    Seleccionados: {grupos.filter((g) => g.selected).length}
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
                        Grupo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alumnos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Instructor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {grupos.map((grupo) => (
                      <tr
                        key={grupo.id}
                        className={`hover:bg-blue-50 transition-colors duration-150 ${
                          grupo.selected ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={grupo.selected}
                            onChange={() => handleToggleGrupo(grupo.id ?? 0)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {grupo.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {grupo.personas.map((alumno) => (
                              <span
                                key={alumno.codigo}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {alumno.nombre} {alumno.aPaterno}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="relative">
                            <select
                              value={grupo.instructorId || ""}
                              onChange={(e) => {
                                const instructorId = e.target.value;
                                if (instructorId) {
                                  const instructor = instructores.find(
                                    (i) => i.codigo === instructorId
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
                                }
                              }}
                              disabled={
                                !grupo.selected || isLoadingInstructores
                              }
                              className={`w-full px-2 py-1 border rounded-md 
                                       focus:outline-none focus:ring-2 focus:ring-blue-500
                                       transition-all duration-200
                                       ${
                                         !grupo.selected
                                           ? "bg-gray-100 text-gray-400 border-gray-300"
                                           : grupo.instructorId
                                           ? "border-green-300 bg-green-50"
                                           : "border-gray-300"
                                       }`}
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
                            {grupo.selected && grupo.instructorId && (
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2">
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
              {!isAcceptEnabled && grupos.some((g) => g.selected) && (
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
                  Complete el campo Instructor para todos los grupos
                  seleccionados
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
                onClick={() => onAccept(grupos.filter((g) => g.selected))}
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
