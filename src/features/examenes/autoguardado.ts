import type { ExamenEnCurso, RespuestaDeExamen } from './api'

export const DEBOUNCE_AUTOGUARDADO = 2_000
export const MAXIMO_AUTOGUARDADO = 10_000
export const PASO_DEL_RELOJ = 1_000
export const UMBRAL_GUARDADO_INMEDIATO = DEBOUNCE_AUTOGUARDADO + PASO_DEL_RELOJ

export type Respuestas = Record<number, string>

export type EstadoGuardado = 'limpio' | 'guardando' | 'guardado' | 'error'

export function respuestasIniciales(examen: ExamenEnCurso): Respuestas {
  const iniciales: Respuestas = {}
  for (const pregunta of examen.preguntas) {
    if (pregunta.respuestaAlumno !== null) iniciales[pregunta.idPregunta] = pregunta.respuestaAlumno
  }
  return iniciales
}

export function contarRespondidas(respuestas: Respuestas): number {
  return Object.values(respuestas).filter((valor) => valor.trim() !== '').length
}

export function aRespuestasEnviadas(respuestas: Respuestas): RespuestaDeExamen[] {
  return Object.entries(respuestas)
    .filter(([, respuesta]) => respuesta.trim() !== '')
    .map(([idPregunta, respuesta]) => ({ idPregunta: Number(idPregunta), respuesta }))
}
