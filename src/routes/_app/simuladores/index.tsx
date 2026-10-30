import { createFileRoute } from '@tanstack/react-router'
import { SimuladoresPage } from '@/features/simuladores/simuladores-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/simuladores/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.simuladores, context.sesion.actual()),
  component: SimuladoresPage,
})
