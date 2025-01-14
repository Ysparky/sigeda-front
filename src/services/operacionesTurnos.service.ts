import type { TurnoResponse } from '../pages/TurnosPage/types';
import type { PaginatedResponse } from '../types/common.types';

const API_URL = import.meta.env.VITE_API_URL;

export const operacionesTurnosService = {
  async getAllTurnos(): Promise<TurnoResponse[]> {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_URL}/api/turnos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener los turnos');
    }

    const data: PaginatedResponse<TurnoResponse> = await response.json();
    return data.content;
  },
}; 