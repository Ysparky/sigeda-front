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

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Filtrar Turnos</h2>
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10"
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600">
                  <div className="w-full h-full rounded-full border-2 border-transparent border-t-green-600 animate-pulse"></div>
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10"
              value={selectedSubfaseId || ""}
              onChange={handleSubfaseChange}
              disabled={isLoadingSubFases || !selectedFaseId}
            >
              <option value="">Todos los sub-módulos</option>
              {subfases.map((subfase) => (
                <option key={subfase.id} value={subfase.id}>
                  {subfase.nombre}
                </option>
              ))}
            </select>
            {isLoadingSubFases && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600">
                  <div className="w-full h-full rounded-full border-2 border-transparent border-t-green-600 animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mt-3 bg-red-50 p-2 rounded">
          {error.message}
        </div>
      )}
    </div>
  );
}
