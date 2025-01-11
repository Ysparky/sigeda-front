import type { PaginatedResponse, TurnoResponse } from '../pages/TurnosPage/types';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

export const turnosService = {
  async getTurnosBySubFase(subFaseId: string): Promise<TurnoResponse[]> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_URL}/api/turnos/subfase/${subFaseId}/programa/PDI/grupo/2`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error('Error al obtener los turnos');
    }

    const data: PaginatedResponse = await response.json();
    return data.content;
  },
}; 