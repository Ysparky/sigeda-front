import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Programa } from '@/features/catalogos/api'
import { clavesTurnos } from '@/features/turnos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import { categoriaDesde, esCategoria, type Categoria } from '@/lib/dominio/categorias'
import { esNotaDirbe, type NotaDirbe } from '@/lib/dominio/dirbe'
import { perteneceAlTurno, ultimaEvaluacion } from '@/lib/dominio/evaluacion'
import type { Clasificacion } from '@/lib/dominio/vocabulario'

export type EvaluacionResumen = {
  codigo: string
  nombre: string
  fase: string
  evaluador: string
  fecha: string
  alumno: string
  promedio: number | null
  clasificacion: string | null
}

export type CalificacionDetalle = {
  idManiobra: number
  maniobra: string
  notaMin: NotaDirbe
  nota: string
  causa: string | null
  observacion: string | null
  recomendacion: string | null
}

export type EvaluacionDetalle = {
  codigo: string
  nombre: string
  fecha: string
  programa: string
  categoria: Categoria | null
  categoriaTexto: string
  clasificacion: string | null
  promedio: number | null
  recomendacion: string | null
  archivoUrl: string | null
  fase: string
  subFase: string
  estadoAlumno: string
  codEvalPrevia: string | null
  evaluador: string
  codPersona: string
  alumno: string
  calificaciones: CalificacionDetalle[]
}

export type FiltrosEvaluaciones = ParametrosPagina & {
  programa: Programa
  idSubfase?: number
  clasificacion?: Clasificacion
}

export type CuerpoEvaluacion = {
  nombre: string
  categoria: Categoria
  recomendacion: string | null
  url: string | null
  codEvaluador: string | null
  calificaciones: {
    idManiobra: number
    nota: NotaDirbe
    causa: string | null
    observacion: string | null
    recomendacion: string | null
  }[]
}

export type EvaluacionGuardada = {
  mensaje: string
  codigo: string
  promedio: number | null
  clasificacion: string | null
}

type NotaApi = string | number | null

type EvaluacionResumenApi = Omit<EvaluacionResumen, 'promedio'> & { promedio: NotaApi }

type EvaluacionApi = Omit<EvaluacionDetalle, 'categoria' | 'categoriaTexto' | 'calificaciones' | 'promedio'> & {
  categoria: string
  promedio: NotaApi
  calificaciones: {
    idManiobra: number
    notaMin: string
    nota: string
    causa: string | null
    observacion: string | null
    recomendacion: string | null
    maniobra?: { id: number; nombre: string } | null
  }[]
}

export const MENSAJE_EVALUACION_GUARDADA = 'Evaluación guardada con éxito.'
export const MENSAJE_EVALUACION_ELIMINADA = 'Evaluación eliminado con éxito.'

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function textoONulo(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null
}

export function aNota(valor: unknown): number | null {
  if (typeof valor !== 'number' && (typeof valor !== 'string' || valor.trim() === '')) return null
  const nota = Number(valor)
  return Number.isFinite(nota) ? nota : null
}

export function aEvaluacionResumen(evaluacion: EvaluacionResumenApi): EvaluacionResumen {
  return { ...evaluacion, promedio: aNota(evaluacion.promedio), clasificacion: evaluacion.clasificacion ?? null }
}

