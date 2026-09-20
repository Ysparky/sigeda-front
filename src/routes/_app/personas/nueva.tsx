import { createFileRoute } from '@tanstack/react-router'
import { RegistrarPersonaPage } from '@/features/personas/registrar-persona-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarPersona, context.sesion.actual()),
  component: RegistrarPersonaPage,
})
