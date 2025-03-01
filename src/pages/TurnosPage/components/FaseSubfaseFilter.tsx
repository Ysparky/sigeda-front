import { useEffect, useState } from "react";
import { useData } from "../../../contexts/data";

interface FaseSubfaseFilterProps {
  onFilterChange: (subfaseId: number | null) => void;
  initialSubfaseId: number | null;
}

export function FaseSubfaseFilter({
  onFilterChange,
  initialSubfaseId,
}: FaseSubfaseFilterProps) {
  const {
    fases,
    fasesDetail,
    selectedFaseId,
    isLoadingFases,
    isLoadingSubFases,
    error,
    loadFases,
    handleFaseClick,
    setSelectedFaseId,
  } = useData();

  // Local state to track the selected subfase
  const [selectedSubfaseId, setSelectedSubfaseId] = useState<number | null>(
    initialSubfaseId
  );

  // Load fases on component mount
  useEffect(() => {
    loadFases();
  }, [loadFases]);

  // If a subfase is initially selected, make sure the corresponding fase is selected
  useEffect(() => {
    if (initialSubfaseId && !selectedFaseId) {
      // Find which fase contains this subfase
      for (const fase of fases) {
        if (!fasesDetail[fase.id]) continue;

        const subfases = fasesDetail[fase.id].subFases || [];
        const matchingSubfase = subfases.find(
          (subfase) => subfase.id === initialSubfaseId
        );

        if (matchingSubfase) {
          handleFaseClick(fase);
          break;
        }
      }
    }
  }, [initialSubfaseId, fases, fasesDetail, selectedFaseId, handleFaseClick]);

  // Handle fase selection
  const handleFaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const faseId = parseInt(e.target.value);
    if (faseId) {
      const selectedFase = fases.find((fase) => fase.id === faseId);
      if (selectedFase) {
        handleFaseClick(selectedFase);
      }
    } else {
      setSelectedFaseId(null);
    }
    setSelectedSubfaseId(null);
    onFilterChange(null);
  };

  // Handle subfase selection
  const handleSubfaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subfaseId = parseInt(e.target.value);
    setSelectedSubfaseId(subfaseId || null);
    onFilterChange(subfaseId || null);
  };

  // Get subfases from the selected fase
  const subfases =
    (selectedFaseId && fasesDetail[selectedFaseId]?.subFases) || [];

  // Handle clear filters
  const handleClearFilters = () => {
    setSelectedFaseId(null);
    setSelectedSubfaseId(null);
    onFilterChange(null);
  };

  const hasActiveFilters =
    selectedFaseId !== null || selectedSubfaseId !== null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 transition-all duration-300">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium text-gray-900">Filtrar Turnos</h2>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 flex items-center"
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
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <label
              htmlFor="fase"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Módulo
            </label>
            <div className="relative">
              <select
                id="fase"
                className="block w-full rounded-md border-gray-300 shadow-sm 
                         focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10
                         transition-all duration-200 py-2.5"
                value={selectedFaseId || ""}
                onChange={handleFaseChange}
                disabled={isLoadingFases}
              >
                <option value="">Todos los módulos</option>
                {fases.map((fase) => (
                  <option key={fase.id} value={fase.id}>
                    {fase.nombre}
                  </option>
                ))}
              </select>
              {isLoadingFases && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600">
                    <div className="w-full h-full rounded-full border-2 border-transparent border-t-blue-600 animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-1/2">
            <label
              htmlFor="subfase"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Sub-módulo
            </label>
            <div className="relative">
              <select
                id="subfase"
                className="block w-full rounded-md border-gray-300 shadow-sm 
                         focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10
                         transition-all duration-200 py-2.5
                         disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                value={selectedSubfaseId || ""}
                onChange={handleSubfaseChange}
                disabled={isLoadingSubFases || !selectedFaseId}
              >
                <option value="">
                  {selectedFaseId
                    ? "Todos los sub-módulos"
                    : "Seleccione un módulo primero"}
                </option>
                {subfases.map((subfase) => (
                  <option key={subfase.id} value={subfase.id}>
                    {subfase.nombre}
                  </option>
                ))}
              </select>
              {isLoadingSubFases && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600">
                    <div className="w-full h-full rounded-full border-2 border-transparent border-t-blue-600 animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-3 bg-red-50 p-3 rounded-md border border-red-100 flex items-start">
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error.message}</span>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
            <div className="text-sm text-gray-600 mr-2">Filtros activos:</div>
            {selectedFaseId && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {fases.find((fase) => fase.id === selectedFaseId)?.nombre ||
                  "Módulo"}
              </span>
            )}
            {selectedSubfaseId && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {subfases.find((subfase) => subfase.id === selectedSubfaseId)
                  ?.nombre || "Sub-módulo"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
