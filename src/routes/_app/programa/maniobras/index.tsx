import { createFileRoute } from '@tanstack/react-router'
import { ManiobrasPage } from '@/features/maniobras/maniobras-page'
import { esquemaBusquedaManiobras } from '@/features/maniobras/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/')({
  validateSearch: esquemaBusquedaManiobras,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobras, context.sesion.actual()),
  component: ManiobrasPage,
})
