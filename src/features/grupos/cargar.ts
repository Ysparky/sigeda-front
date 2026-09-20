import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasGrupos, type GrupoDetalle } from './api'

export async function cargarGrupoVisible(queryClient: QueryClient, idTexto: string): Promise<GrupoDetalle> {
  const id = Number(idTexto)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  try {
    return await queryClient.ensureQueryData(consultasGrupos.detalle(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
