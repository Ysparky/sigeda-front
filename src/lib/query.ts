import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/errors'

function esReintentable(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}

export function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (fallas, error) => fallas < 2 && esReintentable(error),
      },
      mutations: { retry: false },
    },
  })
}

export function errorDePrimeraCarga(...consultas: Array<{ error: unknown; data: unknown }>): unknown {
  return consultas.find((consulta) => consulta.data === undefined && consulta.error)?.error ?? null
}
