interface Maniobra {
  id: number;
  nombre: string;
  descripcion: string;
  checked: boolean;
  idSubFase: number;
  estandares: null;
}

interface Calificacion {
  codEvaluacion: string;
  idManiobra: number;
  notaMin: string;
  nota: string;
  causa: string;
  observacion: string;
  recomendacion: string;
  catEval: string;
  idSubfase: number;
  maniobra: Maniobra;
}

export interface EvaluacionDetalle {
  codigo: string;
  nombre: string;
  fecha: string;
  programa: string;
  categoria: string;
  clasificacion: string;
  promedio: string;
  recomendacion: string;
  idSubFase: number;
  fase: string;
  subFase: string;
  estadoAlumno: string;
  codEvalPrevia: string;
  codEvaluador: string | null;
  evaluador: string;
  codPersona: string;
  alumno: string;
  calificaciones: Calificacion[];
} 