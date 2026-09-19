import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app'
import { sesion } from '@/lib/auth/sesion'
import { CONTRASENA_SEED } from '@/mocks/sigeda/usuarios'
import { crearRouter } from '@/router'

export function iniciarComo(username: string) {
  return sesion.iniciar(username, CONTRASENA_SEED)
}

export function renderApp(ruta = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = crearRouter(queryClient, createMemoryHistory({ initialEntries: [ruta] }))
  const usuario = userEvent.setup()
  const resultado = render(<App router={router} queryClient={queryClient} />)
  return { ...resultado, router, usuario }
}
