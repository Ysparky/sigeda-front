import { EvaluacionDetalle } from "../pages/EvaluacionDetallePage/types";
import type { Evaluacion } from "../pages/EvaluacionesPage/types";
import { api } from "./api";

// Types
export interface GetEvaluacionesParams {
  personaId: string;
  turnoId: string;
}

export const evaluacionesService = {
  async getEvaluacionesByPersonaAndTurno({
    personaId,
    turnoId,
  }: GetEvaluacionesParams): Promise<Evaluacion[]> {
    const response = await api.get<Evaluacion[]>(
      `/evaluaciones/persona/${personaId}/turno/${turnoId}`
    );
    return response.data;
  },

  async getEvaluacionDetalle(evaluacionId: string): Promise<EvaluacionDetalle> {
    const response = await api.get<EvaluacionDetalle>(
      `/evaluaciones/${evaluacionId}`
    );
    return response.data;
  },
};
