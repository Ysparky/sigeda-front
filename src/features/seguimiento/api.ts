import { queryOptions } from '@tanstack/react-query'
import { nombreCompleto, type Programa } from '@/features/catalogos/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import type { Permiso } from '@/lib/auth/permisos'
import { coincideTexto } from '@/lib/dominio/seguimiento'

const TAMANO_CATALOGO = 10

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

async function todasLasPaginas<T>(ruta: string): Promise<T[]> {
  const primera = await sigeda.pagina<T>(ruta, { page: 0, size: TAMANO_CATALOGO })
  const restantes = await Promise.all(
    Array.from({ length: Math.max(primera.totalPages - 1, 0) }, (_, indice) =>
      sigeda.pagina<T>(ruta, { page: indice + 1, size: TAMANO_CATALOGO }),
    ),
  )
  return [primera, ...restantes].flatMap((pagina) => pagina.items)
}

export async function listarSeguimiento(
  fuente: FuenteSeguimiento,
  programa: Programa,
  codPersona: string | null,
): Promise<AlumnoSeguimiento[]> {
  if (fuente === 'todos') {
    const grupos = await todasLasPaginas<{ personas: AlumnoApi[] }>(
      `/api/grupos/programa/${encodeURIComponent(programa)}`,
    )
    return sinRepetidos(grupos.flatMap((grupo) => grupo.personas.map(aAlumnoSeguimiento)))
  }
  if (!codPersona) return []
  const filas = await todasLasPaginas<{ persona: AlumnoApi[] | AlumnoApi }>(
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

export const clavesSeguimiento = {
  todo: ['seguimiento'] as const,
  alumnos: (fuente: FuenteSeguimiento, programa: Programa, codPersona: string | null) =>
    [...clavesSeguimiento.todo, 'alumnos', fuente, programa, codPersona] as const,
  estadoTeorico: (codigos: readonly string[]) =>
    [...clavesSeguimiento.todo, 'estado-teorico', [...codigos].sort()] as const,
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
}
