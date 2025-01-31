import { api } from "./api";

// Types
export interface SubFase {
  id: number;
  nombre: string;
  descripcion: string;
  maniobras?: Maniobra[];
}

export interface Maniobra {
  id: number;
  nombre: string;
  descripcion: string;
  checked?: boolean;
}

export const subfasesService = {
  async getAssignedSubFases(): Promise<SubFase[]> {
    const response = await api.get<SubFase[]>("/subfases/assigned");
    return response.data;
  },
};
