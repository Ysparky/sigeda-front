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

interface TurnoDetail {
  id: number;
  programa: string;
  fechaEval: string;
  turnoManiobras: {
    nota_min: string;
    maniobra: {
      id: number;
      descripcion: string;
      nombre: string;
    };
  }[];
  grupoTurnos: {
    instructor: string;
    codInstructor: string;
    grupo: {
      id: number;
      personas: {
        aMaterno: string;
        aPaterno: string;
        codigo: string;
        nombre: string;
        idGrupo: number;
        estado: string;
      }[];
      nombre: string;
    };
  }[];
  fase: string;
  nombre: string;
  subfase: string;
}

interface UpdateTurnoRequest {
  nombre: string;
  fechaEval: string;
  grupoTurnos: {
    codInstructor: number;
    idGrupo: number;
    checked: boolean;
  }[];
  turnoManiobras: {
    idManiobra: number;
    checked: boolean;
    nota_min: string;
  }[];
}

interface UpdateTurnoResponse {
  mensaje: string;
  turno: string[];
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

  async deleteTurno(turnoId: number): Promise<{ mensaje: string }> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/turnos/${turnoId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 403) {
      throw new Error('403: No tiene permisos para realizar esta acción');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`${response.status}: ${data.mensaje || 'Error al eliminar el turno'}`);
    }

    return data;
  },

  async getTurno(turnoId: number): Promise<TurnoDetail> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/turnos/${turnoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener el turno');
    }

    return response.json();
  },

  async updateTurno(turnoId: number, data: UpdateTurnoRequest): Promise<UpdateTurnoResponse> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/turnos/${turnoId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.mensaje || 'Error al actualizar el turno');
    }

    return responseData;
  },
}; 