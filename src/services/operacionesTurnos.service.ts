import type { TurnoResponse } from "../pages/TurnosPage/types";
import type { PaginatedResponse } from "../types/common.types";
import { api } from "./api";

// Types
export interface GetTurnosParams {
  page?: number;
  size?: number;
}

export type TurnoOperacionesResponse = PaginatedResponse<TurnoResponse>;

export const operacionesTurnosService = {
  async getAllTurnos({
    page = 0,
    size = 10,
  }: GetTurnosParams = {}): Promise<TurnoOperacionesResponse> {
    const response = await api.get<TurnoOperacionesResponse>("/turnos", {
      params: {
        page,
        size,
      },
    });
    return response.data;
  },
};
