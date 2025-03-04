import type { TurnoResponse } from "../../TurnosPage/types";

interface TurnoOperacionesCardProps {
  turno: TurnoResponse;
  onModify: (turno: TurnoResponse) => void;
  onDelete: (turno: TurnoResponse) => void;
  onClick: (turno: TurnoResponse) => void;
}

export function TurnoOperacionesCard({
  turno,
  onModify,
  onDelete,
  onClick,
}: TurnoOperacionesCardProps) {
  const handleModifyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onModify(turno);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(turno);
  };

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 p-5 hover:shadow-md transition-all duration-200 cursor-pointer animate-fade-in"
      onClick={() => onClick(turno)}
      style={{ animationDelay: "100ms" }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors">
            {turno.nombre}
          </h3>
        </div>
        <span className="text-blue-600 text-sm font-medium bg-blue-50 px-2 py-1 rounded-md">
          {formatDate(turno.fechaEval)}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center text-sm">
          <svg
            className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <span className="text-gray-600 mr-1">Programa:</span>
          <span className="font-medium text-gray-900">{turno.programa}</span>
        </div>
        <div className="flex items-center text-sm">
          <svg
            className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span className="text-gray-600 mr-1">Subfase:</span>
          <span className="font-medium text-gray-900">{turno.subfase}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div className="flex space-x-2">
          <button
            onClick={handleModifyClick}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
            title="Editar turno"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
            title="Eliminar turno"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center text-gray-700 bg-gray-50 px-2 py-1 rounded-md">
            <svg
              className="w-4 h-4 mr-1 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="font-medium">{turno.cantGrupo}</span>&nbsp;
            {turno.cantGrupo === 1 ? "grupo" : "grupos"}
          </div>
          <div className="flex items-center text-gray-700 bg-gray-50 px-2 py-1 rounded-md">
            <svg
              className="w-4 h-4 mr-1 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <span className="font-medium">{turno.cantManiobra}</span>
            &nbsp;{turno.cantManiobra === 1 ? "maniobra" : "maniobras"}
          </div>
        </div>
      </div>
    </div>
  );
}
