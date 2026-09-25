import { createMemoryHistory } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { App } from '@/app'
import { sesion } from '@/lib/auth/sesion'
import { crearQueryClient } from '@/lib/query'
import { CONTRASENA_SEED } from '@/mocks/sigeda/usuarios'
import { crearRouter } from '@/router'

export function iniciarComo(username: string) {
  return sesion.iniciar(username, CONTRASENA_SEED)
}

export function renderApp(ruta = '/', usuario: UserEvent = userEvent.setup()) {
  const queryClient = crearQueryClient({ reintentar: false })
  const router = crearRouter(queryClient, createMemoryHistory({ initialEntries: [ruta] }))
  const resultado = render(<App router={router} queryClient={queryClient} />)
  return { ...resultado, router, usuario, queryClient }
}
