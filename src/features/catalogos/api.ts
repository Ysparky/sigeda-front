import { queryOptions } from '@tanstack/react-query'
import { todasLasPaginas } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import type { Permiso } from '@/lib/auth/permisos'

const TAMANO_SUBFASES = 10
const TAMANO_CATALOGO = 100

export const PROGRAMAS = ['PDI', 'PDE'] as const

export type Programa = (typeof PROGRAMAS)[number]

export type Subfase = { id: number; nombre: string; descripcion: string }

export type Maniobra = { id: number; nombre: string; descripcion: string }

export type Aeronave = { id: number; nombre: string; estado: string }

export type PersonaResumida = { codigo: string; nombreCompleto: string }

export type OpcionAlumno = PersonaResumida & { grupo: string | null }

export type FuenteAlumnos = 'todos' | 'programacion' | 'instructor'

type NombreAlumno = { codigo: string; nombre: string; aPaterno: string; aMaterno: string }

type AlumnoConGrupo = NombreAlumno & { idGrupo: number | null; estado: string }

type GrupoByPrograma = { id: number; nombre: string; programa: string; personas: NombreAlumno[] }

export function nombreCompleto(persona: Pick<NombreAlumno, 'nombre' | 'aPaterno' | 'aMaterno'>): string {
  return [persona.nombre, persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
}

export const clavesCatalogos = {
  todo: ['catalogos'] as const,
  subfases: () => [...clavesCatalogos.todo, 'subfases'] as const,
  maniobras: (idSubfase: number) => [...clavesCatalogos.todo, 'maniobras', idSubfase] as const,
  aeronaves: () => [...clavesCatalogos.todo, 'aeronaves'] as const,
  instructores: (programa: Programa) => [...clavesCatalogos.todo, 'instructores', programa] as const,
  alumnos: (fuente: FuenteAlumnos, programa: Programa, codPersona: string | null) =>
    [...clavesCatalogos.todo, 'alumnos', fuente, programa, codPersona] as const,
}

export function listarSubfases(): Promise<Subfase[]> {
  return todasLasPaginas<Subfase>((parametros) => sigeda.pagina<Subfase>('/api/subfases', parametros), TAMANO_SUBFASES)
}

export function listarManiobrasDeSubfase(idSubfase: number): Promise<Maniobra[]> {
  return sigeda.lista<Maniobra>(`/api/maniobras/subfase/${encodeURIComponent(idSubfase)}`)
}

export async function listarAeronaves(): Promise<Aeronave[]> {
  const aeronaves = await sigeda.lista<Aeronave>('/api/aeronaves')
  return aeronaves.map(({ id, nombre, estado }) => ({ id, nombre, estado }))
}

export async function listarInstructores(programa: Programa): Promise<PersonaResumida[]> {
  const tipo = encodeURIComponent(`Instructor ${programa}`)
  const instructores = await sigeda.lista<NombreAlumno>(`/api/personas/instructor/${tipo}`)
  return instructores.map((persona) => ({ codigo: persona.codigo, nombreCompleto: nombreCompleto(persona) }))
}

export function fuenteDeAlumnos(permisos: ReadonlySet<Permiso>): FuenteAlumnos | null {
  if (permisos.has('View All Groups')) return 'todos'
  if (permisos.has('Manage Shifts')) return 'programacion'
  if (permisos.has('View My Group')) return 'instructor'
  return null
}

function aOpcion(persona: NombreAlumno, grupo: string | null): OpcionAlumno {
  return { codigo: persona.codigo, nombreCompleto: nombreCompleto(persona), grupo }
}

function todasLasFilas<T>(ruta: string): Promise<T[]> {
  return todasLasPaginas<T>((parametros) => sigeda.pagina<T>(ruta, parametros), TAMANO_CATALOGO)
}

function sinRepetidos(opciones: OpcionAlumno[]): OpcionAlumno[] {
  const vistos = new Set<string>()
  return opciones.filter((opcion) => {
    if (vistos.has(opcion.codigo)) return false
    vistos.add(opcion.codigo)
    return true
  })
}

export async function listarAlumnos(
  fuente: FuenteAlumnos,
  programa: Programa,
  codPersona: string | null,
): Promise<OpcionAlumno[]> {
  if (fuente === 'programacion') {
    const grupos = await sigeda.lista<GrupoByPrograma>(`/api/alumnos/programa/${encodeURIComponent(programa)}`)
    return sinRepetidos(grupos.flatMap((grupo) => grupo.personas.map((persona) => aOpcion(persona, grupo.nombre))))
  }
  if (fuente === 'todos') {
    const grupos = await todasLasFilas<{ personas: AlumnoConGrupo[] }>(
      `/api/grupos/programa/${encodeURIComponent(programa)}`,
    )
    return sinRepetidos(
      grupos.flatMap((grupo) =>
        grupo.personas.map((persona) => aOpcion(persona, persona.idGrupo === null ? null : `Grupo ${persona.idGrupo}`)),
      ),
    )
  }
  if (!codPersona) return []
  // `persona` es un objeto y no un arreglo de uno. La proyección declaraba `List<Alumno>` sobre un
  // `@OneToOne` y el servidor publicaba el arreglo; la tanda G alineó el código con la relación, así
  // que acá ya no hace falta aceptar las dos formas.
  const filas = await todasLasFilas<{ persona: AlumnoConGrupo }>(
    `/api/grupos/instructor/${encodeURIComponent(codPersona)}/programa/${encodeURIComponent(programa)}`,
  )
  return sinRepetidos(
    filas.map((item) => aOpcion(item.persona, item.persona.idGrupo === null ? null : `Grupo ${item.persona.idGrupo}`)),
  )
}

export function agruparPorGrupo(alumnos: readonly OpcionAlumno[]): [string, OpcionAlumno[]][] {
  const grupos = new Map<string, OpcionAlumno[]>()
  for (const alumno of alumnos) {
    const grupo = alumno.grupo ?? 'Sin grupo'
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), alumno])
  }
  return [...grupos.entries()]
}

export const consultasCatalogos = {
  subfases: () => queryOptions({ queryKey: clavesCatalogos.subfases(), queryFn: listarSubfases, staleTime: 300_000 }),
  maniobras: (idSubfase: number) =>
    queryOptions({
      queryKey: clavesCatalogos.maniobras(idSubfase),
      queryFn: () => listarManiobrasDeSubfase(idSubfase),
      enabled: idSubfase > 0,
      staleTime: 300_000,
    }),
  aeronaves: () => queryOptions({ queryKey: clavesCatalogos.aeronaves(), queryFn: listarAeronaves }),
  instructores: (programa: Programa) =>
    queryOptions({
      queryKey: clavesCatalogos.instructores(programa),
      queryFn: () => listarInstructores(programa),
      staleTime: 300_000,
    }),
  alumnos: (fuente: FuenteAlumnos, programa: Programa, codPersona: string | null) =>
    queryOptions({
      queryKey: clavesCatalogos.alumnos(fuente, programa, codPersona),
      queryFn: () => listarAlumnos(fuente, programa, codPersona),
      staleTime: 300_000,
    }),
}
