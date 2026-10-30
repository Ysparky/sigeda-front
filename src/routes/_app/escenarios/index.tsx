import { createFileRoute } from '@tanstack/react-router'
import { EscenariosPage } from '@/features/escenarios/escenarios-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/escenarios/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.escenarios, context.sesion.actual()),
  component: EscenariosPage,
})
