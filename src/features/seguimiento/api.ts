import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { nombreCompleto, type Programa } from '@/features/catalogos/api'
import { aNota } from '@/features/evaluaciones/api'
import { ApiError } from '@/lib/api/errors'
import { todasLasPaginas, type Pagina, type ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import type { Permiso } from '@/lib/auth/permisos'
import { coincideTexto } from '@/lib/dominio/seguimiento'

const TAMANO_CATALOGO = 100

export type AlumnoSeguimiento = { codigo: string; nombreCompleto: string; idGrupo: number | null; estado: string }

export type FuenteSeguimiento = 'todos' | 'instructor'

export type FiltrosEscuadron = ParametrosPagina & {
  programa: Programa
  idGrupo?: number
  estado?: string
  texto?: string
}

export type EstadoTeoricoResumen = {
  codAlumno: string
  alumno: string
  bloqueadoPorSubsanacion: boolean
  motivo: string | null
}

export type ChequeoFinal = {
  codigo: string
  fecha: string
  tipo: string
  resultado: string
  contadores: { chequeo: number; evaluaciones: number; malos: number; regulares: number }
  codEvaluacion: string
  idSubfase: number
  subfase: string
}

export type Causal = {
  codigo: string
  idMateria: number | null
  materia: string | null
  grupo: string[] | null
  detalle: string
  fecha: string
}

export type EstadoTeoricoDelAlumno = EstadoTeoricoResumen & {
  desaprobados: {
    idCuestionario: number
    idTurnoTeorico: number
    turnoTeorico: string
    idMateria: number
    materia: string
    tipoExamen: string
    fechaExamen: string
    nota: number | null
    notaMinimaAplicada: number
  }[]
  // Opcional a propósito, y el motivo cambió: cuando se escribió esto el backend NO mandaba
  // `causales[]` y la pantalla estallaba contra el servidor real haciendo `.length` sobre `undefined`.
  // **Hoy SÍ las manda**, con la forma exacta de `Causal` (verificado contra el servidor el 27 sep
  // 2026, dependencia 68 ya cerrada). Se deja opcional porque la ruta responde sin el campo cuando el
  // alumno no tiene ninguna, no porque el servidor no sepa mandarlo.
  causales?: Causal[]
}

export type ExamenDelHistorial = {
  id: number
  idTurnoTeorico: number
  turnoTeorico: string
  idMateria: number
  materia: string
  tipoExamen: string
  fechaExamen: string
  estado: string
  fechaEntrega: string | null
  horaEntrega: string | null
  nota: number | null
  notaMinimaAplicada: number
  aprobado: boolean | null
  idTurnoOrigen: number | null
  turnoOrigen: string | null
  subsanadoPor: { idTurnoTeorico: number; turnoTeorico: string; fechaExamen: string; estado: string; nota: number | null } | null
}

export type FiltrosHistorialTeorico = ParametrosPagina & { idMateria?: number; estado?: string }

type AlumnoApi = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  idGrupo: number | null
  estado: string
}

export function fuenteDeSeguimiento(permisos: ReadonlySet<Permiso>): FuenteSeguimiento | null {
  if (permisos.has('View All Groups')) return 'todos'
  if (permisos.has('View My Group')) return 'instructor'
  return null
}

function aAlumnoSeguimiento(persona: AlumnoApi): AlumnoSeguimiento {
  return {
    codigo: persona.codigo,
    nombreCompleto: nombreCompleto(persona),
    idGrupo: persona.idGrupo ?? null,
    estado: persona.estado,
  }
}

function sinRepetidos(alumnos: readonly AlumnoSeguimiento[]): AlumnoSeguimiento[] {
  const vistos = new Set<string>()
  return alumnos.filter((alumno) => {
    if (vistos.has(alumno.codigo)) return false
    vistos.add(alumno.codigo)
    return true
  })
}

function todasLasFilas<T>(ruta: string): Promise<T[]> {
  return todasLasPaginas<T>((parametros) => sigeda.pagina<T>(ruta, parametros), TAMANO_CATALOGO)
}

