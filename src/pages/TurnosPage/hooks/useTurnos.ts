import { useState, useEffect } from 'react';
import { turnosService } from '../../../services/turnos.service';
import { useUserInfo } from '../../../hooks/useUserInfo';
import type { TurnoResponse } from '../types';

export function useTurnos(subModulo: string | undefined) {
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userInfo } = useUserInfo();

  const loadTurnos = async () => {
    if (!subModulo || !userInfo) return;
    
    try {
      setIsLoading(true);
      const data = await turnosService.getTurnosBySubFase(subModulo, userInfo);
      setTurnos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los turnos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTurnos();
  }, [subModulo, userInfo]);

  return { turnos, isLoading, error, loadTurnos };
} 