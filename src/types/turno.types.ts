interface GrupoTurno {
  idTurno: number;
  idGrupo: number;
  codInstructor: string;
  instructor: string | null;
  checked: boolean;
  turno: null;
  grupo: null;
}

interface TurnoManiobra {
  idTurno: number;
  idManiobra: number;
  nota_min: string;
  checked: boolean;
  maniobra: null;
}

export interface TurnoDetalle {
  id: number;
  nombre: string;
  fase: string;
  subfase: string;
  fechaEval: string;
  idSubFase: number;
  programa: string;
  cantGrupo: number;
  cantManiobra: number;
  grupoTurnos: GrupoTurno[];
  turnoManiobras: TurnoManiobra[];
}

export interface CreateTurnoResponse {
  mensaje: string;
  turno: TurnoDetalle;
} 