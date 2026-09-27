import { ESTADOS_ALUMNO, NOTAS_DEL_PROMEDIO } from './vocabulario'

export const TEXTO_ORDEN_MERITO_SIN_COEFICIENTES =
  'El orden de mérito necesita el índice final del PDI, y ése depende de la tabla de coeficientes de misión que el PDI no publica. Se muestra solo en modo mock.'
export const TEXTO_SIN_ALUMNOS_ASIGNADOS =
  'No tiene alumnos asignados en este programa: aparecen aquí cuando haya volado un turno con ellos.'
export const TEXTO_SIN_GRUPO = 'Sin grupo'
export const TEXTO_ESTADO_TEORICO_EN_LOTE = 'No se pudo comprobar el estado teórico de estos alumnos.'
export const TEXTO_SIN_ALUMNOS_EN_PROGRAMA = 'Todavía no hay alumnos en este programa.'
export const TEXTO_ALUMNOS_SIN_COINCIDENCIAS = 'Ningún alumno coincide con los filtros.'
export const TEXTO_SIN_ALERTAS = 'No hay alertas abiertas en los grupos que usted ve.'
export const TEXTO_ALERTAS_SIN_SERVIDOR =
  'El listado de alertas del escuadrón todavía no existe en el servidor. Consulte los vuelos desaprobados de cada alumno en su legajo.'
export const TEXTO_MEDIA_SIMPLE_SUBFASE =
  'Promedio simple de las evaluaciones Ponderada y Chequeo Sub Fase de esta subfase. No es la nota de sub fase del PDI, que pondera cada misión por su coeficiente.'
export const TEXTO_EVALUADOR_SIN_CODIGO = 'El servidor guarda el nombre del evaluador, no su código.'
export const TEXTO_TURNO_SIN_CANTIDAD =
  'La cantidad de alumnos del turno no está disponible: el servidor informa otro campo.'
export const TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR = 'El cambio de estado lo decide el servidor en la próxima evaluación.'
export const TEXTO_ESTADO_YA_CAMBIO = 'El estado ya cambió: los contadores no se moverán hasta que vuelva a Apto.'
export const TEXTO_CHEQUEO_SIN_SERVIDOR = 'El historial de chequeos y los contadores todavía no existen en el servidor.'
export const TEXTO_SIN_DATOS_SUFICIENTES = 'Sin datos suficientes'
export const TEXTO_INDICES_SIN_SERVIDOR = 'El servidor todavía no calcula los índices del PDI.'
/** El motivo lo manda el servidor en `nia.motivo`; esto es el respaldo si no lo mandara. */
export const TEXTO_SIN_COEFICIENTES_DE_MISION =
  'Falta la tabla de coeficientes de misión del PDI: sin ella no se puede calcular el índice final.'
export const TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR =
  'El historial de exámenes teóricos todavía no existe en el servidor.'
export const TEXTO_ESTADO_TEORICO_SIN_SERVIDOR = 'El estado teórico y sus causales todavía no existen en el servidor.'
export const TEXTO_NOTA_QUE_PREVALECE = NOTAS_DEL_PROMEDIO.cuenta.etiqueta
export const TEXTO_NOTA_QUE_NO_CUENTA = NOTAS_DEL_PROMEDIO.noCuenta.etiqueta

export const TEXTO_PREVALECE_LA_PRIMERA_NOTA =
  'Prevalece la primera nota: es la que entra en el promedio. La subsanación levanta el bloqueo para volar y queda como evidencia.'
export const TEXTO_DESEMPATE = 'Desempate: mayor NIA y, si persiste, menor código.'
export const TEXTO_SIN_ALUMNOS_CON_INDICES = 'Todavía no hay alumnos con índices calculados en este programa.'
export const TEXTO_ORDEN_MERITO_SIN_SERVIDOR = 'El servidor todavía no calcula el orden de mérito.'
export const TEXTO_REQUIERE_ATENCION = 'Requiere atención'
export const TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR = 'Los vuelos desaprobados los consulta su instructor.'

