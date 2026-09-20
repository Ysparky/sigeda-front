import { createFileRoute } from '@tanstack/react-router'
import { PersonasPage } from '@/features/personas/personas-page'
import { esquemaBusquedaPersonas } from '@/features/personas/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/')({
  validateSearch: esquemaBusquedaPersonas,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.personas, context.sesion.actual()),
  component: PersonasPage,
})
