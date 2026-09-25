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
} as const

export type Vocabulario = keyof typeof VOCABULARIOS

export function termino(vocabulario: Vocabulario, valor: string): Termino {
  const tabla: Record<string, Termino> = VOCABULARIOS[vocabulario]
  return tabla[valor] ?? { etiqueta: valor, tono: 'neutro' }
}
