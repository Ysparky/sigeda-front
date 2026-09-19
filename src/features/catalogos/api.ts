import { queryOptions } from '@tanstack/react-query'
import { sigeda } from '@/lib/api/sigeda'
import type { Permiso } from '@/lib/auth/permisos'

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

export async function listarSubfases(): Promise<Subfase[]> {
  const primera = await sigeda.pagina<Subfase>('/api/subfases', { page: 0, size: 10 })
  const restantes = await Promise.all(
    Array.from({ length: Math.max(primera.totalPages - 1, 0) }, (_, indice) =>
      sigeda.pagina<Subfase>('/api/subfases', { page: indice + 1, size: 10 }),
    ),
  )
  return [primera, ...restantes].flatMap((pagina) => pagina.items)
}

export function listarManiobrasDeSubfase(idSubfase: number): Promise<Maniobra[]> {
  return sigeda.lista<Maniobra>(`/api/maniobras/subfase/${idSubfase}`)
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
    const grupos = await sigeda.lista<GrupoByPrograma>(`/api/alumnos/programa/${programa}`)
    return sinRepetidos(grupos.flatMap((grupo) => grupo.personas.map((persona) => aOpcion(persona, grupo.nombre))))
  }
  if (fuente === 'todos') {
    const pagina = await sigeda.pagina<{ personas: AlumnoConGrupo[] }>(`/api/grupos/programa/${programa}`, {
      page: 0,
      size: 100,
    })
    return sinRepetidos(
      pagina.items.flatMap((grupo) =>
        grupo.personas.map((persona) => aOpcion(persona, persona.idGrupo === null ? null : `Grupo ${persona.idGrupo}`)),
      ),
    )
  }
  if (!codPersona) return []
  const pagina = await sigeda.pagina<{ persona: AlumnoConGrupo[] | AlumnoConGrupo }>(
    `/api/grupos/instructor/${codPersona}/programa/${programa}`,
    { page: 0, size: 100 },
  )
  return sinRepetidos(
    pagina.items.flatMap((item) =>
      (Array.isArray(item.persona) ? item.persona : [item.persona]).map((persona) =>
        aOpcion(persona, persona.idGrupo === null ? null : `Grupo ${persona.idGrupo}`),
      ),
    ),
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
