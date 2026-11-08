export type SituacionFinalMock = 'EGRESADO' | 'DESAPROBADO' | 'RETIRADO' | 'NO_CULMINO'

export type ResultadoFinalMock = {
  codAlumno: string
  idGrupo: number
  situacion: SituacionFinalMock
  fecha: string
  observacion: string | null
  nit: number | null
  nia: number | null
  nfpi: number | null
  puesto: number | null
  horasVuelo: number | null
  horasSimulador: number | null
  constancia: string | null
}

let resultados: ResultadoFinalMock[] = []

export const resultadosFinales = () => resultados
export const resultadoDe = (cod: string) => resultados.find((r) => r.codAlumno === cod)
export const egresoDe = (cod: string) => resultadoDe(cod)?.situacion === 'EGRESADO'

export function registrarResultado(resultado: ResultadoFinalMock) {
  resultados = [...resultados.filter((r) => r.codAlumno !== resultado.codAlumno), resultado]
}

export function reiniciarResultadosFinales() {
  resultados = []
}
