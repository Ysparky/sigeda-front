import { createFileRoute } from '@tanstack/react-router'
import { ManiobrasPage } from '@/features/maniobras/maniobras-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobras, context.sesion.actual()),
  component: ManiobrasPage,
})
