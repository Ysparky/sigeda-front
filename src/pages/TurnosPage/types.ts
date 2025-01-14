export interface TurnoResponse {
  id: number;
  nombre: string;
  cantGrupo: number;
  cantManiobra: number;
  fase: string;
  programa: string;
  fechaEval: string;
}

export interface PaginatedResponse {
  content: TurnoResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type SortOption = 'alfabetico' | 'fecha' | 'maniobras'; 