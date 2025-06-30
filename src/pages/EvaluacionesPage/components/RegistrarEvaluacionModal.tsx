import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/auth";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { Portal } from "../../../components/common/Portal";
import { evaluacionesService, type CategoriaEvaluacion } from "../../../services/evaluaciones.service";
import { turnosService } from "../../../services/turnos.service";

interface RegistrarEvaluacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEvaluacionCreated: () => void;
  turnoId: number;
  alumnoId: string;
}

interface CalificacionForm {
  idManiobra: number;
  nota: string;
  causa: string;
  observacion: string;
  recomendacion: string;
  nombre?: string; // For display purposes only
}

export function RegistrarEvaluacionModal({
  isOpen,
  onClose,
  onEvaluacionCreated,
  turnoId,
  alumnoId,
}: RegistrarEvaluacionModalProps) {
  const { userInfo } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaEvaluacion[]>([]);

  const [formData, setFormData] = useState({
    nombre: "",
    recomendacion: "",
    categoria: "",
    calificaciones: [] as CalificacionForm[],
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!isOpen) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load categorias and turno details in parallel
        const [categoriasData, turnoData] = await Promise.all([
          evaluacionesService.getCategoriasEvaluacion(alumnoId),
          turnosService.getTurno(turnoId),
        ]);

        setCategorias(categoriasData);

        // Initialize calificaciones based on turno maniobras
        const initialCalificaciones = turnoData.turnoManiobras.map((tm) => ({
          idManiobra: tm.maniobra?.id || 0,
          nombre: tm.maniobra?.nombre || "",
          nota: "",
          causa: "",
          observacion: "",
          recomendacion: "",
        }));

        setFormData((prev) => ({
          ...prev,
          calificaciones: initialCalificaciones,
        }));
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Error al cargar los datos necesarios");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, turnoId, alumnoId]);

  const handleClose = () => {
    setFormData({
      nombre: "",
      recomendacion: "",
      categoria: "",
      calificaciones: [],
    });
    setError(null);
    onClose();
  };

  const handleCalificacionChange = (index: number, field: keyof CalificacionForm, value: string) => {
    setFormData((prev) => {
      const newCalificaciones = [...prev.calificaciones];
      newCalificaciones[index] = {
        ...newCalificaciones[index],
        [field]: value,
      };
      return { ...prev, calificaciones: newCalificaciones };
    });
  };

  const isFormValid = () => {
    return (
      formData.nombre.trim() !== "" &&
      formData.categoria !== "" &&
      formData.calificaciones.every((c) => {
        if (c.nota === "d") { // Demostrativo case
          return true;
        }
        return c.nota !== "" && 
          c.causa !== "" && 
          c.observacion !== "" && 
          c.recomendacion !== "";
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInfo?.codigo) return;

    try {
      setIsLoading(true);
      setError(null);

      const processedCalificaciones = formData.calificaciones.map(cal => {
        if (cal.nota === "d") {
          return {
            idManiobra: cal.idManiobra,
            nota: cal.nota,
            causa: "",
            observacion: "",
            recomendacion: ""
          };
        }
        return {
          idManiobra: cal.idManiobra,
          nota: cal.nota,
          causa: cal.causa,
          observacion: cal.observacion,
          recomendacion: cal.recomendacion
        };
      });

      await evaluacionesService.createEvaluacion(
        turnoId,
        alumnoId,
        {
          nombre: formData.nombre,
          recomendacion: formData.recomendacion,
          categoria: formData.categoria,
          codEvaluador: parseInt(userInfo.codigo),
          calificaciones: processedCalificaciones,
        }
      );

      onEvaluacionCreated();
      handleClose();
    } catch (err) {
      console.error("Error creating evaluacion:", err);
      setError("Error al crear la evaluación");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

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
            Registrar Nueva Evaluación
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
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    placeholder="Ingresa nombre de la evaluación"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <option value="">Seleccione una categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recomendación General
                </label>
                <textarea
                  value={formData.recomendacion}
                  onChange={(e) =>
                    setFormData({ ...formData, recomendacion: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  placeholder="Ingresa una recomendación general"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Calificaciones por Maniobra
                </h3>
                <div className="space-y-6">
                  {formData.calificaciones.map((cal, index) => (
                    <div
                      key={cal.idManiobra}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <h4 className="font-medium text-gray-900 mb-3">
                        {cal.nombre}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nota <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={cal.nota}
                            onChange={(e) =>
                              handleCalificacionChange(index, "nota", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                          >
                            <option value="">Seleccione una nota</option>
                            <option value="d">Demostrativo (D)</option>
                            <option value="i">Insuficiente (I)</option>
                            <option value="r">Regular (R)</option>
                            <option value="b">Bueno (B)</option>
                            <option value="e">Excelente (E)</option>
                          </select>
                        </div>
                        {cal.nota !== "d" && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Causa <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={cal.causa}
                                onChange={(e) =>
                                  handleCalificacionChange(index, "causa", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                placeholder="Ingresa la causa"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observación <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={cal.observacion}
                                onChange={(e) =>
                                  handleCalificacionChange(index, "observacion", e.target.value)
                                }
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                placeholder="Ingresa una observación"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recomendación <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={cal.recomendacion}
                                onChange={(e) =>
                                  handleCalificacionChange(index, "recomendacion", e.target.value)
                                }
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                placeholder="Ingresa una recomendación"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-200
                    ${
                      isFormValid()
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }
                  `}
                >
                  Registrar Evaluación
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Portal>
  );
} 