export function aEvaluacionDetalle(evaluacion: EvaluacionApi): EvaluacionDetalle {
  return {
    codigo: evaluacion.codigo,
    nombre: evaluacion.nombre,
    fecha: evaluacion.fecha,
    programa: evaluacion.programa,
    categoria: categoriaDesde(evaluacion.categoria),
    categoriaTexto: evaluacion.categoria,
    clasificacion: evaluacion.clasificacion ?? null,
    promedio: aNota(evaluacion.promedio),
    recomendacion: evaluacion.recomendacion ?? null,
    archivoUrl: evaluacion.archivoUrl ?? null,
    fase: evaluacion.fase,
    subFase: evaluacion.subFase,
    estadoAlumno: evaluacion.estadoAlumno,
    codEvalPrevia: evaluacion.codEvalPrevia ?? null,
    evaluador: evaluacion.evaluador,
    codPersona: evaluacion.codPersona,
    alumno: evaluacion.alumno,
    calificaciones: evaluacion.calificaciones.flatMap((calificacion) => {
      const notaMin = calificacion.notaMin.toUpperCase()
      if (!esNotaDirbe(notaMin)) return []
      return [
        {
          idManiobra: calificacion.idManiobra,
          maniobra: calificacion.maniobra?.nombre ?? `Maniobra ${calificacion.idManiobra}`,
          notaMin,
          nota: calificacion.nota,
          causa: calificacion.causa ?? null,
          observacion: calificacion.observacion ?? null,
          recomendacion: calificacion.recomendacion ?? null,
        },
      ]
    }),
  }
}

export function aEvaluacionGuardada(respuesta: unknown): EvaluacionGuardada {
  if (esRegistro(respuesta)) {
    const evaluacion = respuesta['evaluación'] ?? respuesta.evaluacion
    if (typeof respuesta.mensaje === 'string' && esRegistro(evaluacion) && typeof evaluacion.codigo === 'string') {
      return {
        mensaje: respuesta.mensaje,
        codigo: evaluacion.codigo,
        promedio: aNota(evaluacion.promedio),
        clasificacion: textoONulo(evaluacion.clasificacion),
      }
    }
    if (typeof respuesta.codigo === 'string') {
      return {
        mensaje: MENSAJE_EVALUACION_GUARDADA,
        codigo: respuesta.codigo,
        promedio: aNota(respuesta.promedio),
        clasificacion: textoONulo(respuesta.clasificacion),
      }
    }
  }
  throw new ApiError(500, MENSAJE_GENERICO)
}

export const clavesEvaluaciones = {
  todo: ['evaluaciones'] as const,
  lista: (codPersona: string, filtros: FiltrosEvaluaciones) =>
    [...clavesEvaluaciones.todo, 'lista', codPersona, filtros] as const,
  delTurno: (codPersona: string, idTurno: number) => [...clavesEvaluaciones.todo, 'turno', codPersona, idTurno] as const,
  ultima: (codPersona: string, programa: string) => [...clavesEvaluaciones.todo, 'ultima', codPersona, programa] as const,
  detalle: (codigo: string) => [...clavesEvaluaciones.todo, 'detalle', codigo] as const,
  sugerencias: (codPersona: string) => [...clavesEvaluaciones.todo, 'sugerencias', codPersona] as const,
}

export async function listarEvaluaciones(
  codPersona: string,
  filtros: FiltrosEvaluaciones,
): Promise<Pagina<EvaluacionResumen>> {
  const pagina = await sigeda.pagina<EvaluacionResumenApi>(
    `/api/evaluaciones/filter/persona/${encodeURIComponent(codPersona)}`,
    {
      idSubfase: filtros.idSubfase,
      nombre: filtros.programa,
      clasificacion: filtros.clasificacion,
      page: filtros.page,
      size: filtros.size,
      property: filtros.property,
      direction: filtros.direction,
    },
  )
  return { ...pagina, items: pagina.items.map(aEvaluacionResumen) }
}

export async function listarEvaluacionesDelTurno(codPersona: string, idTurno: number): Promise<EvaluacionResumen[]> {
  const pagina = await sigeda.pagina<EvaluacionResumenApi>(
    `/api/evaluaciones/persona/${encodeURIComponent(codPersona)}`,
    { idTurno, page: 0, size: 50 },
  )
  return pagina.items
    .filter((evaluacion) => perteneceAlTurno(evaluacion.codigo, codPersona, idTurno))
    .map(aEvaluacionResumen)
}

