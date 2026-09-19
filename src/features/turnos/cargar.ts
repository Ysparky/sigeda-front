import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { SinPermisoError } from '@/lib/auth/guardas'
import { veSoloLoPropio } from '@/lib/auth/pantallas'
import type { Sesion } from '@/lib/auth/sesion'
import { consultasTurnos, type TurnoDetalle } from './api'

export async function cargarTurnoVisible(
  queryClient: QueryClient,
  actual: Sesion | null,
  idTexto: string,
  codAlumno?: string,
): Promise<TurnoDetalle> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  let turno: TurnoDetalle
  try {
    turno = await queryClient.ensureQueryData(consultasTurnos.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
  if (codAlumno !== undefined && !turno.alumnos.some((alumno) => alumno.codAlumno === codAlumno)) throw notFound()
  if (actual && veSoloLoPropio(actual)) {
    const propio = turno.alumnos.some((alumno) => alumno.codAlumno === actual.codPersona)
    if (!propio || (codAlumno !== undefined && codAlumno !== actual.codPersona)) throw new SinPermisoError()
  }
  return turno
}
