import type { Calificacion } from "../types";

interface CalificacionesTableProps {
  calificaciones: Calificacion[];
}

export function CalificacionesTable({
  calificaciones,
}: CalificacionesTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
            <tr
              key={`${calificacion.codEvaluacion}-${calificacion.idManiobra}`}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {calificacion.maniobra.nombre}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {calificacion.notaMin}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {calificacion.nota}
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
  );
}
