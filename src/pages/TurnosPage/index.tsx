import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { TurnosList } from './components/TurnosList';
import { SearchSort } from './components/SearchSort';
import { EmptyState } from './components/EmptyState';
import { useTurnos } from './hooks/useTurnos';
import type { SortOption } from './types';

function TurnosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('fecha');
  
  const { subModulo } = useParams();
  const { turnos, isLoading, error, loadTurnos } = useTurnos(subModulo);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadTurnos}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Programación de Turnos
        </h1>
        <p className="text-gray-600">
          Gestiona y visualiza los turnos programados
        </p>
      </div>

      {turnos.length > 0 && (
        <SearchSort
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : turnos.length === 0 ? (
        <EmptyState />
      ) : (
        <TurnosList
          turnos={turnos}
          searchTerm={searchTerm}
          sortBy={sortBy}
        />
      )}
    </div>
  );
}

export default TurnosPage; 