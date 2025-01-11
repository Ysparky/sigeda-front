import { useState, useEffect } from 'react';
import { fasesService, type Fase } from '../services/fases.service';
import { useAuth } from '../hooks/useAuth';
import { ModulesList } from '../components/modules/ModulesList';
import { SubModulesList } from '../components/modules/SubModulesList';

function DashboardPage() {
  const [fases, setFases] = useState<Fase[]>([]);
  const [selectedFase, setSelectedFase] = useState<Fase | null>(null);
  const [isLoadingFases, setIsLoadingFases] = useState(true);
  const [isLoadingSubFases, setIsLoadingSubFases] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { username } = useAuth();
  
  // Add cache for fases details
  const [fasesCache, setFasesCache] = useState<Record<number, Fase>>({});

  useEffect(() => {
    loadFases();
  }, []);

  const loadFases = async () => {
    try {
      setIsLoadingFases(true);
      const data = await fasesService.getFases();
      setFases(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los módulos');
      console.error(err);
    } finally {
      setIsLoadingFases(false);
    }
  };

  const handleFaseClick = async (fase: Fase) => {
    if (selectedFase?.id === fase.id) {
      setSelectedFase(null);
      return;
    }

    // Check if we already have the fase details in cache
    if (fasesCache[fase.id]) {
      setSelectedFase(fasesCache[fase.id]);
      return;
    }

    try {
      setIsLoadingSubFases(true);
      const faseDetail = await fasesService.getFaseById(fase.id);
      
      // Save to cache
      setFasesCache(prev => ({
        ...prev,
        [fase.id]: faseDetail
      }));
      
      setSelectedFase(faseDetail);
      setError(null);
    } catch (err) {
      setError('Error al cargar los sub-módulos');
      console.error(err);
    } finally {
      setIsLoadingSubFases(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadFases}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Hola, {username}</h1>
        <p className="text-sm text-gray-600 mt-1">Selecciona un módulo para ver sus sub-módulos</p>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Módulos disponibles</h2>
        <ModulesList
          fases={fases}
          isLoading={isLoadingFases}
          selectedFaseId={selectedFase?.id ?? null}
          onFaseClick={handleFaseClick}
        />
      </div>

      {selectedFase && (
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Sub-módulos de {selectedFase.nombre}
          </h2>
          <SubModulesList
            fase={selectedFase}
            isLoading={isLoadingSubFases}
          />
        </div>
      )}
    </div>
  );
}

export default DashboardPage; 