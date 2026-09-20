import { createFileRoute } from '@tanstack/react-router'
import { PersonasPage } from '@/features/personas/personas-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.personas, context.sesion.actual()),
  component: PersonasPage,
})
