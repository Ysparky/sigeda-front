import type { EvaluacionDetalle } from '../pages/EvaluacionDetallePage/types';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

export const evaluacionDetalleService = {
  async getEvaluacionDetalle(codigo: string): Promise<EvaluacionDetalle> {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(
      `${API_URL}/api/evaluaciones/${codigo}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener el detalle de la evaluación');
    }

    return response.json();
  },
}; 