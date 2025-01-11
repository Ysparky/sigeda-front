import type { Evaluacion } from '../pages/EvaluacionesPage/types';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

export const evaluacionesService = {
  async getEvaluacionesByPersonaAndTurno(personaId: string, turnoId: string): Promise<Evaluacion[]> {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(
      `${API_URL}/api/evaluaciones/persona/${personaId}/turno/${turnoId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener las evaluaciones');
    }

    return response.json();
  },
}; 