import { useEffect, useState } from "react";
import { useData } from "../../../contexts/data";
import { turnosService } from "../../../services/turnos.service";
import { TurnoDetalle } from "../../../types/turno.types";
import {
  GrupoSeleccionado,
  SeleccionarGruposModal,
} from "./SeleccionarGruposModal";
import {
  ManiobraSeleccionada,
  SeleccionarManiobrasModal,
} from "./SeleccionarManiobrasModal";

interface RegistrarTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnoCreated: (turno: TurnoDetalle) => void;
  onTurnoUpdated?: (changes: string[]) => void;
  turnoId?: number;
  mode?: "create" | "view" | "edit";
  showNotification: (message: string, type: "success" | "error") => void;
}

export function RegistrarTurnoModal({
  isOpen,
  onClose,
  onTurnoCreated,
  turnoId,
  mode = "create",
  onTurnoUpdated,
  showNotification,
}: RegistrarTurnoModalProps) {
  const { subfases, loadSubFases } = useData();
  const initialFormState = {
    nombre: "",
    subfase: "",
    programa: "",
    fecha: "",
    maniobras: [] as ManiobraSeleccionada[],
    grupos: [] as GrupoSeleccionado[],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isManiobraModalOpen, setIsManiobraModalOpen] = useState(false);
  const [isGruposModalOpen, setIsGruposModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData(initialFormState);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const isManiobrasDivEnabled = formData.subfase !== "";

  useEffect(() => {
    loadSubFases().catch(console.error);
  }, [loadSubFases]);

  useEffect(() => {
    if (isOpen && (mode === "view" || mode === "edit") && turnoId) {
      const loadTurno = async () => {
        try {
          const turnoDetail = await turnosService.getTurno(turnoId);
          const subfaseId =
            subfases
              .find((s) => s.nombre === turnoDetail.subfase)
              ?.id.toString() || "";

          setFormData({
            nombre: turnoDetail.nombre,
            subfase: subfaseId,
            programa: turnoDetail.programa,
            fecha: turnoDetail.fechaEval,
            maniobras: turnoDetail.turnoManiobras.map((tm) => ({
              id: tm.maniobra?.id || 0,
              nombre: tm.maniobra?.nombre || "",
              descripcion: tm.maniobra?.descripcion || "",
              selected: true,
              requerido: tm.nota_min || "",
            })),
            grupos: turnoDetail.grupoTurnos.map((gt) => ({
              personas: gt.grupo?.personas || [],
              selected: true,
              instructor: gt.instructor || "",
              instructorId: String(gt.codInstructor || ""),
              id: gt.grupo?.id || 0,
              nombre: gt.grupo?.nombre || `Grupo ${gt.grupo?.id || 0}`,
              programa: turnoDetail.programa,
            })),
          });
        } catch (error) {
          console.error("Error loading turno:", error);
          setError("Error al cargar el turno");
        }
      };

      loadTurno();
    }
  }, [isOpen, turnoId, mode, subfases]);

  const isViewMode = mode === "view";

  if (!isOpen) return null;

  const isFormValid = () => {
    return (
      formData.nombre.trim() !== "" &&
      formData.nombre.trim().length >= 10 &&
      formData.nombre.trim().length <= 30 &&
      formData.fecha !== "" &&
      formData.subfase !== "" &&
      formData.programa !== "" &&
      formData.maniobras.length > 0 &&
      formData.grupos.length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate nombre length
    if (
      formData.nombre.trim().length < 10 ||
      formData.nombre.trim().length > 30
    ) {
      setError("Nombre: Nombre debe tener de 10 a 30 caracteres.");
      return;
    }

    try {
      if (mode === "edit" && turnoId) {
        const updateData = {
          nombre: formData.nombre,
          fechaEval: formData.fecha,
          grupoTurnos: formData.grupos.map((g) => ({
            codInstructor: Number(g.instructorId),
            idGrupo: g.id,
            checked: g.selected,
          })),
          turnoManiobras: formData.maniobras.map((m) => ({
            idManiobra: m.id,
            checked: m.selected,
            nota_min: m.requerido.toLowerCase(),
          })),
        };

        try {
          const response = await turnosService.updateTurno(turnoId, updateData);
          onTurnoUpdated?.(response.turno);
          showNotification("Turno actualizado exitosamente", "success");
          onClose();
        } catch (error) {
          console.error("Error updating turno:", error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError("Error al actualizar el turno");
          }
          return;
        }
      } else {
        const requestData = {
          nombre: formData.nombre,
          fechaEval: formData.fecha,
          programa: formData.programa,
          idSubFase: Number(formData.subfase),
          grupoTurnos: formData.grupos.map((g) => ({
            codInstructor: Number(g.instructorId),
            idGrupo: g.id,
          })),
          turnoManiobras: formData.maniobras.map((m) => ({
            idManiobra: m.id,
            nota_min: m.requerido.toLowerCase(),
          })),
        };

        try {
          const response = await turnosService.createTurno(requestData);
          onTurnoCreated(response.turno);
          onClose();
        } catch (error) {
          console.error("Error creating turno:", error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError("Error al crear el turno");
          }
          return;
        }
      }
    } catch (error) {
      console.error("Error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error al procesar el turno");
      }
    }
  };

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const isEditOrCreateMode = mode === "edit" || mode === "create";

  const getModalTitle = () => {
    switch (mode) {
      case "view":
        return "Detalle del Turno";
      case "edit":
        return "Editar Turno";
      default:
        return "Registrar Nuevo Turno";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl p-8 relative animate-fade-in">
        <button
          onClick={handleClose}
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

        <h2 className="text-xl font-bold mb-6">{getModalTitle()}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                disabled={!isEditOrCreateMode}
                type="text"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className={`w-full px-3 py-2 border ${
                  formData.nombre.trim().length > 0 &&
                  (formData.nombre.trim().length < 10 ||
                    formData.nombre.trim().length > 30)
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } rounded-md focus:outline-none focus:ring-2`}
                placeholder="Ingresa nombre del turno"
              />
              <div className="mt-1 flex justify-between">
                <span
                  className={`text-xs ${
                    formData.nombre.trim().length > 0 &&
                    (formData.nombre.trim().length < 10 ||
                      formData.nombre.trim().length > 30)
                      ? "text-red-500"
                      : "text-gray-500"
                  }`}
                >
                  {formData.nombre.trim().length > 0
                    ? `${formData.nombre.trim().length} caracteres`
                    : ""}
                </span>
                <span className="text-xs text-gray-500">10-30 caracteres</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                disabled={!isEditOrCreateMode}
                type="date"
                value={formData.fecha}
                min={getTomorrow()}
                onChange={(e) =>
                  setFormData({ ...formData, fecha: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subfase
              </label>
              <select
                disabled={!isEditOrCreateMode || mode === "edit"}
                value={formData.subfase}
                onChange={(e) =>
                  setFormData({ ...formData, subfase: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione la subfase</option>
                {subfases.map((subfase) => (
                  <option key={subfase.id} value={subfase.id}>
                    {subfase.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Programa
              </label>
              <select
                disabled={!isEditOrCreateMode || mode === "edit"}
                value={formData.programa}
                onChange={(e) =>
                  setFormData({ ...formData, programa: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione el programa</option>
                <option value="PDI">PDI</option>
                <option value="PDE">PDE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maniobras
              </label>
              <div
                onClick={() =>
                  !isViewMode &&
                  isManiobrasDivEnabled &&
                  setIsManiobraModalOpen(true)
                }
                className={`border border-gray-300 rounded-md p-2 h-56 overflow-y-auto transition-all duration-200
                  ${
                    isViewMode
                      ? "bg-gray-50"
                      : isManiobrasDivEnabled
                      ? "bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-blue-300 hover:shadow-sm"
                      : "bg-gray-100 cursor-not-allowed opacity-75"
                  }`}
              >
                {formData.maniobras.length > 0 ? (
                  <table className="min-w-full">
                    <thead className="bg-white sticky top-0 shadow-sm">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-2 py-2">
                          Maniobra
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-2 py-2 w-20">
                          Req.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.maniobras.map((maniobra) => (
                        <tr
                          key={maniobra.id}
                          className="text-sm hover:bg-gray-50"
                        >
                          <td className="px-2 py-2 text-gray-900 font-medium">
                            {maniobra.nombre}
                          </td>
                          <td className="px-2 py-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {maniobra.requerido}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <p className="mt-2 text-sm">
                        {isManiobrasDivEnabled
                          ? "Clic para añadir maniobras"
                          : "Seleccione una subfase primero"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grupos
              </label>
              <div
                onClick={() =>
                  !isViewMode && formData.programa && setIsGruposModalOpen(true)
                }
                className={`border border-gray-300 rounded-md p-2 h-56 overflow-y-auto transition-all duration-200
                  ${
                    isViewMode
                      ? "bg-gray-50"
                      : formData.programa
                      ? "bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-blue-300 hover:shadow-sm"
                      : "bg-gray-100 cursor-not-allowed opacity-75"
                  }`}
              >
                {formData.grupos.length > 0 ? (
                  <table className="min-w-full">
                    <thead className="bg-white sticky top-0 shadow-sm">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-2 py-2">
                          Grupo
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-2 py-2">
                          Alumnos
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-2 py-2">
                          Instructor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.grupos.map((grupo, index) => (
                        <tr
                          key={grupo.id ?? `grupo-${index}`}
                          className="text-sm hover:bg-gray-50"
                        >
                          <td className="px-2 py-2 text-gray-900 font-medium">
                            Grupo {grupo.nombre || (grupo.id ?? "N/A")}
                          </td>
                          <td className="px-2 py-2 text-gray-500">
                            <ul className="list-disc list-inside">
                              {grupo.personas.map((persona) => (
                                <li key={persona.codigo} className="text-xs">
                                  {persona.nombre} {persona.aPaterno}{" "}
                                  {persona.aMaterno}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-2 py-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {grupo.instructor}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <p className="mt-2 text-sm">
                        {formData.programa
                          ? "Clic para añadir grupos"
                          : "Seleccione un programa primero"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
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
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {!isViewMode && (
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isFormValid()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md
                  ${
                    isFormValid()
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
              >
                {mode === "edit" ? "Guardar Cambios" : "Registrar Turno"}
              </button>
            </div>
          )}
        </form>
      </div>

      <SeleccionarManiobrasModal
        isOpen={isManiobraModalOpen}
        onClose={() => setIsManiobraModalOpen(false)}
        onAccept={(selectedManiobras) => {
          setFormData({ ...formData, maniobras: selectedManiobras });
          setIsManiobraModalOpen(false);
        }}
        subfaseId={Number(formData.subfase)}
        currentSelections={formData.maniobras}
      />

      <SeleccionarGruposModal
        isOpen={isGruposModalOpen}
        onClose={() => setIsGruposModalOpen(false)}
        onAccept={(selectedGrupos) => {
          setFormData({ ...formData, grupos: selectedGrupos });
          setIsGruposModalOpen(false);
        }}
        programa={formData.programa}
        currentSelections={formData.grupos}
      />
    </div>
  );
}
