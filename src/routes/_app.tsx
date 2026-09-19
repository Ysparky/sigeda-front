import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context, location }) => {
    if (!context.sesion.actual()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: DisposicionApp,
})

function DisposicionApp() {
  return (
    <div className="p-6">
      <Outlet />
    </div>
  )
}
