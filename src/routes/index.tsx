import { createFileRoute, redirect } from '@tanstack/react-router'
import { LandingPage } from '@/features/inscripcion/landing-page'
import { hogarDe } from '@/lib/auth/guardas'

export const Route = createFileRoute('/')({
  // `/` es la cara pública. Si ya hay sesión, el visitante no se queda en el marketing: va a su tablero.
  beforeLoad: ({ context }) => {
    const actual = context.sesion.actual()
    if (actual) throw redirect({ to: hogarDe(actual) })
  },
  component: LandingPage,
})
