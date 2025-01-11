export interface Evaluacion {
  fase: string;
  nombre: string;
  codigo: string;
  clasificacion: string;
  fecha: string;
  promedio: string | null;
  evaluador: string;
  alumno: string;
}

export type FilterOption = 'fecha' | 'clasificacion' | 'calificacion'; 