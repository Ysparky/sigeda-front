import { createFileRoute } from '@tanstack/react-router'
import { FasesPage } from '@/features/fases/fases-page'
import { esquemaBusquedaFases } from '@/features/fases/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/')({
  validateSearch: esquemaBusquedaFases,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fases, context.sesion.actual()),
  component: FasesPage,
})
