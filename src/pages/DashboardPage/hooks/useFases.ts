import { useState, useEffect } from 'react';
import { fasesService, type Fase } from '../../../services/fases.service';

export function useFases() {
  const [fases, setFases] = useState<Fase[]>([]);
  const [selectedFase, setSelectedFase] = useState<Fase | null>(null);
  const [isLoadingFases, setIsLoadingFases] = useState(true);
  const [isLoadingSubFases, setIsLoadingSubFases] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fasesCache, setFasesCache] = useState<Record<number, Fase>>({});

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

    if (fasesCache[fase.id]) {
      setSelectedFase(fasesCache[fase.id]);
      return;
    }

    try {
      setIsLoadingSubFases(true);
      const faseDetail = await fasesService.getFaseById(fase.id);
      
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

  useEffect(() => {
    loadFases();
  }, []);

  return {
    fases,
    selectedFase,
    isLoadingFases,
    isLoadingSubFases,
    error,
    loadFases,
    handleFaseClick
  };
} 