import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { soloMensaje } from '@/features/cuentas/api'
import { aNota } from '@/features/evaluaciones/api'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import {
  DIFICULTADES,
  ESTADOS_TURNO,
  TIPOS_EXAMEN,
  TIPOS_PREGUNTA,
  type EstadoRendicion,
  type EstadoTurnoTeorico,
  type TipoExamen,
} from '@/lib/dominio/teoria'

export type GrupoDeExamen = { id: number; nombre: string; programa: Programa; cantAlumnos: number }

export type TurnoTeoricoFila = {
  id: number
  nombre: string
  idMateria: number
  materia: string
  tipoExamen: TipoExamen
  fechaExamen: string
  horaInicio: string
  horaFin: string
  estado: EstadoTurnoTeorico
  idGrupo: number
  grupo: string
  programa: Programa
  cantPreguntas: number
  cantAlumnos: number
  rindieron: number
}

export type PreguntaDelTurno = {
  idPregunta: number
  orden: number
  enunciado: string
  tipoPregunta: string
  dificultad: string
  puntajeMaximo: number
}

export type ResultadoDelTurno = {
  codAlumno: string
  alumno: string
  estado: EstadoRendicion
  idCuestionario: number | null
  nota: number | null
  aprobado: boolean | null
  bloqueadoPorSubsanacion: boolean
}

export type ResumenDelTurno = { habilitados: number; rindieron: number; aprobados: number; notaPromedio: number | null }

export type TurnoTeoricoDetalle = {
  id: number
  nombre: string
  materia: { id: number; nombre: string; notaMinima: number }
  tipoExamen: TipoExamen
  notaMinimaAplicada: number
  fechaExamen: string
  horaInicio: string
  horaFin: string
  estado: EstadoTurnoTeorico
  grupo: { id: number; nombre: string; programa: Programa }
  instructor: { codigo: string; nombre: string }
  turnoOrigen: { id: number; nombre: string; fechaExamen: string } | null
  preguntas: PreguntaDelTurno[]
  resultados: ResultadoDelTurno[]
  resumen: ResumenDelTurno
}

export type CuerpoTurnoTeorico = {
  nombre: string
  programa: Programa
  idMateria: number
  tipoExamen: TipoExamen
  fechaExamen: string
  horaInicio: string
  horaFin: string
  idGrupo: number
  idTurnoOrigen: number | null
  preguntas: { idPregunta: number; puntajeMaximo: number }[]
}

export type FiltrosTurnosTeoricos = ParametrosPagina & {
  idGrupo?: number
  idMateria?: number
  estado?: EstadoTurnoTeorico
  tipoExamen?: TipoExamen
  fechaPre?: string
  fechaPost?: string
}

export type TurnoTeoricoGuardado = { mensaje: string; id: number }

export const MENSAJE_TURNO_TEORICO_GUARDADO = 'Turno teórico guardado con éxito.'
export const MENSAJE_TURNO_TEORICO_ELIMINADO = 'Turno teórico eliminado con éxito.'

const programas = z.enum(PROGRAMAS)
const tiposExamen = z.enum(TIPOS_EXAMEN.map((tipo) => tipo.valor))
const estados = z.enum(ESTADOS_TURNO)
const rendiciones = z.enum(['NO_RINDIO', 'EN_CURSO', 'ENTREGADO'])

const esquemaGrupo = z.object({
  id: z.number(),
  nombre: z.string(),
  programa: programas,
  cantAlumnos: z.number(),
})

const esquemaFila = z.object({
  id: z.number(),
  nombre: z.string(),
  idMateria: z.number(),
  materia: z.string(),
  tipoExamen: tiposExamen,
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  estado: estados,
  idGrupo: z.number(),
  grupo: z.string(),
  programa: programas,
  cantPreguntas: z.number(),
  cantAlumnos: z.number(),
  rindieron: z.number(),
})

const esquemaDetalle = z.object({
  id: z.number(),
  nombre: z.string(),
  materia: z.object({ id: z.number(), nombre: z.string(), notaMinima: z.number() }),
  tipoExamen: tiposExamen,
  notaMinimaAplicada: z.number(),
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  estado: estados,
  grupo: z.object({ id: z.number(), nombre: z.string(), programa: programas }),
  instructor: z.object({ codigo: z.string(), nombre: z.string() }),
  turnoOrigen: z.object({ id: z.number(), nombre: z.string(), fechaExamen: z.string() }).nullish(),
  preguntas: z.array(
    z.object({
      idPregunta: z.number(),
      orden: z.number(),
      enunciado: z.string(),
      tipoPregunta: z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor)),
      dificultad: z.enum(DIFICULTADES.map((dificultad) => dificultad.valor)),
      puntajeMaximo: z.number(),
    }),
  ),
  resultados: z.array(
    z.object({
      codAlumno: z.string(),
      alumno: z.string(),
      estado: rendiciones,
      idCuestionario: z.number().nullish(),
      nota: z.union([z.number(), z.string()]).nullish(),
      aprobado: z.boolean().nullish(),
      bloqueadoPorSubsanacion: z.boolean(),
    }),
  ),
  resumen: z.object({
    habilitados: z.number(),
    rindieron: z.number(),
    aprobados: z.number(),
    notaPromedio: z.union([z.number(), z.string()]).nullish(),
  }),
})

