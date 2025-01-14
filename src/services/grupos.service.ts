export interface Persona {
  codigo: string;
  nombre: string;
  idGrupo: number;
  estado: string;
  aPaterno: string;
  aMaterno: string;
}

export interface Grupo {
  personas: Persona[];
}

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

export const gruposService = {
  async getGruposByPrograma(programa: string): Promise<Grupo[]> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/grupos/programa/${programa}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error('Error al obtener los grupos');
    }

    return response.json();
  },
}; 