import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { SinPermisoError } from '@/lib/auth/guardas'
import { veSoloLoPropio } from '@/lib/auth/pantallas'
import type { Sesion } from '@/lib/auth/sesion'
import { consultasEvaluaciones, type EvaluacionDetalle } from './api'

const PATRON_CODIGO = /^\d{6}-\d+(-\d+)?$/

export async function cargarEvaluacionVisible(
  queryClient: QueryClient,
  actual: Sesion | null,
  codigo: string,
): Promise<EvaluacionDetalle> {
  if (!PATRON_CODIGO.test(codigo)) throw notFound()
  let evaluacion: EvaluacionDetalle
  try {
    evaluacion = await queryClient.ensureQueryData(consultasEvaluaciones.detalle(codigo))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
  if (actual && veSoloLoPropio(actual) && evaluacion.codPersona !== actual.codPersona) throw new SinPermisoError()
  return evaluacion
}
