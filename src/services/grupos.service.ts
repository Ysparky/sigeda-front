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

export const gruposService = {
  async getAlumnosByInstructor(instructorId: string ): Promise<Alumno[]> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/grupos/instructor/${instructorId}/programa/PDI`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener alumnos');
    }

    const data: GrupoResponse[] = await response.json();
    return data[0]?.personas || [];
  },
}; 