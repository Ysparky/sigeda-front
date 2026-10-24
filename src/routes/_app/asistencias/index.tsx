import { createFileRoute } from '@tanstack/react-router'
import { ReporteAsistenciaPage } from '@/features/asistencias/reporte'
import { esquemaBusquedaReporte } from '@/features/asistencias/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/asistencias/')({
  validateSearch: esquemaBusquedaReporte,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.asistencia, context.sesion.actual()),
  component: ReporteAsistenciaPage,
})
