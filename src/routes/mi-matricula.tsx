import { createFileRoute, redirect } from '@tanstack/react-router'
import { MiMatriculaPage } from '@/features/inscripcion/mi-matricula-page'

export const Route = createFileRoute('/mi-matricula')({
  beforeLoad: ({ context, location }) => {
    if (!context.sesion.actual()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: MiMatriculaPage,
})
