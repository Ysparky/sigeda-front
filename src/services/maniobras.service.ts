export interface Maniobra {
  id: number;
  nombre: string;
  descripcion: string;
}

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

export const maniobrasService = {
  async getManiobrasBySubFase(subfaseId: number): Promise<Maniobra[]> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/maniobras/subfase/${subfaseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error('Error al obtener las maniobras');
    }

    return response.json();
  },
}; 