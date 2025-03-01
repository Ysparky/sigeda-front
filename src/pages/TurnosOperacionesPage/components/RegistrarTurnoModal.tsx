import { useEffect, useState } from "react";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { Portal } from "../../../components/common/Portal";
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
  const [isLoading, setIsLoading] = useState(false);

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
          setIsLoading(true);
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
        } finally {
          setIsLoading(false);
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
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-lg w-full max-w-5xl p-8 relative animate-fade-in overflow-y-auto max-h-[90vh] shadow-xl">
          <button
            onClick={handleClose}
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
            {getModalTitle()}
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
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
                        : formData.nombre.trim().length >= 10 &&
                          formData.nombre.trim().length <= 30
                        ? "border-green-300 focus:ring-green-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } rounded-md focus:outline-none focus:ring-2 transition-all duration-200`}
                    placeholder="Ingresa nombre del turno"
                  />
                  <div className="mt-1 flex justify-between">
                    <span
                      className={`text-xs ${
                        formData.nombre.trim().length > 0 &&
                        (formData.nombre.trim().length < 10 ||
                          formData.nombre.trim().length > 30)
                          ? "text-red-500"
                          : formData.nombre.trim().length >= 10 &&
                            formData.nombre.trim().length <= 30
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {formData.nombre.trim().length > 0
                        ? `${formData.nombre.trim().length} caracteres`
                        : ""}
                    </span>
                    <span className="text-xs text-gray-500">
                      10-30 caracteres
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <input
                    disabled={!isEditOrCreateMode}
                    type="date"
                    value={formData.fecha}
                    min={getTomorrow()}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                    className={`w-full px-3 py-2 border ${
                      formData.fecha
                        ? "border-green-300 focus:ring-green-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } rounded-md focus:outline-none focus:ring-2 transition-all duration-200`}
                  />
                  {!formData.fecha && (
                    <p className="mt-1 text-xs text-gray-500">
                      Seleccione una fecha a partir de mañana
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subfase <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={!isEditOrCreateMode || mode === "edit"}
                    value={formData.subfase}
                    onChange={(e) =>
                      setFormData({ ...formData, subfase: e.target.value })
                    }
                    className={`w-full px-3 py-2 border ${
                      formData.subfase
                        ? "border-green-300 focus:ring-green-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                      mode === "edit" ? "bg-gray-100" : ""
                    }`}
                  >
                    <option value="">Seleccione la subfase</option>
                    {subfases.map((subfase) => (
                      <option key={subfase.id} value={subfase.id}>
                        {subfase.nombre}
                      </option>
                    ))}
                  </select>
                  {mode === "edit" && (
                    <p className="mt-1 text-xs text-amber-600">
                      La subfase no se puede modificar una vez creado el turno
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Programa <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={!isEditOrCreateMode || mode === "edit"}
                    value={formData.programa}
                    onChange={(e) =>
                      setFormData({ ...formData, programa: e.target.value })
                    }
                    className={`w-full px-3 py-2 border ${
                      formData.programa
                        ? "border-green-300 focus:ring-green-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                      mode === "edit" ? "bg-gray-100" : ""
                    }`}
                  >
                    <option value="">Seleccione el programa</option>
                    <option value="PDI">PDI</option>
                    <option value="PDE">PDE</option>
                  </select>
                  {mode === "edit" && (
                    <p className="mt-1 text-xs text-amber-600">
                      El programa no se puede modificar una vez creado el turno
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-b py-5 space-y-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-800">
                      {formData.maniobras.length === 1
                        ? "Maniobra"
                        : "Maniobras"}
                    </h3>
                    {formData.maniobras.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {formData.maniobras.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsManiobraModalOpen(true)}
                    disabled={isViewMode || !isManiobrasDivEnabled}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center
                      ${
                        isViewMode || !isManiobrasDivEnabled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }
                    `}
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      ></path>
                    </svg>
                    {formData.maniobras.length > 0
                      ? `Modificar ${
                          formData.maniobras.length === 1
                            ? "maniobra"
                            : "maniobras"
                        }`
                      : "Agregar maniobras"}
                  </button>
                </div>

                <div
                  onClick={() =>
                    !isViewMode &&
                    isManiobrasDivEnabled &&
                    setIsManiobraModalOpen(true)
                  }
                  className={`border rounded-md p-2 h-56 overflow-y-auto transition-all duration-200
                    ${
                      isViewMode
                        ? "bg-gray-50 border-gray-300"
                        : isManiobrasDivEnabled
                        ? "bg-white border-gray-300 cursor-pointer hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm"
                        : "bg-gray-100 border-gray-200 cursor-not-allowed opacity-75"
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
                            ? `Clic para añadir ${
                                formData.maniobras.length === 0
                                  ? "maniobras"
                                  : formData.maniobras.length === 1
                                  ? "otra maniobra"
                                  : "más maniobras"
                              }`
                            : "Seleccione una subfase primero"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-b pb-5 space-y-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-800">
                      {formData.grupos.length === 1 ? "Grupo" : "Grupos"}
                    </h3>
                    {formData.grupos.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {formData.grupos.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGruposModalOpen(true)}
                    disabled={isViewMode || !formData.programa}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center
                      ${
                        isViewMode || !formData.programa
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }
                    `}
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      ></path>
                    </svg>
                    {formData.grupos.length > 0
                      ? `Modificar ${
                          formData.grupos.length === 1 ? "grupo" : "grupos"
                        }`
                      : "Agregar grupos"}
                  </button>
                </div>

                <div
                  onClick={() =>
                    !isViewMode &&
                    formData.programa &&
                    setIsGruposModalOpen(true)
                  }
                  className={`border rounded-md p-2 h-56 overflow-y-auto transition-all duration-200
                    ${
                      isViewMode
                        ? "bg-gray-50 border-gray-300"
                        : formData.programa
                        ? "bg-white border-gray-300 cursor-pointer hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm"
                        : "bg-gray-100 border-gray-200 cursor-not-allowed opacity-75"
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
                              <div className="flex flex-wrap gap-1">
                                {grupo.personas.map((persona) => (
                                  <span
                                    key={persona.codigo}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {persona.nombre} {persona.aPaterno}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                            ? `Clic para añadir ${
                                formData.grupos.length === 0
                                  ? "grupos"
                                  : formData.grupos.length === 1
                                  ? "otro grupo"
                                  : "más grupos"
                              }`
                            : "Seleccione un programa primero"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
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
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                >
                  {isViewMode ? "Cerrar" : "Cancelar"}
                </button>
                {!isViewMode && (
                  <button
                    type="submit"
                    disabled={!isFormValid()}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200 flex items-center
                      ${
                        isFormValid()
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-gray-400 cursor-not-allowed"
                      }
                    `}
                  >
                    {mode === "edit" ? "Guardar Cambios" : "Registrar Turno"}
                  </button>
                )}
              </div>
            </form>
          )}

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
      </div>
    </Portal>
  );
}
