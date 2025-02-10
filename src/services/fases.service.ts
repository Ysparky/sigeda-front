import type { PaginatedResponse } from "../types/common.types";
import { api } from "./api";

export interface Fase {
  id: number;
  nombre: string;
  descripcion: string;
  subFases?: SubFase[] | null;
}

export interface SubFase {
  id: number;
  nombre: string;
  descripcion: string | null;
  checked: boolean;
  maniobras: unknown | null;
  fase: Fase | null;
}

export type FasesResponse = PaginatedResponse<Fase>;

export const fasesService = {
  async getFases(): Promise<Fase[]> {
    const response = await api.get<FasesResponse>("/fases");
    return response.data.content;
  },

  async getFaseById(id: number): Promise<Fase> {
    const response = await api.get<Fase>(`/fases/${id}`);
    return response.data;
  },
};
