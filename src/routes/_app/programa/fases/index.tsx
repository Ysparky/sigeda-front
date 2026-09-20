import { createFileRoute } from '@tanstack/react-router'
import { FasesPage } from '@/features/fases/fases-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fases, context.sesion.actual()),
  component: FasesPage,
})
