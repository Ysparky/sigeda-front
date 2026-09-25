import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasTurnosTeoricos } from './api'

export async function cargarTurnoTeorico(queryClient: QueryClient, idTexto: string): Promise<void> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  try {
    await queryClient.ensureQueryData(consultasTurnosTeoricos.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
  }
}
