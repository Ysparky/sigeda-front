import { createFileRoute } from '@tanstack/react-router'
import { ReportesPage } from '@/features/reportes/reportes-page'
import { esquemaBusquedaReportes } from '@/features/seguimiento/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/reportes')({
  validateSearch: esquemaBusquedaReportes,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.reportes, context.sesion.actual()),
  component: ReportesPage,
})
