import { AxiosError } from "axios";
import type { PaginatedResponse } from "../pages/TurnosPage/types";
import type { UserInfo } from "../types/auth.types";
import { CreateTurnoResponse } from "../types/turno.types";
import { api } from "./api";

// Types
export interface Maniobra {
  id: number;
  descripcion: string;
  nombre: string;
}

export interface TurnoManiobra {
  idManiobra: number;
  nota_min: string;
  checked?: boolean;
  maniobra?: Maniobra;
}

export interface GrupoTurno {
  codInstructor: number;
  idGrupo: number;
  checked?: boolean;
  instructor?: string;
  grupo?: {
    id: number;
    nombre: string;
    personas: {
      aMaterno: string;
      aPaterno: string;
      codigo: string;
      nombre: string;
      idGrupo: number;
      estado: string;
    }[];
  };
}

export interface CreateTurnoRequest {
  nombre: string;
  fechaEval: string;
  programa: string;
  idSubFase: number;
  grupoTurnos: GrupoTurno[];
  turnoManiobras: TurnoManiobra[];
}

export interface TurnoDetail {
  id: number;
  programa: string;
  fechaEval: string;
  turnoManiobras: TurnoManiobra[];
  grupoTurnos: GrupoTurno[];
  fase: string;
  nombre: string;
  subfase: string;
}

export type UpdateTurnoRequest = Omit<
  CreateTurnoRequest,
  "programa" | "idSubFase"
>;

export interface UpdateTurnoResponse {
  mensaje: string;
  turno: string[];
}

export interface GetTurnosParams {
  page?: number;
  size?: number;
}

export const turnosService = {
  async getTurnosBySubFase(
    subfaseId: string,
    userInfo: UserInfo,
    params: GetTurnosParams = { page: 0, size: 10 }
  ): Promise<PaginatedResponse> {
    try {
      const response = await api.get<PaginatedResponse>(
        `/turnos/subfase/${subfaseId}/programa/PDI/grupo/${userInfo.idGrupo}`,
        { params }
      );
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: params.size || 10,
          number: params.page || 0
        };
      }
      throw error;
    }
  },

  async getTurnosByGrupo(
    idGrupo: number,
    idSubfase?: number,
    params: GetTurnosParams = { page: 0, size: 10 }
  ): Promise<PaginatedResponse> {
    try {
      const response = await api.get<PaginatedResponse>(
        `/turnos?idGrupo=${idGrupo}${idSubfase ? `&idSubfase=${idSubfase}` : ""}`,
        { params }
      );
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: params.size || 10,
          number: params.page || 0
        };
      }
      throw error;
    }
  },

  async createTurno(data: CreateTurnoRequest): Promise<CreateTurnoResponse> {
    const response = await api.post<CreateTurnoResponse>("/turnos", data);
    return response.data;
  },

  async deleteTurno(turnoId: number): Promise<{ mensaje: string }> {
    try {
      const response = await api.delete<{ mensaje: string }>(
        `/turnos/${turnoId}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        throw new Error("403: No tiene permisos para realizar esta acción");
      }
      throw error;
    }
  },

  async getTurno(turnoId: number): Promise<TurnoDetail> {
    const response = await api.get<TurnoDetail>(`/turnos/${turnoId}`);
    return response.data;
  },

  async updateTurno(
    turnoId: number,
    data: UpdateTurnoRequest
  ): Promise<UpdateTurnoResponse> {
    const response = await api.put<UpdateTurnoResponse>(
      `/turnos/${turnoId}`,
      data
    );
    return response.data;
  },
};