export const TEXTO_SIN_PROMEDIOS_PONDERADOS = 'Esta sub fase no tiene evaluaciones ponderadas.'
export const TEXTO_SIN_CHEQUEOS = 'Todavía no rindió ningún chequeo.'
export const TEXTO_SIN_CAUSALES = 'No tiene causales de bajo rendimiento académico.'
export const TEXTO_SIN_DESAPROBADOS = 'No tiene vuelos desaprobados.'
export const TEXTO_SIN_TURNOS_DEL_ALUMNO = 'Todavía no tiene turnos de vuelo registrados.'
export const TEXTO_SIN_EXAMENES_DEL_ALUMNO = 'Todavía no rindió exámenes teóricos.'
export const TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE = 'No tiene evaluaciones en esta sub fase.'
export const TEXTO_SIN_SUBFASE_ELEGIDA = 'Elija una sub fase para ver su reporte y sus promedios.'
export const TEXTO_SIN_SEGUNDA_NOTA = 'Sin segunda nota: la subsanación está pendiente.'
export const TEXTO_MITAD_TEORICA = 'Mitad teórica (NIT)'
export const TEXTO_MITAD_PRACTICA = 'Mitad práctica (NIA)'
export const TEXTO_SIN_COEFICIENTE_APLICADO = 'Sin coeficiente aplicado por falta de nota:'

export function etiquetaDeGrupo(idGrupo: number | null): string {
  return idGrupo === null ? TEXTO_SIN_GRUPO : `Grupo ${idGrupo}`
}

export function etiquetaDeGrupoConNombre(idGrupo: number | null, nombre: string | null): string {
  const derivada = etiquetaDeGrupo(idGrupo)
  if (idGrupo === null) return derivada
  const limpio = (nombre ?? '').trim()
  return limpio === '' || limpio === derivada ? derivada : `${derivada} · ${limpio}`
}

export function textoCriterioCumplido(fase: string, detalle: string): string {
  return `Alcanzó el criterio de chequeo de ${fase}: ${detalle}.`
}

export function textoOrdenDeMeritoConsultado(fecha: string, hora: string): string {
  return `Orden de mérito consultado el ${fecha} a las ${hora}. El servidor lo calcula en cada consulta.`
}

export function textoSinNfpi(detalle: string): string {
  // Los motivos que manda el servidor ya terminan en punto, así que agregar otro producía
  // 'Sin NFPI: …AeroTácticas..'. Se recorta el punto final y se pone exactamente uno.
  const limpio = detalle.trim().replace(/\.+$/, '')
  return limpio === '' ? 'Sin NFPI.' : `Sin NFPI: ${limpio}.`
}

export function textoRegularAlternado(alternado: boolean): string {
  return alternado
    ? 'El próximo calificativo Regular contará para el criterio.'
    : 'El próximo calificativo Regular no contará: solo cuentan los Regulares alternados.'
}

export const TIPOS_ALERTA = [
  { valor: 'VUELO_DESAPROBADO', etiqueta: 'Vuelo desaprobado' },
  { valor: 'ESTADO_CRITICO', etiqueta: 'Estado crítico' },
  { valor: 'CHEQUEO_PENDIENTE', etiqueta: 'Chequeo pendiente' },
  { valor: 'SUBSANACION_PENDIENTE', etiqueta: 'Subsanación pendiente' },
  { valor: 'CAUSAL_TEORICO', etiqueta: 'Causal teórico' },
] as const

export type TipoAlerta = (typeof TIPOS_ALERTA)[number]['valor']

export const SEVERIDADES = [
  { valor: 'ALTA', etiqueta: 'Alta', ordinal: 1 },
  { valor: 'MEDIA', etiqueta: 'Media', ordinal: 2 },
  { valor: 'BAJA', etiqueta: 'Baja', ordinal: 3 },
] as const

export type Severidad = (typeof SEVERIDADES)[number]['valor']

