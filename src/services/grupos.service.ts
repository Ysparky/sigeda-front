const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("API URL not defined in environment variables");
}

export interface Persona {
  codigo: string;
  nombre: string;
  idGrupo: number;
  estado: string;
  aPaterno: string;
  aMaterno: string;
}

interface Alumno {
  aMaterno: string;
  aPaterno: string;
  codigo: string;
  nombre: string;
  idGrupo: number;
  estado: string;
}

interface GrupoResponse {
  personas: Alumno[];
}

export interface Grupo {
  personas: Persona[];
}

export const gruposService = {
  async getGruposByPrograma(programa: string): Promise<Grupo[]> {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(`${API_URL}/api/grupos/programa/${programa}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error("Error al obtener los grupos");
    }

    return response.json();
  },

  async getAlumnosByInstructor(instructorId: string): Promise<Alumno[]> {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL
      }/api/grupos/instructor/${instructorId}/programa/PDI`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Error al obtener alumnos");
    }

    const data: GrupoResponse[] = await response.json();
    return data[0]?.personas || [];
  },
};
