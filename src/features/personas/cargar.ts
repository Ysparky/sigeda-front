import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/errors'
import { consultasPersonas, type PersonaDetalle } from './api'

const PATRON_CODIGO = /^[A-Za-z0-9]{6}$/

export async function cargarPersonaVisible(queryClient: QueryClient, codigo: string): Promise<PersonaDetalle> {
  if (!PATRON_CODIGO.test(codigo)) throw notFound()
  try {
    return await queryClient.ensureQueryData(consultasPersonas.detalle(codigo))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