export function etiquetaDeTipoAlerta(valor: string): string {
  return TIPOS_ALERTA.find((tipo) => tipo.valor === valor)?.etiqueta ?? valor
}

export function etiquetaDeSeveridad(valor: string): string {
  return SEVERIDADES.find((severidad) => severidad.valor === valor)?.etiqueta ?? valor
}

export function ordinalDeSeveridad(valor: string): number {
  return SEVERIDADES.find((severidad) => severidad.valor === valor)?.ordinal ?? SEVERIDADES.length + 1
}

export const CAUSALES_TEORICOS = [
  { valor: 'PROMEDIO_ASIGNATURA', etiqueta: 'Promedio de asignatura bajo 13' },
  { valor: 'TRES_ASIGNATURAS', etiqueta: 'Tres asignaturas desaprobadas' },
  { valor: 'DOS_EXAMENES', etiqueta: 'Dos exámenes desaprobados' },
  { valor: 'SEGUNDA_SUBSANACION', etiqueta: 'Segunda subsanación desaprobada' },
  { valor: 'PERIODICOS_CRITICOS', etiqueta: 'Periódicos de emergencias y límites' },
  { valor: 'PERIODICOS_GENERALES', etiqueta: 'Periódicos generales' },
  { valor: 'INOPINADOS', etiqueta: 'Inopinados desaprobados' },
] as const

export type CausalTeorico = (typeof CAUSALES_TEORICOS)[number]['valor']

export function etiquetaDeCausal(valor: string): string {
  return CAUSALES_TEORICOS.find((causal) => causal.valor === valor)?.etiqueta ?? valor
}

export const CRITERIOS_CHEQUEO = {
  1: ['3 vuelos Malos', '2 Malos y 2 Regulares alternados', '1 Malo y 4 Regulares alternados', '6 Regulares alternados'],
  2: ['2 vuelos Malos', '1 Malo y 2 Regulares alternados', '4 Regulares alternados'],
} as const

export type Criterio = 1 | 2

export function criterioDeFase(fase: string): Criterio {
  return fase === 'Operaciones AeroTácticas' ? 2 : 1
}

export function ramasDeCriterio(criterio: Criterio): readonly string[] {
  return CRITERIOS_CHEQUEO[criterio]
}

export const INDICES = [
  { clave: 'NFPI', etiqueta: 'NFPI', formula: 'NIT (0.2) + NIA (0.8)' },
  { clave: 'NIT', etiqueta: 'NIT', formula: 'NCT (0.8) + NEI (0.2)' },
  { clave: 'NCT', etiqueta: 'NCT', formula: 'Σ (NA × coeficiente)' },
  { clave: 'NEI', etiqueta: 'NEI', formula: 'Σ (notas) / cantidad rendida' },
  { clave: 'NIA', etiqueta: 'NIA', formula: 'NFAD (0.40) + NFOH (0.35) + NFOA (0.25)' },
] as const

export function formulaDeIndice(clave: string): string {
  return INDICES.find((indice) => indice.clave === clave)?.formula ?? ''
}

export function requiereAtencion(estado: string): boolean {
  return estado !== 'Apto'
}

export function resumirEstados(estados: readonly string[]): { estado: string; cantidad: number }[] {
  const conocidos = Object.keys(ESTADOS_ALUMNO)
  const orden = [...conocidos, ...estados.filter((estado) => !conocidos.includes(estado))]
  return [...new Set(orden)]
    .map((estado) => ({ estado, cantidad: estados.filter((candidato) => candidato === estado).length }))
    .filter((fila) => fila.cantidad > 0)
}

function sinTildes(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function coincideTexto(valor: string, buscado: string): boolean {
  return sinTildes(valor).includes(sinTildes(buscado.trim()))
}

export function mediaSimple(valores: readonly number[]): number | null {
  if (valores.length === 0) return null
  return valores.reduce((suma, valor) => suma + valor, 0) / valores.length
}

export const ETIQUETAS_PESTANA = { resumen: 'Resumen', practico: 'Práctico', teorico: 'Teórico' } as const
