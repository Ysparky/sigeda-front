import type { PaginatedResponse, TurnoResponse } from '../pages/TurnosPage/types';
import type { UserInfo } from '../types/auth.types';
import { CreateTurnoResponse } from '../types/turno.types';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

interface CreateTurnoRequest {
  nombre: string;
  fechaEval: string;
  programa: string;
  idSubFase: number;
  grupoTurnos: {
    codInstructor: number;
    idGrupo: number;
  }[];
  turnoManiobras: {
    idManiobra: number;
    nota_min: string;
  }[];
}


export const turnosService = {
  async getTurnosBySubFase(subfaseId: string, userInfo: UserInfo): Promise<TurnoResponse[]> {
    const token = localStorage.getItem('auth_token');
    console.log('Making API call with:', { subfaseId, userInfo });

    const response = await fetch(
      `${API_URL}/api/turnos/subfase/${subfaseId}/programa/PDI/grupo/${userInfo.idGrupo}`,
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

  async createTurno(data: CreateTurnoRequest): Promise<CreateTurnoResponse> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/turnos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.mensaje || 'Error al crear el turno');
    }

    return responseData;
  },
}; 