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

export type EvaluacionesResponse = PaginatedResponse<Evaluacion>;

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
};
