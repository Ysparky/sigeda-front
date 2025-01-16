interface AlumnoCardProps {
  alumno: {
    nombre: string;
    aPaterno: string;
    aMaterno: string;
    estado: string;
    orden: string;
    foto: string;
  };
  onClick: () => void;
}

export function AlumnoCard({ alumno, onClick }: AlumnoCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <img
            src={alumno.foto}
            alt={`${alumno.nombre} ${alumno.aPaterno}`}
            className="h-16 w-16 rounded-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {alumno.nombre} {alumno.aPaterno} {alumno.aMaterno}
          </h3>
          <div className="mt-1 flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${
                alumno.estado === "Apto"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {alumno.estado}
            </span>
            <span className="text-sm text-gray-500">
              Orden de mérito: {alumno.orden}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
