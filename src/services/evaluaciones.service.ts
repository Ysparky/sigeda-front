import { EvaluacionDetalle } from "../pages/EvaluacionDetallePage/types";
import type { Evaluacion } from "../pages/EvaluacionesPage/types";
import type { PaginatedResponse } from "../types/common.types";
import { api } from "./api";

// Types
export interface GetEvaluacionesParams {
  personaId: string;
  turnoId: string;
}

export type EvaluacionesResponse = PaginatedResponse<Evaluacion>;

export const evaluacionesService = {
  async getEvaluacionesByPersonaAndTurno({
    personaId,
    turnoId,
  }: GetEvaluacionesParams): Promise<Evaluacion[]> {
    const response = await api.get<EvaluacionesResponse>(
      `/evaluaciones/persona/${personaId}/turno/${turnoId}`
    );
    return response.data.content;
  },

  async getEvaluacionDetalle(evaluacionId: string): Promise<EvaluacionDetalle> {
    const response = await api.get<EvaluacionDetalle>(
      `/evaluaciones/${evaluacionId}`
    );
    return response.data;
  },
};
