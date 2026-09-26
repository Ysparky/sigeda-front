import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { Programa } from '@/features/catalogos/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'

export type AsignaturaDeIndices = {
  idMateria: number
  materia: string
  coeficiente: number
  coeficienteAplicado: number
  pe: number | null
  pt: number | null
  na: number | null
}

export type SubfaseDeIndices = {
  idSubfase: number
  subfase: string
  sigla: string
  peso: number
  nsf: number | null
  misiones: number
}

export type FaseDeIndices = {
  fase: string
  sigla: string
  peso: number
  valor: number | null
  subfases: SubfaseDeIndices[]
}

export type Indices = {
  codigo: string
  alumno: string
  programa: string
  nfpi: number | null
  nit: {
    valor: number | null
    nct: number | null
    nei: number | null
    neiEvaluaciones: number
    asignaturas: AsignaturaDeIndices[]
    asignaturasSinNota: string[]
    reduccionPorRezagadoAplicada: boolean
  }
  nia: { valor: number | null; fases: FaseDeIndices[]; motivo: string | null }
}

export type FilaDeMerito = {
  puesto: number | null
  codigo: string
  alumno: string
  idGrupo: number | null
  grupo: string
  nfpi: number | null
  nit: number | null
  nia: number | null
  motivoSinNfpi: string | null
}

export type FiltrosMerito = ParametrosPagina & { programa: Programa; idGrupo?: number }

export function obtenerIndices(codPersona: string): Promise<Indices> {
  return sigeda.get<Indices>(`/api/personas/${encodeURIComponent(codPersona)}/indices`)
}

export function listarOrdenDeMerito(filtros: FiltrosMerito): Promise<Pagina<FilaDeMerito>> {
  return sigeda.pagina<FilaDeMerito>('/api/reportes/orden-merito', {
    programa: filtros.programa,
    idGrupo: filtros.idGrupo,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
}

export const clavesReportes = {
  todo: ['reportes'] as const,
  indices: (codPersona: string) => [...clavesReportes.todo, 'indices', codPersona] as const,
  ordenDeMerito: (filtros: FiltrosMerito) => [...clavesReportes.todo, 'orden-merito', filtros] as const,
}

export const consultasReportes = {
  indices: (codPersona: string) =>
    queryOptions({
      queryKey: clavesReportes.indices(codPersona),
      queryFn: () => obtenerIndices(codPersona),
      enabled: codPersona !== '',
    }),
  ordenDeMerito: (filtros: FiltrosMerito) =>
    queryOptions({
      queryKey: clavesReportes.ordenDeMerito(filtros),
      queryFn: () => listarOrdenDeMerito(filtros),
      placeholderData: keepPreviousData,
    }),
}