export async function listarSeguimiento(
  fuente: FuenteSeguimiento,
  programa: Programa,
  codPersona: string | null,
): Promise<AlumnoSeguimiento[]> {
  if (fuente === 'todos') {
    const grupos = await todasLasFilas<{ personas: AlumnoApi[] }>(
      `/api/grupos/programa/${encodeURIComponent(programa)}`,
    )
    return sinRepetidos(grupos.flatMap((grupo) => grupo.personas.map(aAlumnoSeguimiento)))
  }
  if (!codPersona) return []
  const filas = await todasLasFilas<{ persona: AlumnoApi[] | AlumnoApi }>(
    `/api/grupos/instructor/${encodeURIComponent(codPersona)}/programa/${encodeURIComponent(programa)}`,
  )
  return sinRepetidos(
    filas.flatMap((fila) => (Array.isArray(fila.persona) ? fila.persona : [fila.persona]).map(aAlumnoSeguimiento)),
  )
}

export function filtrarAlumnos(
  alumnos: readonly AlumnoSeguimiento[],
  filtros: FiltrosEscuadron,
): AlumnoSeguimiento[] {
  return alumnos.filter(
    (alumno) =>
      (filtros.idGrupo === undefined || alumno.idGrupo === filtros.idGrupo) &&
      (filtros.estado === undefined || alumno.estado === filtros.estado) &&
      (filtros.texto === undefined || coincideTexto(alumno.nombreCompleto, filtros.texto)),
  )
}

const CAMPOS_ORDENABLES = ['codigo', 'nombreCompleto', 'idGrupo', 'estado'] as const

export function ordenarAlumnos(
  alumnos: readonly AlumnoSeguimiento[],
  property: string | undefined,
  direction: 'ASC' | 'DESC',
): AlumnoSeguimiento[] {
  const campo = CAMPOS_ORDENABLES.find((candidato) => candidato === property) ?? 'codigo'
  const signo = direction === 'DESC' ? -1 : 1
  return [...alumnos].sort(
    (izquierda, derecha) =>
      signo *
      String(izquierda[campo] ?? '').localeCompare(String(derecha[campo] ?? ''), 'es', { numeric: true }),
  )
}

export function paginarAlumnos(
  alumnos: readonly AlumnoSeguimiento[],
  filtros: FiltrosEscuadron,
): Pagina<AlumnoSeguimiento> {
  const visibles = ordenarAlumnos(filtrarAlumnos(alumnos, filtros), filtros.property, filtros.direction)
  const size = Math.max(filtros.size, 1)
  return {
    items: visibles.slice(filtros.page * size, filtros.page * size + size),
    page: filtros.page,
    size,
    total: visibles.length,
    totalPages: Math.max(Math.ceil(visibles.length / size), 1),
  }
}

export async function estadoTeoricoEnLote(codigos: readonly string[]): Promise<EstadoTeoricoResumen[]> {
  if (codigos.length === 0) return []
  return sigeda.lista<EstadoTeoricoResumen>('/api/estado-teorico', { codAlumnos: [...codigos].join(',') })
}

export function listarChequeos(codPersona: string): Promise<ChequeoFinal[]> {
  return sigeda.lista<ChequeoFinal>(`/api/personas/${encodeURIComponent(codPersona)}/chequeos`)
}

export function obtenerEstadoTeorico(codPersona: string): Promise<EstadoTeoricoDelAlumno> {
  return sigeda.get<EstadoTeoricoDelAlumno>(`/api/personas/${encodeURIComponent(codPersona)}/estado-teorico`)
}

export function listarHistorialTeorico(
  codAlumno: string,
  filtros: FiltrosHistorialTeorico,
): Promise<Pagina<ExamenDelHistorial>> {
  return sigeda.pagina<ExamenDelHistorial>('/api/cuestionarios', {
    codAlumno,
    idMateria: filtros.idMateria,
    estado: filtros.estado,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property ?? 'fechaExamen',
    direction: filtros.direction ?? 'DESC',
  })
}

export const MENSAJE_CODIGO_INVALIDO = 'El código de la persona debe tener seis caracteres.'

export type Desaprobado = {
  codigo: string
  clasificacion: string
  subfase: string
  fecha: string
  programa: string
  idSubfase: number
}

export async function listarDesaprobados(codPersona: string): Promise<Desaprobado[]> {
  if (codPersona.length !== 6) throw new Error(MENSAJE_CODIGO_INVALIDO)
  return sigeda.lista<Desaprobado>(`/api/desaprobados/persona/${encodeURIComponent(codPersona)}`)
}

export type CuentaDeAlumno = { nombre: string; correo: string | null } | null

export type DetalleAlumno = {
  dni: string
  nombre: string
  aPaterno: string
  aMaterno: string
  rango: string | null
  estado: string
  usuario: CuentaDeAlumno
}

export type BloqueDeChequeo = {
  fase: string
  criterio: number
  criterioCumplido: boolean
  detalle: string
  cuentaConEsteEstado: boolean
}

