import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/features/inscripcion/landing-page'

export const Route = createFileRoute('/bienvenida')({
  component: LandingPage,
})
