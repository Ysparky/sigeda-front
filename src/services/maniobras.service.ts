import { AxiosError } from "axios";
import { api } from "./api";

// Types
export interface Maniobra {
  id: number;
  nombre: string;
  descripcion: string;
  checked?: boolean;
  nota_min?: string;
}

export interface ManiobraWithDetails extends Maniobra {
  subfase?: {
    id: number;
    nombre: string;
    descripcion: string;
  };
}

export const maniobrasService = {
  async getManiobrasBySubFase(subfaseId: number): Promise<Maniobra[]> {
    try {
      const response = await api.get<Maniobra[]>(
        `/maniobras/subfase/${subfaseId}`
      );
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return [];
      }
      throw error;
    }
  },
};
