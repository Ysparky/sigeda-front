import type { FilterOption } from "../types";

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterBy: FilterOption;
  onFilterChange: (value: FilterOption) => void;
  totalResults?: number;
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
  filterBy,
  onFilterChange,
  totalResults = 0,
}: SearchFilterProps) {
  // Map filter options to display names
  const filterOptions: Record<FilterOption, string> = {
    fecha: "Fecha",
    clasificacion: "Clasificación",
    calificacion: "Calificación",
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 transition-all duration-300">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              placeholder="Buscar evaluaciones..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 pl-10 pr-4 rounded-lg border border-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Results counter */}
          {searchTerm && (
            <div className="text-sm text-gray-600 animate-fade-in">
              {totalResults} resultado{totalResults !== 1 ? "s" : ""} encontrado
              {totalResults !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="text-sm text-gray-600 mr-2 flex items-center">
            Filtrar por:
          </div>
          {Object.entries(filterOptions).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onFilterChange(key as FilterOption)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                filterBy === key
                  ? "bg-blue-100 text-blue-700 shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