export type Legajo = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  dni: string
  rango: string | null
  tipo: string | null
  estado: string
  grupo: { id: number; nombre: string; programa: string } | null
  usuario: CuentaDeAlumno
  contadores: { chequeo: number; evaluaciones: number; malos: number; regulares: number }
  chequeo: BloqueDeChequeo
  ultimaEvaluacion: { codigo: string; fecha: string; clasificacion: string | null; estadoAlumno: string } | null
}

export type NotaDeSubfase = {
  codigo: string
  categoria: string
  clasificacion: string | null
  promedio: number | null
  recomendacion: string | null
  calificaciones: { notaMin: string; nota: string }[]
}

export type ReporteDeSubfase = {
  cabecera: { fase: string; subFase: string; programa: string; alumno: string }
  maniobras: { id: number; nombre: string }[]
  notas: NotaDeSubfase[]
}

export type PromedioDeSubfase = { codigo: string; promedio: number | null }

type NotaApi = Omit<NotaDeSubfase, 'promedio'> & { promedio: string | number | null }

/**
 * Esta ruta serializaba sus apellidos como `apaterno`/`amaterno` en minúscula —no como `APaterno`,
 * que es lo que el contrato decía y lo que este adaptador remapeaba—, así que la cabecera del legajo
 * mostraba «Pedro undefined undefined» para TODOS los alumnos contra el servidor real. Se corrigió
 * en el backend renombrando los getters de `DetallePersona`, y el remapeo sobra: ahora llegan
 * `aPaterno` y `aMaterno` como en todas las demás rutas.
 */
export async function obtenerAlumno(codPersona: string): Promise<DetalleAlumno> {
  const detalle = await sigeda.get<DetalleAlumno>(`/api/personas/${encodeURIComponent(codPersona)}/alumno`)
  return { ...detalle, usuario: detalle.usuario ?? null }
}

export function obtenerLegajo(codPersona: string): Promise<Legajo> {
  return sigeda.get<Legajo>(`/api/personas/${encodeURIComponent(codPersona)}/legajo`)
}

