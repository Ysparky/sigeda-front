import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { aNota } from '@/features/evaluaciones/api'
import { sigeda } from '@/lib/api/sigeda'
import { ESTADOS_TURNO, TIPOS_EXAMEN, TIPOS_PREGUNTA, type EstadoRendicion, type TipoExamen } from '@/lib/dominio/teoria'

export type ExamenPendiente = {
  idTurnoTeorico: number
  nombre: string
  idMateria: number
  materia: string
  notaMinimaAplicada: number
  tipoExamen: TipoExamen
  fechaExamen: string
  horaInicio: string
  horaFin: string
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO'
  cantPreguntas: number
  idCuestionario: number | null
  estadoRendicion: EstadoRendicion
}

export type AlternativaDeExamen = { id: number; respuesta: string }

export type PreguntaDeExamen = {
  idPregunta: number
  orden: number
  enunciado: string
  tipoPregunta: string
  puntajeMaximo: number
  alternativas: AlternativaDeExamen[]
  respuestaAlumno: string | null
}

export type ExamenEnCurso = {
  id: number
  idTurnoTeorico: number
  turnoTeorico: string
  materia: { id: number; nombre: string; notaMinima: number }
  tipoExamen: TipoExamen
  notaMinimaAplicada: number
  codAlumno: string
  estado: 'EN_CURSO' | 'ENTREGADO'
  fechaExamen: string
  horaInicio: string
  horaFin: string
  puntajeTotal: number
  preguntas: PreguntaDeExamen[]
}

export type CalificacionDeExamen = {
  idPregunta: number
  orden: number
  enunciado: string
  tipoPregunta: string
  respuestaAlumno: string | null
  respuestaCorrecta: string
  explicacion: string | null
  correcto: boolean
  puntajeMaximo: number
  puntajeObtenido: number
}

