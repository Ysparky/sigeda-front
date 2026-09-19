export const NOTAS_DIRBE = ['D', 'I', 'R', 'B', 'E'] as const

export type NotaDirbe = (typeof NOTAS_DIRBE)[number]

const OPCIONES_POR_NOTA_MINIMA: Record<NotaDirbe, readonly NotaDirbe[]> = {
  D: ['D'],
  I: ['I', 'R'],
  R: ['I', 'R', 'B'],
  B: ['I', 'R', 'B', 'E'],
  E: ['I', 'R', 'B', 'E'],
}

const BAJO_EL_ESTANDAR = new Set(['RI', 'BI', 'BR'])
const SOBRE_EL_ESTANDAR = new Set(['IR', 'RB', 'BE'])

export function esNotaDirbe(valor: unknown): valor is NotaDirbe {
  return typeof valor === 'string' && (NOTAS_DIRBE as readonly string[]).includes(valor)
}

export function opcionesDeNota(notaMinima: NotaDirbe): readonly NotaDirbe[] {
  return OPCIONES_POR_NOTA_MINIMA[notaMinima]
}

export function esCalificacionValida(notaMinima: NotaDirbe, nota: string): boolean {
  return (OPCIONES_POR_NOTA_MINIMA[notaMinima] as readonly string[]).includes(nota)
}

export function esBajoEstandar(notaMinima: string, nota: string): boolean {
  return BAJO_EL_ESTANDAR.has(`${notaMinima}${nota}`)
}

export function esSobreEstandar(notaMinima: string, nota: string): boolean {
  return SOBRE_EL_ESTANDAR.has(`${notaMinima}${nota}`)
}

export type ConteoEstandar = { bajo: number; sobre: number; sinCalificar: number }

export function contarRespectoAlEstandar(calificaciones: readonly { notaMin: string; nota: string }[]): ConteoEstandar {
  return calificaciones.reduce<ConteoEstandar>(
    (conteo, { notaMin, nota }) => ({
      bajo: conteo.bajo + (esBajoEstandar(notaMin, nota) ? 1 : 0),
      sobre: conteo.sobre + (esSobreEstandar(notaMin, nota) ? 1 : 0),
      sinCalificar: conteo.sinCalificar + (nota === '' ? 1 : 0),
    }),
    { bajo: 0, sobre: 0, sinCalificar: 0 },
  )
}