export async function obtenerReporteDeSubfase(idSubfase: number, codPersona: string): Promise<ReporteDeSubfase | null> {
  try {
    const reporte = await sigeda.get<Omit<ReporteDeSubfase, 'notas'> & { notas: NotaApi[] }>(
      `/api/evaluaciones/subfase/${encodeURIComponent(idSubfase)}/persona/${encodeURIComponent(codPersona)}`,
    )
    return { ...reporte, notas: reporte.notas.map((nota) => ({ ...nota, promedio: aNota(nota.promedio) })) }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function listarPromediosDeSubfase(idSubfase: number, codPersona: string): Promise<PromedioDeSubfase[]> {
  const promedios = await sigeda.lista<{ codigo: string; promedio: string | number | null }>(
    `/api/evaluaciones/promedio/subfase/${encodeURIComponent(idSubfase)}/persona/${encodeURIComponent(codPersona)}`,
  )
  return promedios.map((fila) => ({ codigo: fila.codigo, promedio: aNota(fila.promedio) }))
}

export type Alerta = {
  id: string
  tipo: string
  severidad: string
  codAlumno: string
  alumno: string
  idGrupo: number | null
  grupo: string
  programa: string
  fecha: string | null
  detalle: string
  codEvaluacion: string | null
  idSubfase: number | null
  idMateria: number | null
  idCuestionario: number | null
  causal: string | null
}

export type FiltrosAlertas = ParametrosPagina & {
  programa: Programa
  idGrupo?: number
  tipo?: string
  fechaPre?: string
  fechaPost?: string
}

export function listarAlertas(filtros: FiltrosAlertas): Promise<Pagina<Alerta>> {
  return sigeda.pagina<Alerta>('/api/seguimiento/alertas', {
    programa: filtros.programa,
    idGrupo: filtros.idGrupo,
    tipo: filtros.tipo,
    fechaPre: filtros.fechaPre,
    fechaPost: filtros.fechaPost,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
}

export function subfaseElegida(idSubfase: number | undefined): boolean {
  return (idSubfase ?? 0) > 0
}

export const clavesSeguimiento = {
  todo: ['seguimiento'] as const,
  alumnos: (fuente: FuenteSeguimiento, programa: Programa, codPersona: string | null) =>
    [...clavesSeguimiento.todo, 'alumnos', fuente, programa, codPersona] as const,
  estadoTeorico: (codigos: readonly string[]) =>
    [...clavesSeguimiento.todo, 'estado-teorico', [...codigos].sort()] as const,
  estadoTeoricoDe: (codPersona: string) => [...clavesSeguimiento.todo, 'estado-teorico-de', codPersona] as const,
  chequeos: (codPersona: string) => [...clavesSeguimiento.todo, 'chequeos', codPersona] as const,
  historialTeorico: (codAlumno: string, filtros: FiltrosHistorialTeorico) =>
    [...clavesSeguimiento.todo, 'historial-teorico', codAlumno, filtros] as const,
  desaprobados: (codPersona: string) => [...clavesSeguimiento.todo, 'desaprobados', codPersona] as const,
  alumno: (codPersona: string) => [...clavesSeguimiento.todo, 'alumno', codPersona] as const,
  legajo: (codPersona: string) => [...clavesSeguimiento.todo, 'legajo', codPersona] as const,
  reporteDeSubfase: (idSubfase: number, codPersona: string) =>
    [...clavesSeguimiento.todo, 'reporte-subfase', idSubfase, codPersona] as const,
  promediosDeSubfase: (idSubfase: number, codPersona: string) =>
    [...clavesSeguimiento.todo, 'promedios-subfase', idSubfase, codPersona] as const,
  alertas: (filtros: FiltrosAlertas) => [...clavesSeguimiento.todo, 'alertas', filtros] as const,
}

export const consultasSeguimiento = {
  alumnos: (fuente: FuenteSeguimiento, programa: Programa, codPersona: string | null) =>
    queryOptions({
      queryKey: clavesSeguimiento.alumnos(fuente, programa, codPersona),
      queryFn: () => listarSeguimiento(fuente, programa, codPersona),
      staleTime: 300_000,
    }),
  estadoTeorico: (codigos: readonly string[]) =>
    queryOptions({
      queryKey: clavesSeguimiento.estadoTeorico(codigos),
      queryFn: () => estadoTeoricoEnLote(codigos),
      retry: false,
    }),
  estadoTeoricoDe: (codPersona: string) =>
    queryOptions({
      queryKey: clavesSeguimiento.estadoTeoricoDe(codPersona),
      queryFn: () => obtenerEstadoTeorico(codPersona),
      enabled: codPersona !== '',
    }),
  chequeos: (codPersona: string) =>
    queryOptions({
      queryKey: clavesSeguimiento.chequeos(codPersona),
      queryFn: () => listarChequeos(codPersona),
      enabled: codPersona !== '',
    }),
  historialTeorico: (codAlumno: string, filtros: FiltrosHistorialTeorico) =>
    queryOptions({
      queryKey: clavesSeguimiento.historialTeorico(codAlumno, filtros),
      queryFn: () => listarHistorialTeorico(codAlumno, filtros),
      enabled: codAlumno !== '',
    }),
  desaprobados: (codPersona: string) =>
    queryOptions({
      queryKey: clavesSeguimiento.desaprobados(codPersona),
      queryFn: () => listarDesaprobados(codPersona),
    }),
  alumno: (codPersona: string) =>
    queryOptions({
      queryKey: clavesSeguimiento.alumno(codPersona),
      queryFn: () => obtenerAlumno(codPersona),
      enabled: codPersona !== '',
    }),
  legajo: (codPersona: string) =>
    queryOptions({
      queryKey: clavesSeguimiento.legajo(codPersona),
      queryFn: () => obtenerLegajo(codPersona),
      enabled: codPersona !== '',
    }),
  reporteDeSubfase: (idSubfase: number, codPersona: string) =>
    queryOptions({
      queryKey: clavesSeguimiento.reporteDeSubfase(idSubfase, codPersona),
      queryFn: () => obtenerReporteDeSubfase(idSubfase, codPersona),
      enabled: subfaseElegida(idSubfase) && codPersona !== '',
    }),
  promediosDeSubfase: (idSubfase: number, codPersona: string) =>
    queryOptions({
      queryKey: clavesSeguimiento.promediosDeSubfase(idSubfase, codPersona),
      queryFn: () => listarPromediosDeSubfase(idSubfase, codPersona),
      enabled: subfaseElegida(idSubfase) && codPersona !== '',
    }),
  alertas: (filtros: FiltrosAlertas) =>
    queryOptions({
      queryKey: clavesSeguimiento.alertas(filtros),
      queryFn: () => listarAlertas(filtros),
      placeholderData: keepPreviousData,
    }),
}