export type ExamenResuelto = {
  id: number
  turnoTeorico: { id: number; nombre: string; estado: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' }
  materia: { id: number; nombre: string; notaMinima: number }
  tipoExamen: TipoExamen
  notaMinimaAplicada: number
  codAlumno: string
  alumno: string
  estado: 'EN_CURSO' | 'ENTREGADO'
  fechaExamen: string
  horaInicio: string
  horaFin: string
  fechaEntrega: string | null
  horaEntrega: string | null
  puntajeTotal: number
  nota: number | null
  aprobado: boolean | null
  calificaciones: CalificacionDeExamen[]
}

export type DesaprobadoTeorico = {
  idCuestionario: number
  idTurnoTeorico: number
  turnoTeorico: string
  idMateria: number
  materia: string
  tipoExamen: TipoExamen
  fechaExamen: string
  nota: number | null
  notaMinimaAplicada: number
}

export type PendienteTeorico = {
  idTurnoTeorico: number
  nombre: string
  tipoExamen: TipoExamen
  idMateria: number
  materia: string
  fechaExamen: string
  horaInicio: string
  horaFin: string
}

export type EstadoTeorico = {
  codAlumno: string
  alumno: string
  bloqueadoPorSubsanacion: boolean
  motivo: string | null
  desaprobados: DesaprobadoTeorico[]
  pendientes: PendienteTeorico[]
}

export type RespuestaDeExamen = { idPregunta: number; respuesta: string }

export const MENSAJE_EXAMEN_ENTREGADO = 'Examen entregado con éxito.'

const tiposExamen = z.enum(TIPOS_EXAMEN.map((tipo) => tipo.valor))
const estadosTurno = z.enum(ESTADOS_TURNO)
const tiposPregunta = z.enum(TIPOS_PREGUNTA.map((tipo) => tipo.valor))

const esquemaPendiente = z.object({
  idTurnoTeorico: z.number(),
  nombre: z.string(),
  idMateria: z.number(),
  materia: z.string(),
  notaMinimaAplicada: z.number(),
  tipoExamen: tiposExamen,
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  estado: estadosTurno,
  cantPreguntas: z.number(),
  idCuestionario: z.number().nullish(),
  estadoRendicion: z.enum(['NO_RINDIO', 'EN_CURSO', 'ENTREGADO']),
})

const esquemaEnCurso = z.object({
  id: z.number(),
  idTurnoTeorico: z.number(),
  turnoTeorico: z.string(),
  materia: z.object({ id: z.number(), nombre: z.string(), notaMinima: z.number() }),
  tipoExamen: tiposExamen,
  notaMinimaAplicada: z.number(),
  codAlumno: z.string(),
  estado: z.enum(['EN_CURSO', 'ENTREGADO']),
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  puntajeTotal: z.number(),
  preguntas: z.array(
    z.object({
      idPregunta: z.number(),
      orden: z.number(),
      enunciado: z.string(),
      tipoPregunta: tiposPregunta,
      puntajeMaximo: z.number(),
      alternativas: z.array(z.object({ id: z.number(), respuesta: z.string() })),
      respuestaAlumno: z.string().nullish(),
    }),
  ),
})

const esquemaResuelto = z.object({
  id: z.number(),
  turnoTeorico: z.object({ id: z.number(), nombre: z.string(), estado: estadosTurno }),
  materia: z.object({ id: z.number(), nombre: z.string(), notaMinima: z.number() }),
  tipoExamen: tiposExamen,
  notaMinimaAplicada: z.number(),
  codAlumno: z.string(),
  alumno: z.string(),
  estado: z.enum(['EN_CURSO', 'ENTREGADO']),
  fechaExamen: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  fechaEntrega: z.string().nullish(),
  horaEntrega: z.string().nullish(),
  puntajeTotal: z.number(),
  nota: z.union([z.number(), z.string()]).nullish(),
  aprobado: z.boolean().nullish(),
  calificaciones: z.array(
    z.object({
      idPregunta: z.number(),
      orden: z.number(),
      enunciado: z.string(),
      tipoPregunta: tiposPregunta,
      respuestaAlumno: z.string().nullish(),
      respuestaCorrecta: z.string(),
      explicacion: z.string().nullish(),
      correcto: z.boolean(),
      puntajeMaximo: z.number(),
      puntajeObtenido: z.number(),
    }),
  ),
})

const esquemaEstadoTeorico = z.object({
  codAlumno: z.string(),
  alumno: z.string(),
  bloqueadoPorSubsanacion: z.boolean(),
  motivo: z.string().nullish(),
  desaprobados: z.array(
    z.object({
      idCuestionario: z.number(),
      idTurnoTeorico: z.number(),
      turnoTeorico: z.string(),
      idMateria: z.number(),
      materia: z.string(),
      tipoExamen: tiposExamen,
      fechaExamen: z.string(),
      nota: z.union([z.number(), z.string()]).nullish(),
      notaMinimaAplicada: z.number(),
    }),
  ),
  pendientes: z.array(
    z.object({
      idTurnoTeorico: z.number(),
      nombre: z.string(),
      tipoExamen: tiposExamen,
      idMateria: z.number(),
      materia: z.string(),
      fechaExamen: z.string(),
      horaInicio: z.string(),
      horaFin: z.string(),
    }),
  ),
})

function aEnCurso(crudo: unknown): ExamenEnCurso {
  const examen = esquemaEnCurso.parse(crudo)
  return {
    ...examen,
    preguntas: [...examen.preguntas]
      .sort((a, b) => a.orden - b.orden)
      .map((pregunta) => ({ ...pregunta, respuestaAlumno: pregunta.respuestaAlumno ?? null })),
  }
}

function aResuelto(crudo: unknown): ExamenResuelto {
  const examen = esquemaResuelto.parse(crudo)
  return {
    ...examen,
    fechaEntrega: examen.fechaEntrega ?? null,
    horaEntrega: examen.horaEntrega ?? null,
    nota: aNota(examen.nota),
    aprobado: examen.aprobado ?? null,
    calificaciones: [...examen.calificaciones]
      .sort((a, b) => a.orden - b.orden)
      .map((fila) => ({
        ...fila,
        respuestaAlumno: fila.respuestaAlumno ?? null,
        explicacion: fila.explicacion ?? null,
      })),
  }
}

function aEstadoTeorico(crudo: unknown): EstadoTeorico {
  const estado = esquemaEstadoTeorico.parse(crudo)
  return {
    ...estado,
    motivo: estado.motivo ?? null,
    desaprobados: estado.desaprobados.map((fila) => ({ ...fila, nota: aNota(fila.nota) })),
  }
}

export const clavesExamenes = {
  todo: ['examenes'] as const,
  pendientes: (codAlumno: string) => [...clavesExamenes.todo, 'pendientes', codAlumno] as const,
  examen: (idTurnoTeorico: number, codAlumno: string) =>
    [...clavesExamenes.todo, 'turno', idTurnoTeorico, codAlumno] as const,
  enCurso: (idTurnoTeorico: number, codAlumno: string) =>
    [...clavesExamenes.todo, 'en-curso', idTurnoTeorico, codAlumno] as const,
  estadoTeorico: (codAlumno: string) => [...clavesExamenes.todo, 'estado-teorico', codAlumno] as const,
}

// El `codAlumno` ya no viaja en ninguna de estas cinco rutas: el servidor resuelve al alumno desde
// el token (dependencia 51). Las `consultasExamenes` de abajo SÍ lo conservan, porque ahí no es un
// dato de la petición sino la clave de caché y la condición que espera a que la sesión exista.
export async function listarExamenesPendientes(): Promise<ExamenPendiente[]> {
  const pendientes = await sigeda.lista<unknown>('/api/examenes/pendientes')
  return pendientes.map((pendiente) => {
    const leido = esquemaPendiente.parse(pendiente)
    return { ...leido, idCuestionario: leido.idCuestionario ?? null }
  })
}

export async function iniciarExamen(idTurnoTeorico: number): Promise<ExamenEnCurso> {
  return aEnCurso(await sigeda.post<unknown>(`/api/turnos-teoricos/${encodeURIComponent(idTurnoTeorico)}/iniciar`))
}

export async function guardarRespuestas(idCuestionario: number, respuestas: RespuestaDeExamen[]): Promise<void> {
  await sigeda.put<unknown>(`/api/cuestionarios/${encodeURIComponent(idCuestionario)}/respuestas`, { respuestas })
}

export async function entregarExamen(idCuestionario: number): Promise<ExamenResuelto> {
  const respuesta = await sigeda.post<unknown>(`/api/cuestionarios/${encodeURIComponent(idCuestionario)}/entregar`)
  const cuerpo = respuesta as { cuestionario?: unknown }
  return aResuelto(cuerpo.cuestionario ?? respuesta)
}

export async function obtenerMiExamen(idTurnoTeorico: number): Promise<ExamenResuelto> {
  return aResuelto(
    await sigeda.get<unknown>(`/api/turnos-teoricos/${encodeURIComponent(idTurnoTeorico)}/mi-cuestionario`),
  )
}

export async function obtenerExamen(idCuestionario: number): Promise<ExamenResuelto> {
  return aResuelto(await sigeda.get<unknown>(`/api/cuestionarios/${encodeURIComponent(idCuestionario)}`))
}

export async function obtenerEstadoTeorico(codAlumno: string): Promise<EstadoTeorico> {
  return aEstadoTeorico(await sigeda.get<unknown>(`/api/personas/${encodeURIComponent(codAlumno)}/estado-teorico`))
}

export const consultasExamenes = {
  pendientes: (codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.pendientes(codAlumno),
      queryFn: () => listarExamenesPendientes(),
      enabled: codAlumno !== '',
    }),
  miExamen: (idTurnoTeorico: number, codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.examen(idTurnoTeorico, codAlumno),
      queryFn: () => obtenerMiExamen(idTurnoTeorico),
      enabled: codAlumno !== '',
      retry: false,
    }),
  enCurso: (idTurnoTeorico: number, codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.enCurso(idTurnoTeorico, codAlumno),
      queryFn: () => iniciarExamen(idTurnoTeorico),
      enabled: codAlumno !== '',
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
    }),
  estadoTeorico: (codAlumno: string) =>
    queryOptions({
      queryKey: clavesExamenes.estadoTeorico(codAlumno),
      queryFn: () => obtenerEstadoTeorico(codAlumno),
      enabled: codAlumno !== '',
      retry: false,
    }),
}
