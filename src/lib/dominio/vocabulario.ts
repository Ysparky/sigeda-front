export type Tono = 'neutro' | 'info' | 'exito' | 'aviso' | 'alerta' | 'peligro' | 'violeta'

export type Termino = { etiqueta: string; tono: Tono; descripcion?: string }

export const CALIFICATIVOS = {
  D: { etiqueta: 'D', tono: 'neutro', descripcion: 'Demostrativo' },
  I: { etiqueta: 'I', tono: 'peligro', descripcion: 'Insuficiente' },
  R: { etiqueta: 'R', tono: 'aviso', descripcion: 'Regular' },
  B: { etiqueta: 'B', tono: 'exito', descripcion: 'Bueno' },
  E: { etiqueta: 'E', tono: 'info', descripcion: 'Excelente' },
} as const satisfies Record<string, Termino>

export const CLASIFICACIONES = {
  Excelente: { etiqueta: 'Excelente', tono: 'info' },
  Bueno: { etiqueta: 'Bueno', tono: 'exito' },
  Regular: { etiqueta: 'Regular', tono: 'aviso' },
  Malo: { etiqueta: 'Malo', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_ALUMNO = {
  Apto: { etiqueta: 'Apto', tono: 'exito' },
  'En Observación': { etiqueta: 'En observación', tono: 'aviso' },
  'En Chequeo': { etiqueta: 'En chequeo', tono: 'alerta' },
  'En Final': { etiqueta: 'En final', tono: 'info' },
  'En Complementación': { etiqueta: 'En complementación', tono: 'violeta' },
  'En Deliberación': { etiqueta: 'En deliberación', tono: 'peligro' },
  'No Apto': { etiqueta: 'No apto', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const RESULTADOS_RESPUESTA = {
  correcta: { etiqueta: 'Correcta', tono: 'exito' },
  incorrecta: { etiqueta: 'Incorrecta', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_DOCUMENTO = {
  uploading: { etiqueta: 'Procesando', tono: 'aviso' },
  processing: { etiqueta: 'Procesando', tono: 'aviso' },
  ready: { etiqueta: 'Listo', tono: 'exito' },
  error: { etiqueta: 'Error', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_TURNO_TEORICO = {
  PROGRAMADO: { etiqueta: 'Programado', tono: 'info' },
  EN_CURSO: { etiqueta: 'En curso', tono: 'aviso' },
  FINALIZADO: { etiqueta: 'Finalizado', tono: 'neutro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_RENDICION = {
  NO_RINDIO: { etiqueta: 'No rindió', tono: 'neutro' },
  EN_CURSO: { etiqueta: 'En curso', tono: 'aviso' },
  ENTREGADO: { etiqueta: 'Entregado', tono: 'exito' },
} as const satisfies Record<string, Termino>

export const SUBSANACION = {
  pendiente: { etiqueta: 'Subsanación pendiente', tono: 'alerta' },
} as const satisfies Record<string, Termino>

export const SEVERIDADES_ALERTA = {
  ALTA: { etiqueta: 'Alta', tono: 'peligro' },
  MEDIA: { etiqueta: 'Media', tono: 'aviso' },
  BAJA: { etiqueta: 'Baja', tono: 'neutro' },
} as const satisfies Record<string, Termino>

export const TIPOS_DE_ALERTA = {
  VUELO_DESAPROBADO: { etiqueta: 'Vuelo desaprobado', tono: 'info' },
  ESTADO_CRITICO: { etiqueta: 'Estado crítico', tono: 'peligro' },
  CHEQUEO_PENDIENTE: { etiqueta: 'Chequeo pendiente', tono: 'aviso' },
  SUBSANACION_PENDIENTE: { etiqueta: 'Subsanación pendiente', tono: 'alerta' },
  CAUSAL_TEORICO: { etiqueta: 'Causal teórico', tono: 'violeta' },
} as const satisfies Record<string, Termino>

export const RESULTADOS_EXAMEN = {
  aprobado: { etiqueta: 'Aprobado', tono: 'exito' },
  desaprobado: { etiqueta: 'Desaprobado', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const NOTAS_DEL_PROMEDIO = {
  cuenta: { etiqueta: 'Esta nota es la que cuenta', tono: 'info' },
  noCuenta: { etiqueta: 'Esta nota no cuenta para el promedio', tono: 'neutro' },
} as const satisfies Record<string, Termino>

export const NIVELES_DE_RIESGO = {
  bajo: { etiqueta: 'Riesgo bajo', tono: 'exito' },
  medio: { etiqueta: 'Riesgo medio', tono: 'aviso' },
  alto: { etiqueta: 'Riesgo alto', tono: 'peligro' },
} as const satisfies Record<string, Termino>

// La banda del motor de proyección, que NO es la clasificación DIRBE de SIGEDA: son tres cortes
// sobre el puntaje proyectado, no las cuatro clases que SIGEDA decide por contadores de notas.
export const BANDAS_DE_PROYECCION = {
  optimo: { etiqueta: 'Óptimo', tono: 'exito' },
  regular: { etiqueta: 'Regular', tono: 'aviso' },
  deficiente: { etiqueta: 'Deficiente', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const TENDENCIAS = {
  up: { etiqueta: 'En ascenso', tono: 'exito' },
  flat: { etiqueta: 'Estable', tono: 'neutro' },
  down: { etiqueta: 'En descenso', tono: 'peligro' },
} as const satisfies Record<string, Termino>

export const ESTADOS_AERONAVE = {
  Disponible: { etiqueta: 'Disponible', tono: 'exito' },
  En_Mantenimiento: { etiqueta: 'En mantenimiento', tono: 'aviso' },
  No_Disponible: { etiqueta: 'No disponible', tono: 'alerta' },
  Desconocido: { etiqueta: 'Desconocido', tono: 'neutro' },
} as const satisfies Record<string, Termino>

export type Calificativo = keyof typeof CALIFICATIVOS
export type Clasificacion = keyof typeof CLASIFICACIONES
export type EstadoAlumno = keyof typeof ESTADOS_ALUMNO

const VOCABULARIOS = {
  calificativo: CALIFICATIVOS,
  clasificacion: CLASIFICACIONES,
  estado: ESTADOS_ALUMNO,
  aeronave: ESTADOS_AERONAVE,
  documento: ESTADOS_DOCUMENTO,
  respuesta: RESULTADOS_RESPUESTA,
  turnoTeorico: ESTADOS_TURNO_TEORICO,
  rendicion: ESTADOS_RENDICION,
  examen: RESULTADOS_EXAMEN,
  notaDelPromedio: NOTAS_DEL_PROMEDIO,
  subsanacion: SUBSANACION,
  severidad: SEVERIDADES_ALERTA,
  tipoAlerta: TIPOS_DE_ALERTA,
  riesgo: NIVELES_DE_RIESGO,
  banda: BANDAS_DE_PROYECCION,
  tendencia: TENDENCIAS,
} as const

export type Vocabulario = keyof typeof VOCABULARIOS

export function termino(vocabulario: Vocabulario, valor: string): Termino {
  const tabla: Record<string, Termino> = VOCABULARIOS[vocabulario]
  return tabla[valor] ?? { etiqueta: valor, tono: 'neutro' }
}
