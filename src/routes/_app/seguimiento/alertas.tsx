import { createFileRoute } from '@tanstack/react-router'
import { AlertasPage } from '@/features/seguimiento/alertas-page'
import { esquemaBusquedaAlertas } from '@/features/seguimiento/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/seguimiento/alertas')({
  validateSearch: esquemaBusquedaAlertas,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.alertas, context.sesion.actual()),
  component: AlertasPage,
})
