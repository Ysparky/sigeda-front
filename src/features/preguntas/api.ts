import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { soloMensaje } from '@/features/cuentas/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import {
  DIFICULTADES,
  ORIGENES_PREGUNTA,
  TIPOS_PREGUNTA,
  type Dificultad,
  type OrigenPregunta,
  type TipoPregunta,
} from '@/lib/dominio/teoria'

export type Alternativa = { id: number; respuesta: string; correcto: boolean }

export type PreguntaFila = {
  id: number
  idMateria: number
  materia: string
  enunciado: string
  tipoPregunta: TipoPregunta
  dificultad: Dificultad
  origen: OrigenPregunta
  enUso: boolean
  cantAlternativas: number
}

export type PreguntaDetalle = {
  id: number
  materia: { id: number; nombre: string; notaMinima: number }
  enunciado: string
  tipoPregunta: TipoPregunta
  dificultad: Dificultad
  explicacion: string | null
  origen: OrigenPregunta
  enUso: boolean
  alternativas: Alternativa[]
}

export type AlternativaEnviada = { respuesta: string; correcto: boolean }

export type CuerpoPregunta = {
  codInstructor: string
  idMateria: number
  enunciado: string
  tipoPregunta: TipoPregunta
  dificultad: Dificultad
  explicacion: string | null
  alternativas: AlternativaEnviada[]
}

export type CuerpoLote = { codInstructor: string; preguntas: Omit<CuerpoPregunta, 'codInstructor'>[] }

export type FiltrosPreguntas = ParametrosPagina & {
  idMateria?: number
  dificultad?: Dificultad
  tipo?: TipoPregunta
  origen?: OrigenPregunta
  texto?: string
}

export const MENSAJE_PREGUNTA_GUARDADA = 'Pregunta guardada con éxito.'
export const MENSAJE_PREGUNTAS_GUARDADAS = 'Preguntas guardadas con éxito.'
export const MENSAJE_PREGUNTA_ELIMINADA = 'Pregunta eliminado con éxito.'

const tipos = z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor))
const dificultades = z.enum(DIFICULTADES.map((dificultad) => dificultad.valor))
const origenes = z.enum(ORIGENES_PREGUNTA.map((origen) => origen.valor))

const esquemaFila = z.object({
  id: z.number(),
  idMateria: z.number(),
  materia: z.string(),
  enunciado: z.string(),
  tipoPregunta: tipos,
  dificultad: dificultades,
  origen: origenes,
  enUso: z.boolean(),
  cantAlternativas: z.number(),
})

const esquemaDetalle = z.object({
  id: z.number(),
  materia: z.object({ id: z.number(), nombre: z.string(), notaMinima: z.number() }),
  enunciado: z.string(),
  tipoPregunta: tipos,
  dificultad: dificultades,
  explicacion: z.string().nullish(),
  origen: origenes,
  enUso: z.boolean(),
  alternativas: z.array(z.object({ id: z.number(), respuesta: z.string(), correcto: z.boolean() })),
})

function aDetalle(crudo: unknown): PreguntaDetalle {
  const pregunta = esquemaDetalle.parse(crudo)
  return { ...pregunta, explicacion: pregunta.explicacion ?? null }
}

export const clavesPreguntas = {
  todo: ['preguntas'] as const,
  lista: (filtros: FiltrosPreguntas) => [...clavesPreguntas.todo, 'lista', filtros] as const,
  detalle: (id: number) => [...clavesPreguntas.todo, 'detalle', id] as const,
  porMateria: (idMateria: number) => [...clavesPreguntas.todo, 'materia', idMateria] as const,
}

export async function listarPreguntas(filtros: FiltrosPreguntas): Promise<Pagina<PreguntaFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/preguntas', {
    idMateria: filtros.idMateria,
    dificultad: filtros.dificultad,
    tipo: filtros.tipo,
    origen: filtros.origen,
    texto: filtros.texto,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
  return { ...pagina, items: pagina.items.map((fila) => esquemaFila.parse(fila)) }
}

export async function listarPreguntasDeMateria(idMateria: number): Promise<PreguntaFila[]> {
  const pagina = await listarPreguntas({ idMateria, page: 0, size: 100, direction: 'ASC' })
  return pagina.items
}

export async function obtenerPregunta(id: number): Promise<PreguntaDetalle> {
  return aDetalle(await sigeda.get<unknown>(`/api/preguntas/${encodeURIComponent(id)}`))
}

export async function crearPregunta(cuerpo: CuerpoPregunta): Promise<string> {
  return soloMensaje(await sigeda.post<unknown>('/api/preguntas', cuerpo), MENSAJE_PREGUNTA_GUARDADA)
}

export async function modificarPregunta(id: number, cuerpo: CuerpoPregunta): Promise<string> {
  return soloMensaje(
    await sigeda.put<unknown>(`/api/preguntas/${encodeURIComponent(id)}`, cuerpo),
    MENSAJE_PREGUNTA_GUARDADA,
  )
}

export async function eliminarPregunta(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/preguntas/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_PREGUNTA_ELIMINADA
}

export async function importarPreguntas(cuerpo: CuerpoLote): Promise<string> {
  return soloMensaje(await sigeda.post<unknown>('/api/preguntas/lote', cuerpo), MENSAJE_PREGUNTAS_GUARDADAS)
}

export const consultasPreguntas = {
  lista: (filtros: FiltrosPreguntas) =>
    queryOptions({
      queryKey: clavesPreguntas.lista(filtros),
      queryFn: () => listarPreguntas(filtros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) => queryOptions({ queryKey: clavesPreguntas.detalle(id), queryFn: () => obtenerPregunta(id) }),
  porMateria: (idMateria: number) =>
    queryOptions({
      queryKey: clavesPreguntas.porMateria(idMateria),
      queryFn: () => listarPreguntasDeMateria(idMateria),
      enabled: idMateria > 0,
    }),
}
