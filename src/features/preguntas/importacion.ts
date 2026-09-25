import type { Pregunta } from '@/features/aprendizaje/api'
import type { ErroresDeCampo } from '@/lib/api/errors'
import {
  MARCADOR_COMPLETAR,
  MENSAJE_RESPUESTA_OBLIGATORIA,
  TEXTO_ALTERNATIVAS_REPETIDAS,
  TEXTO_ENUNCIADO_CORTO,
  TEXTO_ENUNCIADO_RECORTADO,
  TEXTOS_VERDADERO_FALSO,
  type Dificultad,
  type TipoPregunta,
} from '@/lib/dominio/teoria'
import { rutaDeCampo } from '@/lib/formularios'
import type { CuerpoPregunta } from './api'
import { MENSAJE_ENUNCIADO } from './schemas'

export const LARGO_ENUNCIADO = 500
export const LARGO_RESPUESTA = 200

export const TEXTO_SIN_CORRECTA = 'El modelo no marcó ninguna alternativa como correcta: elija la correcta.'
export const TEXTO_REPETIDA_EN_LOTE = 'La pregunta está repetida en este lote: corrija el enunciado o quítela.'
export const TEXTO_FALTA_MARCADOR = `El enunciado de una pregunta de completar debe incluir el marcador ${MARCADOR_COMPLETAR}.`

export type FilaImportacion = {
  id: string
  incluida: boolean
  enunciado: string
  tipoPregunta: TipoPregunta
  dificultad: Dificultad
  idMateria: string
  explicacion: string
  alternativas: string[]
  correcta: string
  recortado: boolean
}

export function recortar(valor: string, largo: number): string {
  return valor.length > largo ? valor.slice(0, largo) : valor
}

function normalizar(valor: string): string {
  return valor.trim().toLowerCase()
}

function tipoDesdeIa(tipo: Pregunta['type']): TipoPregunta {
  if (tipo === 'true_false') return 'VERDADERO_FALSO'
  return tipo === 'fill_blank' ? 'COMPLETAR' : 'OPCION_MULTIPLE'
}

function alternativasDesdeIa(pregunta: Pregunta): { alternativas: string[]; correcta: string } {
  if (pregunta.type === 'true_false') {
    return {
      alternativas: [...TEXTOS_VERDADERO_FALSO],
      correcta: pregunta.correctAnswer === 'true' ? '0' : '1',
    }
  }
  if (pregunta.type === 'fill_blank') {
    return { alternativas: [recortar(pregunta.correctAnswer, LARGO_RESPUESTA)], correcta: '0' }
  }
  const opciones = pregunta.options ?? []
  const indice = opciones.findIndex((opcion) => opcion.id === pregunta.correctAnswer)
  return {
    alternativas: opciones.map((opcion) => recortar(opcion.text, LARGO_RESPUESTA)),
    correcta: indice < 0 ? '' : String(indice),
  }
}

export function filaDesdeIa(pregunta: Pregunta, idMateria: string, dificultad: Dificultad): FilaImportacion {
  const { alternativas, correcta } = alternativasDesdeIa(pregunta)
  return {
    id: pregunta.id,
    incluida: true,
    enunciado: recortar(pregunta.prompt, LARGO_ENUNCIADO),
    tipoPregunta: tipoDesdeIa(pregunta.type),
    dificultad,
    idMateria,
    explicacion: pregunta.explanation ?? '',
    alternativas,
    correcta,
    recortado: pregunta.prompt.length > LARGO_ENUNCIADO,
  }
}

export function filasDesdeIa(
  preguntas: readonly Pregunta[],
  idMateria: string,
  dificultad: Dificultad,
): FilaImportacion[] {
  return preguntas.map((pregunta) => filaDesdeIa(pregunta, idMateria, dificultad))
}

export function avisosDeFila(fila: FilaImportacion, todas: readonly FilaImportacion[]): string[] {
  const avisos: string[] = []
  if (fila.recortado) avisos.push(TEXTO_ENUNCIADO_RECORTADO)
  const largoEnunciado = fila.enunciado.trim().length
  if (largoEnunciado < 10) avisos.push(TEXTO_ENUNCIADO_CORTO)
  if (largoEnunciado > LARGO_ENUNCIADO) avisos.push(MENSAJE_ENUNCIADO)
  if (fila.tipoPregunta === 'COMPLETAR' && !fila.enunciado.includes(MARCADOR_COMPLETAR)) avisos.push(TEXTO_FALTA_MARCADOR)
  const textos = fila.alternativas.map(normalizar)
  if (textos.some((texto) => texto === '')) avisos.push(MENSAJE_RESPUESTA_OBLIGATORIA)
  const completos = textos.filter((texto) => texto !== '')
  if (new Set(completos).size !== completos.length) avisos.push(TEXTO_ALTERNATIVAS_REPETIDAS)
  if (fila.correcta === '') avisos.push(TEXTO_SIN_CORRECTA)
  const clave = `${normalizar(fila.enunciado)}|${fila.tipoPregunta}`
  const primera = todas.find((otra) => `${normalizar(otra.enunciado)}|${otra.tipoPregunta}` === clave)
  if (primera !== undefined && primera.id !== fila.id) avisos.push(TEXTO_REPETIDA_EN_LOTE)
  return avisos
}

export function filaImportable(fila: FilaImportacion, todas: readonly FilaImportacion[]): boolean {
  return avisosDeFila(fila, todas).length === 0
}

export function aCuerpoDeLote(filas: readonly FilaImportacion[]): Omit<CuerpoPregunta, 'codInstructor'>[] {
  return filas.map((fila) => ({
    idMateria: Number(fila.idMateria),
    enunciado: fila.enunciado.trim(),
    tipoPregunta: fila.tipoPregunta,
    dificultad: fila.dificultad,
    explicacion: fila.explicacion.trim() === '' ? null : fila.explicacion.trim(),
    alternativas: fila.alternativas.map((respuesta, indice) => ({
      respuesta: respuesta.trim(),
      correcto: String(indice) === fila.correcta,
    })),
  }))
}

export function erroresPorFila(
  errores: ErroresDeCampo,
  filasEnviadas: readonly FilaImportacion[],
): Record<string, string> {
  const porFila: Record<string, string> = {}
  for (const [campo, mensaje] of Object.entries(errores)) {
    const indice = Number(rutaDeCampo(campo).split('.')[1])
    const fila = filasEnviadas[indice]
    if (fila) porFila[fila.id] = mensaje
  }
  return porFila
}
