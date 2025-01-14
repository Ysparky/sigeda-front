export interface SubFase {
  id: number;
  nombre: string;
  descripcion: string;
}

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

export const subfasesService = {
  async getAssignedSubFases(): Promise<SubFase[]> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/subfases/assigned`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener las subfases');
    }

    return response.json();
  },
}; 