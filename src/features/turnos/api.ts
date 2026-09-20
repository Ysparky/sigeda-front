import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { sigeda } from '@/lib/api/sigeda'
import { esFechaIso } from '@/lib/dominio/calendario'
import { esNotaDirbe, type NotaDirbe } from '@/lib/dominio/dirbe'

export type TurnoResumen = {
  id: number
  nombre: string
  subfase: string
  fechaEval: string
  programa: string
  cantAlumno: number
  cantManiobra: number
}

export type AlumnoDelTurno = { codAlumno: string; alumno: string; horaInicio: string; horaFin: string }

export type ManiobraDelTurno = { notaMin: NotaDirbe; maniobra: { id: number; nombre: string; descripcion: string } }

export type AeronaveDelTurno = { id: number; nombre: string; estado: string }

export type TurnoDetalle = {
  id: number
  nombre: string
  subfase: string
  idSubfase?: number
  fase: string
  fechaEval: string
  programa: string
  codInstructor: string | null
  instructor: string | null
  aeronave: AeronaveDelTurno | null
  alumnos: AlumnoDelTurno[]
  maniobras: ManiobraDelTurno[]
}

export type OcupacionAeronave = { idTurno: number; nombre: string; horaInicio: string; horaFin: string }

export type FiltrosTurnos = ParametrosPagina & { programa: Programa; idSubfase?: number; desde?: string; hasta?: string }

export type CuerpoTurno = {
  nombre: string
  fechaEval: string
  programa?: Programa
  idSubfase?: number
  codInstructor: string
  aeronave: { id: number }
  alumnosTurno: { codAlumno: string; horaInicio: string; horaFin: string }[]
  maniobrasTurno: { idManiobra: number; nota_min: NotaDirbe }[]
}

export type TurnoGuardado = { mensaje: string; id: number }

type TurnoRealizadoApi = Omit<TurnoResumen, 'cantAlumno'> & { cantAlumno?: number; cantGrupo?: number }

type DetalleTurnoApi = {
  id: number
  nombre: string
  subfase: string
  idSubfase?: number | null
  fechaEval: string
  programa: string
  fase?: string | null
  codInstructor?: string | null
  instructor?: string | null
  aeronave?: { id: number; nombre: string; estado?: string | null } | null
  alumnosTurno?: { codAlumno: string; alumno?: string | null; horaInicio: string; horaFin: string }[] | null
  maniobrasTurno?: { nota_min: string; maniobra: { id: number; nombre: string; descripcion?: string | null } }[] | null
}

type OcupacionApi = { id: number; nombre: string; horaInicio: string | null; horaFin: string | null }

export const MENSAJE_TURNO_GUARDADO = 'Turno guardado con éxito.'
export const MENSAJE_TURNO_ELIMINADO = 'Turno eliminado con éxito.'

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

export function aTurnoResumen(turno: TurnoRealizadoApi): TurnoResumen {
  return {
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    cantAlumno: turno.cantAlumno ?? turno.cantGrupo ?? 0,
    cantManiobra: turno.cantManiobra,
  }
}

export function aTurnoDetalle(turno: DetalleTurnoApi): TurnoDetalle {
  return {
    id: turno.id,
    nombre: turno.nombre,
    subfase: turno.subfase,
    idSubfase: turno.idSubfase ?? undefined,
    fase: turno.fase ?? '',
    fechaEval: turno.fechaEval,
    programa: turno.programa,
    codInstructor: turno.codInstructor ?? null,
    instructor: turno.instructor ?? null,
    aeronave: turno.aeronave
      ? { id: turno.aeronave.id, nombre: turno.aeronave.nombre, estado: turno.aeronave.estado ?? 'Desconocido' }
      : null,
    alumnos: (turno.alumnosTurno ?? []).map((alumno) => ({
      codAlumno: alumno.codAlumno,
      alumno: alumno.alumno ?? alumno.codAlumno,
      horaInicio: alumno.horaInicio,
      horaFin: alumno.horaFin,
    })),
    maniobras: (turno.maniobrasTurno ?? []).flatMap((item) => {
      const notaMin = item.nota_min.toUpperCase()
      if (!esNotaDirbe(notaMin)) return []
      return [
        {
          notaMin,
          maniobra: { id: item.maniobra.id, nombre: item.maniobra.nombre, descripcion: item.maniobra.descripcion ?? '' },
        },
      ]
    }),
  }
}

export function aTurnoGuardado(respuesta: unknown): TurnoGuardado {
  if (esRegistro(respuesta)) {
    const turno = respuesta.turno
    if (typeof respuesta.mensaje === 'string' && esRegistro(turno) && typeof turno.id === 'number') {
      return { mensaje: respuesta.mensaje, id: turno.id }
    }
    if (typeof respuesta.id === 'number') return { mensaje: MENSAJE_TURNO_GUARDADO, id: respuesta.id }
  }
  throw new ApiError(500, MENSAJE_GENERICO)
}

