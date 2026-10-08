import { formatearFecha, formatearNota } from '@/lib/formato'
import { momento } from './calendario'

export { MARCADOR_COMPLETAR, TEXTO_GENERACION_RECHAZADA as TEXTO_GENERACION_RECHAZADA_E8 } from './aprendizaje'

export const TIPOS_PREGUNTA = [
  { valor: 'OPCION_MULTIPLE', etiqueta: 'Opción múltiple' },
  { valor: 'VERDADERO_FALSO', etiqueta: 'Verdadero o falso' },
  { valor: 'COMPLETAR', etiqueta: 'Completar' },
] as const

export const DIFICULTADES = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'ALTA', etiqueta: 'Alta' },
] as const

export const ORIGENES_PREGUNTA = [
  { valor: 'MANUAL', etiqueta: 'Manual' },
  { valor: 'IA', etiqueta: 'IA' },
] as const

export const TIPOS_EXAMEN = [
  { valor: 'TEST', etiqueta: 'Test' },
  { valor: 'EXAMEN', etiqueta: 'Examen' },
  { valor: 'SEMANAL', etiqueta: 'Semanal' },
  { valor: 'QUINCENAL', etiqueta: 'Quincenal' },
  { valor: 'MENSUAL', etiqueta: 'Mensual' },
  { valor: 'SEMESTRAL', etiqueta: 'Semestral' },
  { valor: 'INOPINADO', etiqueta: 'Inopinado' },
  { valor: 'PRE_SOLO', etiqueta: 'Pre-Solo' },
  { valor: 'SUBSANACION', etiqueta: 'Subsanación' },
  { valor: 'REZAGADO', etiqueta: 'Rezagado' },
  { valor: 'BALOTAS', etiqueta: 'Balotas' },
] as const

export const ESTADOS_TURNO = ['PROGRAMADO', 'EN_CURSO', 'FINALIZADO'] as const

export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number]['valor']
export type Dificultad = (typeof DIFICULTADES)[number]['valor']
export type OrigenPregunta = (typeof ORIGENES_PREGUNTA)[number]['valor']
export type TipoExamen = (typeof TIPOS_EXAMEN)[number]['valor']
export type EstadoTurnoTeorico = (typeof ESTADOS_TURNO)[number]
export type EstadoRendicion = 'NO_RINDIO' | 'EN_CURSO' | 'ENTREGADO'

export const MENSAJE_MATERIA_OBLIGATORIA = 'La materia es obligatoria.'
export const MENSAJE_RESPUESTA_OBLIGATORIA = 'La respuesta es obligatoria.'

export const PUNTAJE_TOTAL_EXAMEN = 20
export const VENTANA_MINIMA_MINUTOS = 10

// La cantidad por defecto que propone el autogenerado: cinco preguntas de cuatro puntos es el reparto
// más limpio de los 20, y es el que trae la semilla.
export const CANTIDAD_AUTOGENERADA_POR_DEFECTO = 5

/**
 * Reparte `total` puntos en `cantidad` enteros ≥ 1 lo más parejos posible: los primeros `resto` llevan
 * uno más. El esquema del examen exige puntajes enteros entre 1 y 20 que sumen 20, así que repartir en
 * partes iguales no alcanza cuando 20 no es divisible por la cantidad (p. ej. 7 → 3,3,3,3,3,3,2).
 * Fuera de 1..total no hay reparto posible con enteros ≥ 1, y devuelve una lista vacía.
 */
export function distribuirPuntaje(cantidad: number, total = PUNTAJE_TOTAL_EXAMEN): number[] {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > total) return []
  const base = Math.floor(total / cantidad)
  const resto = total % cantidad
  return Array.from({ length: cantidad }, (_, indice) => (indice < resto ? base + 1 : base))
}

/**
 * Elige `cantidad` elementos distintos al azar con un Fisher–Yates parcial. `aleatorio` se inyecta para
 * poder probar la selección de forma determinista.
 */
