import { useEffect, useState } from 'react';
import { fasesService, type Fase } from '../../../services/fases.service';

export function useFases() {
  const [fases, setFases] = useState<Fase[]>([]);
  const [selectedFase, setSelectedFase] = useState<Fase | null>(null);
  const [isLoadingFases, setIsLoadingFases] = useState(true);
  const [isLoadingSubFases, setIsLoadingSubFases] = useState(false);
  const [fasesError, setFasesError] = useState<string | null>(null);
  const [subFasesError, setSubFasesError] = useState<string | null>(null);
  const [fasesCache, setFasesCache] = useState<Record<number, Fase>>({});

  const loadFases = async () => {
    try {
      setIsLoadingFases(true);
      setFasesError(null);
      const data = await fasesService.getFases();
      setFases(data);
    } catch (err) {
      setFasesError('Error al cargar los módulos');
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

    setSelectedFase(fase);

    if (fasesCache[fase.id]) {
      setSelectedFase(fasesCache[fase.id]);
      return;
    }

    try {
      setIsLoadingSubFases(true);
      setSubFasesError(null);
      const faseDetail = await fasesService.getFaseById(fase.id);
      
      setFasesCache(prev => ({
        ...prev,
        [fase.id]: faseDetail
      }));
      
      setSelectedFase(faseDetail);
    } catch (err) {
      setSubFasesError('Error al cargar los sub-módulos');
      console.error(err);
      setSelectedFase(fase);
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
    fasesError,
    subFasesError,
    loadFases,
    handleFaseClick
  };
} 