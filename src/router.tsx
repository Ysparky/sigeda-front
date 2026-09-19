import type { QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { ErrorDeRuta, NoEncontrado } from '@/components/error-de-ruta'
import { sesion } from '@/lib/auth/sesion'
import { routeTree } from './routeTree.gen'

export type ContextoRouter = { queryClient: QueryClient; sesion: typeof sesion }

export function crearRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    routeTree,
    context: { queryClient, sesion },
    history,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ErrorDeRuta,
    defaultNotFoundComponent: NoEncontrado,
  })
}

export type Router = ReturnType<typeof crearRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: Router
  }
}
