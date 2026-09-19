import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context, location }) => {
    if (!context.sesion.actual()) throw redirect({ to: '/login', search: { redirect: location.href } })
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