export const clavesTurnos = {
  todo: ['turnos'] as const,
  lista: (filtros: FiltrosTurnos) => [...clavesTurnos.todo, 'lista', filtros] as const,
  delAlumno: (codAlumno: string, parametros: ParametrosPagina) =>
    [...clavesTurnos.todo, 'alumno', codAlumno, parametros] as const,
  detalle: (id: number) => [...clavesTurnos.todo, 'detalle', id] as const,
  ocupacion: (fecha: string, idAeronave: number) => [...clavesTurnos.todo, 'ocupacion', fecha, idAeronave] as const,
  dia: (fecha: string) => [...clavesTurnos.todo, 'dia', fecha] as const,
}

export async function listarTurnos(filtros: FiltrosTurnos): Promise<Pagina<TurnoResumen>> {
  const pagina = await sigeda.pagina<TurnoRealizadoApi>('/api/turnos', {
    programa: filtros.programa,
    idSubfase: filtros.idSubfase,
    fechaPre: filtros.desde,
    fechaPost: filtros.hasta,
    page: filtros.page,
    size: filtros.size,
    property: filtros.property,
    direction: filtros.direction,
  })
  return { ...pagina, items: pagina.items.map(aTurnoResumen) }
}

export async function listarTurnosDelAlumno(
  codAlumno: string,
  parametros: ParametrosPagina,
): Promise<Pagina<TurnoResumen>> {
  const pagina = await sigeda.pagina<TurnoRealizadoApi>('/api/turnos/alumno', { codAlumno, ...parametros })
  return { ...pagina, items: pagina.items.map(aTurnoResumen) }
}

export async function obtenerTurno(id: number): Promise<TurnoDetalle> {
  return aTurnoDetalle(await sigeda.get<DetalleTurnoApi>(`/api/turnos/${encodeURIComponent(id)}`))
}

export async function listarOcupacionAeronave(fecha: string, idAeronave: number): Promise<OcupacionAeronave[]> {
  const ocupaciones = await sigeda.lista<OcupacionApi>(
    `/api/turnos/${encodeURIComponent(fecha)}/aeronave/${encodeURIComponent(idAeronave)}`,
  )
  return ocupaciones.flatMap((ocupacion) =>
    ocupacion.horaInicio && ocupacion.horaFin
      ? [{ idTurno: ocupacion.id, nombre: ocupacion.nombre, horaInicio: ocupacion.horaInicio, horaFin: ocupacion.horaFin }]
      : [],
  )
}

export async function listarTurnosDelDia(fecha: string): Promise<TurnoDetalle[]> {
  const paginas = await Promise.all(
    PROGRAMAS.map((programa) =>
      sigeda.pagina<TurnoRealizadoApi>('/api/turnos', { programa, fechaPre: fecha, fechaPost: fecha, page: 0, size: 100 }),
    ),
  )
  const ids = paginas.flatMap((pagina) => pagina.items.map((turno) => turno.id))
  return Promise.all(ids.map(obtenerTurno))
}

export async function crearTurno(cuerpo: CuerpoTurno): Promise<TurnoGuardado> {
  return aTurnoGuardado(await sigeda.post<unknown>('/api/turnos', cuerpo))
}

export async function modificarTurno(id: number, cuerpo: CuerpoTurno): Promise<TurnoGuardado> {
  const { nombre, fechaEval, codInstructor, aeronave, alumnosTurno, maniobrasTurno } = cuerpo
  return aTurnoGuardado(
    await sigeda.put<unknown>(`/api/turnos/${encodeURIComponent(id)}`, {
      nombre,
      fechaEval,
      codInstructor,
      aeronave,
      alumnosTurno,
      maniobrasTurno,
    }),
  )
}

export async function eliminarTurno(id: number): Promise<string> {
  const respuesta = await sigeda.eliminar<unknown>(`/api/turnos/${encodeURIComponent(id)}`)
  return typeof respuesta === 'string' && respuesta.trim() !== '' ? respuesta : MENSAJE_TURNO_ELIMINADO
}

export const consultasTurnos = {
  lista: (filtros: FiltrosTurnos) =>
    queryOptions({
      queryKey: clavesTurnos.lista(filtros),
      queryFn: () => listarTurnos(filtros),
      placeholderData: keepPreviousData,
    }),
  delAlumno: (codAlumno: string, parametros: ParametrosPagina) =>
    queryOptions({
      queryKey: clavesTurnos.delAlumno(codAlumno, parametros),
      queryFn: () => listarTurnosDelAlumno(codAlumno, parametros),
      placeholderData: keepPreviousData,
    }),
  detalle: (id: number) => queryOptions({ queryKey: clavesTurnos.detalle(id), queryFn: () => obtenerTurno(id) }),
  ocupacion: (fecha: string, idAeronave: number) =>
    queryOptions({
      queryKey: clavesTurnos.ocupacion(fecha, idAeronave),
      queryFn: () => listarOcupacionAeronave(fecha, idAeronave),
      enabled: esFechaIso(fecha) && idAeronave > 0,
    }),
  dia: (fecha: string) => queryOptions({ queryKey: clavesTurnos.dia(fecha), queryFn: () => listarTurnosDelDia(fecha) }),
}

export function useGuardarTurno(id?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: CuerpoTurno) => (id === undefined ? crearTurno(cuerpo) : modificarTurno(id, cuerpo)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesTurnos.todo }),
  })
}

export function useEliminarTurno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: eliminarTurno,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesTurnos.todo }),
  })
}
