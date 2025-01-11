import type { Calificacion } from "../types";

interface CalificacionesTableProps {
  calificaciones: Calificacion[];
}

export function CalificacionesTable({
  calificaciones,
}: CalificacionesTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-lg font-medium text-gray-900">
          Detalle de Calificaciones
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Lista de maniobras y sus respectivas calificaciones
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Maniobra
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nota Mínima
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nota
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Causa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Observación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recomendación
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calificaciones.map((calificacion) => (
              <tr key={calificacion.idManiobra} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {calificacion.maniobra.nombre}
                  </div>
                  <div className="text-sm text-gray-500">
                    {calificacion.maniobra.descripcion}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {calificacion.notaMin}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${
                      Number(calificacion.nota) >= Number(calificacion.notaMin)
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {calificacion.nota}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {calificacion.causa}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {calificacion.observacion}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {calificacion.recomendacion}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
