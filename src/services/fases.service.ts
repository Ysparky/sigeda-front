import { api } from "./api";

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
    const response = await api.get<Fase[]>("/fases");
    return response.data;
  },

  async getFaseById(id: number): Promise<Fase> {
    const response = await api.get<Fase>(`/fases/${id}`);
    return response.data;
  },
};
