import { useState } from "react";
import { SeleccionarGruposModal } from "./SeleccionarGruposModal";
import { SeleccionarManiobrasModal } from "./SeleccionarManiobrasModal";

interface RegistrarTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (turnoData: any) => void;
}

export function RegistrarTurnoModal({
  isOpen,
  onClose,
  onSubmit,
}: RegistrarTurnoModalProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    subfase: "",
    programa: "",
    fecha: "",
    maniobras: [] as string[],
    grupos: [] as string[],
  });

  const [isManiobraModalOpen, setIsManiobraModalOpen] = useState(false);
  const [isGruposModalOpen, setIsGruposModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative animate-fade-in">
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

        <h2 className="text-xl font-bold mb-6">Registrar Nuevo Turno</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingresa nombre del turno"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={formData.fecha}
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
                value={formData.subfase}
                onChange={(e) =>
                  setFormData({ ...formData, subfase: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione la subfase</option>
                {/* Add subfase options */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Programa
              </label>
              <select
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
                onClick={() => setIsManiobraModalOpen(true)}
                className="border border-gray-300 rounded-md p-4 h-48 overflow-y-auto bg-gray-50 cursor-pointer hover:bg-gray-100"
              >
                {formData.maniobras.length > 0 ? (
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase">
                          Maniobra
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase">
                          Descripción
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase">
                          Requerido
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.maniobras.map((maniobra: any) => (
                        <tr key={maniobra.id} className="text-sm">
                          <td className="py-2 text-gray-900">
                            {maniobra.nombre}
                          </td>
                          <td className="py-2 text-gray-500 text-xs">
                            {maniobra.descripcion.length > 50
                              ? `${maniobra.descripcion.substring(0, 50)}...`
                              : maniobra.descripcion}
                          </td>
                          <td className="py-2 text-gray-900">
                            {maniobra.requerido ? "D" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p className="mt-2">Clic en el + para añadir maniobras</p>
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
                onClick={() => setIsGruposModalOpen(true)}
                className="border border-gray-300 rounded-md p-4 h-48 overflow-y-auto bg-gray-50 cursor-pointer hover:bg-gray-100"
              >
                {formData.grupos.length > 0 ? (
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">
                          Grupos
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">
                          Alumnos
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">
                          Instructor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.grupos.map((grupo: any) => (
                        <tr key={grupo.id} className="text-sm">
                          <td className="px-3 py-2 text-gray-900 align-top">
                            {grupo.nombre}
                          </td>
                          <td className="px-3 py-2 text-gray-900 align-top">
                            {grupo.alumnos.map((alumno: any) => (
                              <div key={alumno.id} className="text-sm">
                                {alumno.nombre}
                              </div>
                            ))}
                          </td>
                          <td className="px-3 py-2 text-gray-900 align-top">
                            {grupo.instructor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p className="mt-2">Clic en el + para añadir alumnos</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Registrar Turno
            </button>
          </div>
        </form>
      </div>

      <SeleccionarManiobrasModal
        isOpen={isManiobraModalOpen}
        onClose={() => setIsManiobraModalOpen(false)}
        onAccept={(selectedManiobras) => {
          setFormData({ ...formData, maniobras: selectedManiobras });
          setIsManiobraModalOpen(false);
        }}
        maniobras={[
          {
            id: 1,
            nombre: "Maniobra 1",
            descripcion:
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Egestas dui id ornare arcu. Neque laoreet suspendisse interdum consectetur libero id faucibus.",
            requerido: true,
          },
          {
            id: 2,
            nombre: "Maniobra 1",
            descripcion:
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Egestas dui id ornare arcu. Neque laoreet suspendisse interdum consectetur libero id faucibus.",
            requerido: true,
          },
          {
            id: 3,
            nombre: "Maniobra 1",
            descripcion:
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Egestas dui id ornare arcu. Neque laoreet suspendisse interdum consectetur libero id faucibus.",
            requerido: true,
          },
        ]}
      />

      <SeleccionarGruposModal
        isOpen={isGruposModalOpen}
        onClose={() => setIsGruposModalOpen(false)}
        onAccept={(selectedGrupos) => {
          setFormData({ ...formData, grupos: selectedGrupos });
          setIsGruposModalOpen(false);
        }}
        grupos={[
          {
            id: 1,
            nombre: "Grupo 1",
            alumnos: [
              { id: 1, nombre: "Oscar Lopez" },
              { id: 2, nombre: "Diego Falconi" },
              { id: 3, nombre: "Manuel Maldonado" },
              { id: 4, nombre: "Erick Quispe" },
              { id: 5, nombre: "Carlos Manuel" },
            ],
          },
          {
            id: 2,
            nombre: "Grupo 1",
            alumnos: [
              { id: 6, nombre: "Oscar Lopez" },
              { id: 7, nombre: "Diego Falconi" },
              { id: 8, nombre: "Manuel Maldonado" },
              { id: 9, nombre: "Erick Quispe" },
              { id: 10, nombre: "Carlos Manuel" },
            ],
          },
          {
            id: 3,
            nombre: "Grupo 1",
            alumnos: [
              { id: 11, nombre: "Oscar Lopez" },
              { id: 12, nombre: "Diego Falconi" },
              { id: 13, nombre: "Manuel Maldonado" },
              { id: 14, nombre: "Erick Quispe" },
              { id: 15, nombre: "Carlos Manuel" },
            ],
          },
        ]}
      />
    </div>
  );
}