export function elegirAlAzar<T>(items: readonly T[], cantidad: number, aleatorio: () => number = Math.random): T[] {
  const copia = items.slice()
  const tope = Math.max(0, Math.min(cantidad, copia.length))
  for (let i = 0; i < tope; i++) {
    const j = i + Math.floor(aleatorio() * (copia.length - i))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia.slice(0, tope)
}

export function minutosEntre(horaInicio: string, horaFin: string): number {
  const [hi, mi] = horaInicio.split(':').map(Number)
  const [hf, mf] = horaFin.split(':').map(Number)
  return hf * 60 + mf - (hi * 60 + mi)
}

export const AVISO_MINUTOS_RESTANTES = 5
export const TEXTOS_VERDADERO_FALSO = ['Verdadero', 'Falso'] as const

function etiqueta(opciones: readonly { valor: string; etiqueta: string }[], valor: string): string {
  return opciones.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor
}

export function etiquetaDeTipoPregunta(valor: string): string {
  return etiqueta(TIPOS_PREGUNTA, valor)
}

export function etiquetaDeDificultad(valor: string): string {
  return etiqueta(DIFICULTADES, valor)
}

export function etiquetaDeOrigen(valor: string): string {
  return etiqueta(ORIGENES_PREGUNTA, valor)
}

export function etiquetaDeTipoExamen(valor: string): string {
  return etiqueta(TIPOS_EXAMEN, valor)
}

export function alternativasRequeridas(tipo: TipoPregunta): number {
  if (tipo === 'OPCION_MULTIPLE') return 4
  return tipo === 'VERDADERO_FALSO' ? 2 : 1
}

export function exigeTurnoOrigen(tipo: string): boolean {
  return tipo === 'SUBSANACION' || tipo === 'REZAGADO'
}

export function estadoDeVentana(
  fechaExamen: string,
  horaInicio: string,
  horaFin: string,
  ahora: Date = new Date(),
): EstadoTurnoTeorico {
  if (ahora < momento(fechaExamen, horaInicio)) return 'PROGRAMADO'
  return ahora > momento(fechaExamen, horaFin) ? 'FINALIZADO' : 'EN_CURSO'
}

export function milisegundosRestantes(fechaExamen: string, horaFin: string, ahora: Date = new Date()): number {
  return Math.max(momento(fechaExamen, horaFin).getTime() - ahora.getTime(), 0)
}

export function formatearRestante(milisegundos: number): string {
  const total = Math.max(Math.floor(milisegundos / 1000), 0)
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundos = total % 60
  const dosDigitos = (valor: number) => String(valor).padStart(2, '0')
  return horas > 0
    ? `${horas}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`
    : `${dosDigitos(minutos)}:${dosDigitos(segundos)}`
}

export function textoConMinimo(nota: number | null, minimo: number): string {
  return `${formatearNota(nota)} / mínimo ${minimo}`
}

export const TEXTO_TEORIA_SOLO_MOCK =
  'El módulo de teoría todavía no existe en el servidor: estas pantallas funcionan solo en modo mock.'
export const TEXTO_PREGUNTA_EN_USO = 'La pregunta se usa en un turno teórico y no se puede eliminar.'
export const TEXTO_SIN_PREGUNTAS = 'Todavía no hay preguntas. Registre una o impórtelas desde un cuestionario de IA.'
export const TEXTO_REVISAR_IMPORTACION =
  'Las preguntas generadas no entran al banco hasta que las revise y confirme la importación.'
export const TEXTO_ENUNCIADO_RECORTADO =
  'El enunciado generado supera los 500 caracteres: se recortó y debe revisarlo antes de importar.'
export const TEXTO_ALTERNATIVAS_REPETIDAS =
  'La pregunta tiene alternativas repetidas: corrija los textos o quítela de la importación.'
export const TEXTO_CONFIRMAR_IMPORTACION = 'Se guardarán todas las preguntas elegidas o ninguna.'
export const TEXTO_VENTANA_COMENZADA = 'El turno teórico ya no se puede modificar porque su ventana comenzó.'
export const TEXTO_SUBSANACION_TARDIA = 'La subsanación debería rendirse dentro de las 24 horas del examen desaprobado.'
export const TEXTO_MATERIA_SIN_PREGUNTAS =
  'La materia elegida no tiene preguntas en el banco. Registre o importe preguntas antes de programar el examen.'
export const TEXTO_AUTOGUARDADO_FALLIDO =
  'No se pudieron guardar las últimas respuestas. Reintente antes de que cierre la ventana.'
export const TEXTO_QUEDAN_CINCO_MINUTOS =
  'Quedan 5 minutos. Al cerrar la ventana el examen se entrega con lo que haya respondido.'
export const TEXTO_VENTANA_CERRADA = 'La ventana del examen cerró y se entregó con las respuestas guardadas.'
export const TEXTO_CONFIRMAR_ENTREGA = 'Se entregará el examen y no podrá cambiar sus respuestas.'
export const TEXTO_RESULTADO_SIN_DETALLE =
  'Verá el detalle de sus respuestas cuando el turno termine; por ahora solo su nota.'
export const TEXTO_SUBSANACION_PENDIENTE =
  'Tiene una subsanación pendiente: no puede programarse en turnos prácticos hasta aprobarla.'
export const TEXTO_ESTADO_TEORICO_DESCONOCIDO = 'No se pudo comprobar el estado teórico de este alumno.'
export const TEXTO_SIN_HABILITADOS = 'El grupo no tiene alumnos habilitados para este examen.'
export const TEXTO_SIN_EXAMENES_PENDIENTES = 'No tiene exámenes teóricos pendientes.'
export const TEXTO_SIN_TURNOS_TEORICOS = 'Todavía no hay turnos teóricos. Programe uno para un grupo y una materia.'
export const TEXTO_ENUNCIADO_CORTO = 'El enunciado generado es demasiado corto: complételo antes de importar.'
export const TEXTO_GUARDANDO = 'Guardando…'
export const TEXTO_GUARDADO = 'Guardado'

export function textoPuntajeAsignado(puntaje: number): string {
  return `Puntaje asignado: ${puntaje} de ${PUNTAJE_TOTAL_EXAMEN}.`
}

export function textoSeHabilita(fechaExamen: string, horaInicio: string): string {
  return `Se habilita el ${formatearFecha(fechaExamen)} a las ${horaInicio}.`
}

export function textoSinResponder(cantidad: number): string {
  return `Quedan ${cantidad} preguntas sin responder: se califican con 0.`
}

export function textoBloqueadoPorSubsanacion(motivo: string): string {
  return `Subsanación pendiente: ${motivo}`
}

export function textoRespondidas(respondidas: number, total: number): string {
  return `Respondidas: ${respondidas} de ${total}.`
}
