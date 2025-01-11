import type { SortOption } from '../types';

interface SearchSortProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function SearchSort({ searchTerm, onSearchChange, sortBy, onSortChange }: SearchSortProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* Search Bar */}
      <div className="relative w-full sm:w-96">
        <input
          type="text"
          placeholder="¿Qué necesitas? Ej: Nombre de alumno"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 pl-10 pr-4 rounded-lg border border-gray-300 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex gap-2">
        <button
          onClick={() => onSortChange('alfabetico')}
          className={`px-3 py-1 rounded-md text-sm ${
            sortBy === 'alfabetico' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alfabético
        </button>
        <button
          onClick={() => onSortChange('fecha')}
          className={`px-3 py-1 rounded-md text-sm ${
            sortBy === 'fecha' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Fecha
        </button>
        <button
          onClick={() => onSortChange('conteo')}
          className={`px-3 py-1 rounded-md text-sm ${
            sortBy === 'conteo' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Maniobras
        </button>
      </div>
    </div>
  );
} 