const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

export interface Fase {
  id: number;
  nombre: string;
  descripcion: string | null;
  subFases: SubFase[] | null;
}

export interface SubFase {
  id: number;
  nombre: string;
  descripcion: string | null;
  checked: boolean;
  maniobras: unknown | null;
  fase: Fase | null;
}

export const fasesService = {
  async getFases(): Promise<Fase[]> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/fases`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener fases');
    }

    return response.json();
  },

  async getFaseById(id: number): Promise<Fase> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/fases/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener fase');
    }

    return response.json();
  },
}; 