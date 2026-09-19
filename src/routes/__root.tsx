import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { ContextoRouter } from '@/router'

export const Route = createRootRouteWithContext<ContextoRouter>()({
  component: Outlet,
})
