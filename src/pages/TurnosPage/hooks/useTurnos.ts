import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import type { TurnoResponse, PaginatedResponse } from '../types';

export function useTurnos(subModulo: string | undefined) {
  const [turnos, setTurnos] = useState<TurnoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const loadTurnos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/turnos/subfase/${subModulo}/programa/PDI/grupo/2`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.status === 404) {
        setTurnos([]);
        return;
      }

      if (!response.ok) {
        throw new Error('Error al cargar los turnos');
      }

      const data: PaginatedResponse = await response.json();
      setTurnos(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los turnos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTurnos();
  }, [subModulo]);

  return { turnos, isLoading, error, loadTurnos };
} 