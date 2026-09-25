import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { SinPermisoError } from '@/lib/auth/guardas'
import type { Sesion } from '@/lib/auth/sesion'
import { consultasExamenes } from './api'

export type ContextoDeExamen = { idTurno: number; codAlumno: string }

export async function cargarExamenPropio(
  queryClient: QueryClient,
  actual: Sesion | null,
  idTexto: string,
): Promise<ContextoDeExamen> {
  const idTurno = Number(idTexto)
  if (!Number.isInteger(idTurno) || idTurno <= 0) throw notFound()
  const codAlumno = actual?.codPersona
  if (!codAlumno) throw new SinPermisoError()
  const contexto = { idTurno, codAlumno }
  let pendientes
  try {
    pendientes = await queryClient.ensureQueryData(consultasExamenes.pendientes(codAlumno))
  } catch {
    return contexto
  }
  if (pendientes.some((pendiente) => pendiente.idTurnoTeorico === idTurno)) return contexto
  try {
    await queryClient.ensureQueryData(consultasExamenes.miExamen(idTurno, codAlumno))
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) throw notFound()
  }
  return contexto
}
