import { EvaluacionDetalle } from "../pages/EvaluacionDetallePage/types";
import type { Evaluacion } from "../pages/EvaluacionesPage/types";
import type { PaginatedResponse } from "../types/common.types";
import { api } from "./api";

// Types
export interface GetEvaluacionesByFilterParams {
  personaId: string;
  property?: string;
  idTurno?: number;
}

export interface CreateEvaluacionRequest {
  nombre: string;
  recomendacion: string;
  categoria: string;
  codEvaluador: number;
  calificaciones: Array<{
    idManiobra: number;
    nota: string;
    causa: string;
    observacion: string;
    recomendacion: string;
  }>;
}

export type EvaluacionesResponse = PaginatedResponse<Evaluacion>;

export interface CategoriaEvaluacion {
  value: string;
  label: string;
}

export const CATEGORIAS_MAP: Record<string, string> = {
  Ponderada: "Ponderada",
  Chequeo: "Chequeo",
  chequeoSubFase: "Chequeo Sub Fase",
  Complementacion: "Complementación"
};

export const evaluacionesService = {
  async getEvaluacionesByFilter({
    personaId,
    property = "codigo",
    idTurno,
  }: GetEvaluacionesByFilterParams): Promise<Evaluacion[]> {
    let url = `/evaluaciones/filter/persona/${personaId}?property=${property}`;

    if (idTurno !== undefined) {
      url += `&idTurno=${idTurno}`;
    }

    const response = await api.get<EvaluacionesResponse>(url);
    return response.data.content;
  },

  async getEvaluacionDetalle(evaluacionId: string): Promise<EvaluacionDetalle> {
    const response = await api.get<EvaluacionDetalle>(
      `/evaluaciones/${evaluacionId}`
    );
    return response.data;
  },

  async createEvaluacion(
    turnoId: number,
    personaId: string,
    data: CreateEvaluacionRequest
  ): Promise<EvaluacionDetalle> {
    const response = await api.post<EvaluacionDetalle>(
      `/evaluaciones/turno/${turnoId}/persona/${personaId}`,
      data
    );
    return response.data;
  },

  async getCategoriasEvaluacion(personaId: string): Promise<CategoriaEvaluacion[]> {
    const response = await api.get<string[]>(`/personas/${personaId}/status`);
    return response.data.map(categoria => ({
      value: categoria,
      label: CATEGORIAS_MAP[categoria] || categoria
    }));
  }
};