export async function obtenerUltimaEvaluacion(codPersona: string, programa: string): Promise<string | null> {
  const pagina = await sigeda.pagina<EvaluacionResumenApi>(
    `/api/evaluaciones/filter/persona/${encodeURIComponent(codPersona)}`,
    { nombre: programa, page: 0, size: 500 },
  )
  return ultimaEvaluacion(pagina.items)
}

export async function obtenerEvaluacion(codigo: string): Promise<EvaluacionDetalle> {
  return aEvaluacionDetalle(await sigeda.get<EvaluacionApi>(`/api/evaluaciones/${encodeURIComponent(codigo)}`))
}

export async function sugerirCategorias(codPersona: string): Promise<Categoria[]> {
  const sugeridas = await sigeda.lista<string>(`/api/personas/${encodeURIComponent(codPersona)}/status`)
  return sugeridas.filter(esCategoria)
}

export async function registrarEvaluacion(
  idTurno: number,
  codPersona: string,
  cuerpo: CuerpoEvaluacion,
): Promise<EvaluacionGuardada> {
  const ruta = `/api/evaluaciones/turno/${encodeURIComponent(idTurno)}/persona/${encodeURIComponent(codPersona)}`
  return aEvaluacionGuardada(await sigeda.post<unknown>(ruta, cuerpo))
}

export async function modificarEvaluacion(codigo: string, cuerpo: CuerpoEvaluacion): Promise<EvaluacionGuardada> {
  return aEvaluacionGuardada(await sigeda.put<unknown>(`/api/evaluaciones/${encodeURIComponent(codigo)}`, cuerpo))
}

export async function eliminarEvaluacion(codigo: string): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/evaluaciones/${encodeURIComponent(codigo)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_EVALUACION_ELIMINADA
}

export const consultasEvaluaciones = {
  lista: (codPersona: string, filtros: FiltrosEvaluaciones) =>
    queryOptions({
      queryKey: clavesEvaluaciones.lista(codPersona, filtros),
      queryFn: () => listarEvaluaciones(codPersona, filtros),
      placeholderData: keepPreviousData,
    }),
  delTurno: (codPersona: string, idTurno: number) =>
    queryOptions({
      queryKey: clavesEvaluaciones.delTurno(codPersona, idTurno),
      queryFn: () => listarEvaluacionesDelTurno(codPersona, idTurno),
    }),
  ultima: (codPersona: string, programa: string) =>
    queryOptions({
      queryKey: clavesEvaluaciones.ultima(codPersona, programa),
      queryFn: () => obtenerUltimaEvaluacion(codPersona, programa),
    }),
  detalle: (codigo: string) =>
    queryOptions({ queryKey: clavesEvaluaciones.detalle(codigo), queryFn: () => obtenerEvaluacion(codigo) }),
  sugerencias: (codPersona: string) =>
    queryOptions({ queryKey: clavesEvaluaciones.sugerencias(codPersona), queryFn: () => sugerirCategorias(codPersona) }),
}

function useInvalidarEvaluaciones() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: clavesEvaluaciones.todo }),
      queryClient.invalidateQueries({ queryKey: clavesTurnos.todo }),
    ])
}

export function useRegistrarEvaluacion(idTurno: number, codPersona: string) {
  const invalidar = useInvalidarEvaluaciones()
  return useMutation({
    mutationFn: (cuerpo: CuerpoEvaluacion) => registrarEvaluacion(idTurno, codPersona, cuerpo),
    onSuccess: invalidar,
  })
}

export function useModificarEvaluacion(codigo: string) {
  const invalidar = useInvalidarEvaluaciones()
  return useMutation({
    mutationFn: (cuerpo: CuerpoEvaluacion) => modificarEvaluacion(codigo, cuerpo),
    onSuccess: invalidar,
  })
}

export function useEliminarEvaluacion() {
  const invalidar = useInvalidarEvaluaciones()
  return useMutation({ mutationFn: eliminarEvaluacion, onSuccess: invalidar })
}