function aDetalle(crudo: unknown): TurnoTeoricoDetalle {
  const turno = esquemaDetalle.parse(crudo)
  return {
    ...turno,
    turnoOrigen: turno.turnoOrigen ?? null,
    resultados: turno.resultados.map((resultado) => ({
      ...resultado,
      idCuestionario: resultado.idCuestionario ?? null,
      nota: aNota(resultado.nota),
      aprobado: resultado.aprobado ?? null,
    })),
    resumen: { ...turno.resumen, notaPromedio: aNota(turno.resumen.notaPromedio) },
  }
}

export const clavesTurnosTeoricos = {
  todo: ['turnos-teoricos'] as const,
  grupos: (programa: Programa) => [...clavesTurnosTeoricos.todo, 'grupos', programa] as const,
  lista: (filtros: FiltrosTurnosTeoricos) => [...clavesTurnosTeoricos.todo, 'lista', filtros] as const,
  detalle: (id: number) => [...clavesTurnosTeoricos.todo, 'detalle', id] as const,
  finalizados: (idMateria: number, idGrupo: number) =>
    [...clavesTurnosTeoricos.todo, 'finalizados', idMateria, idGrupo] as const,
}

// Sin `codInstructor`: el servidor devuelve los grupos que alcanza el llamador (dependencia 51), y
// con `Manage Groups` todos los del programa. El frontend no elige entre las dos cosas: el token sí.
export async function listarGruposDeExamen(programa: Programa): Promise<GrupoDeExamen[]> {
  const grupos = await sigeda.lista<unknown>('/api/turnos-teoricos/grupos', { programa })
  return grupos.map((grupo) => esquemaGrupo.parse(grupo))
}

export async function listarTurnosTeoricos(filtros: FiltrosTurnosTeoricos): Promise<Pagina<TurnoTeoricoFila>> {
  const pagina = await sigeda.pagina<unknown>('/api/turnos-teoricos', {
    idGrupo: filtros.idGrupo,
    idMateria: filtros.idMateria,
    estado: filtros.estado,
    tipoExamen: filtros.tipoExamen,
    fechaPre: filtros.fechaPre,
    fechaPost: filtros.fechaPost,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
  return { ...pagina, items: pagina.items.map((fila) => esquemaFila.parse(fila)) }
}

export async function listarTurnosFinalizados(idMateria: number, idGrupo: number): Promise<TurnoTeoricoFila[]> {
  const pagina = await listarTurnosTeoricos({
    idMateria,
    idGrupo,
    estado: 'FINALIZADO',
    page: 0,
    size: 100,
    direction: 'ASC',
  })
  return pagina.items
}

export async function obtenerTurnoTeorico(id: number): Promise<TurnoTeoricoDetalle> {
  return aDetalle(await sigeda.get<unknown>(`/api/turnos-teoricos/${encodeURIComponent(id)}`))
}

const esquemaGuardado = z.object({ mensaje: z.string(), turnoTeorico: z.object({ id: z.number() }) })

function aGuardado(respuesta: unknown, idConocido: number | null): TurnoTeoricoGuardado {
  const leido = esquemaGuardado.safeParse(respuesta)
  if (leido.success) return { mensaje: leido.data.mensaje, id: leido.data.turnoTeorico.id }
  return { mensaje: soloMensaje(respuesta, MENSAJE_TURNO_TEORICO_GUARDADO), id: idConocido ?? 0 }
}

export async function crearTurnoTeorico(cuerpo: CuerpoTurnoTeorico): Promise<TurnoTeoricoGuardado> {
  return aGuardado(await sigeda.post<unknown>('/api/turnos-teoricos', cuerpo), null)
}

export async function modificarTurnoTeorico(id: number, cuerpo: CuerpoTurnoTeorico): Promise<TurnoTeoricoGuardado> {
  return aGuardado(await sigeda.put<unknown>(`/api/turnos-teoricos/${encodeURIComponent(id)}`, cuerpo), id)
}

export async function eliminarTurnoTeorico(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/turnos-teoricos/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_TURNO_TEORICO_ELIMINADO
}

export const consultasTurnosTeoricos = {
  grupos: (programa: Programa) =>
    queryOptions({
      queryKey: clavesTurnosTeoricos.grupos(programa),
      queryFn: () => listarGruposDeExamen(programa),
      staleTime: 300_000,
    }),
  lista: (filtros: FiltrosTurnosTeoricos) =>
    queryOptions({
      queryKey: clavesTurnosTeoricos.lista(filtros),
      queryFn: () => listarTurnosTeoricos(filtros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) =>
    queryOptions({ queryKey: clavesTurnosTeoricos.detalle(id), queryFn: () => obtenerTurnoTeorico(id) }),
  finalizados: (idMateria: number, idGrupo: number) =>
    queryOptions({
      queryKey: clavesTurnosTeoricos.finalizados(idMateria, idGrupo),
      queryFn: () => listarTurnosFinalizados(idMateria, idGrupo),
      enabled: idMateria > 0 && idGrupo > 0,
    }),
}
