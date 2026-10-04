import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context, location }) => {
    if (context.sesion.actual()) return
    // El `redirect` sirve para volver donde uno estaba cuando la sesión VENCE. Tras un cierre
    // deliberado no: mandaría al siguiente usuario a la página del anterior.
    if (context.sesion.seCerroPorElUsuario()) throw redirect({ to: '/login', search: {} })
    throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: DisposicionApp,
})

function DisposicionApp() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
