import { AxiosError } from "axios";
import type { PaginatedResponse } from "../types/common.types";
import { api } from "./api";

// Types
export interface PersonaBase {
  codigo: string;
  nombre: string;
  estado: string;
  aPaterno: string;
  aMaterno: string;
  idGrupo?: number;
}

export type Persona = PersonaBase;
export type Alumno = PersonaBase;

export interface GrupoResponse {
  personas: Alumno[];
}

export interface Grupo {
  id: number;
  nombre: string;
  programa: string;
  personas: Persona[];
}

export interface Instructor {
  codigo: string;
  nombre: string;
  aPaterno: string;
  aMaterno: string;
}

export type AlumnosResponse = PaginatedResponse<GrupoResponse>;

export const gruposService = {
  async getGruposByPrograma(programa: string): Promise<Grupo[]> {
    try {
      const response = await api.get<Grupo[]>(`/alumnos/programa/${programa}`);
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  async getInstructoresByPrograma(programa: string): Promise<Instructor[]> {
    try {
      const response = await api.get<Instructor[]>(
        `/personas/instructor/Instructor ${programa}`
      );
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  async getAlumnosByInstructor(instructorId: string): Promise<Alumno[]> {
    const response = await api.get<AlumnosResponse>(
      `/grupos/instructor/${instructorId}/programa/PDI`
    );

    // Flatten all personas arrays from all grupos into a single array of alumnos
    return response.data.content.reduce<Alumno[]>((acc, grupo) => {
      return [...acc, ...grupo.personas];
    }, []);
  },
};
