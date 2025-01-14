import type { TurnoResponse } from '../pages/TurnosPage/types';
import type { PaginatedResponse } from '../types/common.types';

const API_URL = import.meta.env.VITE_API_URL;

interface GetTurnosParams {
  page?: number;
  size?: number;
}

export const operacionesTurnosService = {
  async getAllTurnos({ page = 0, size = 10 }: GetTurnosParams = {}): Promise<PaginatedResponse<TurnoResponse>> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/turnos?page=${page}&size=${size}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener los turnos');
    }

    return response.json();
  },
}; 