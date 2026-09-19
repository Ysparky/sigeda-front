import { createFileRoute } from '@tanstack/react-router'
import { InicioPage } from '@/features/inicio/inicio-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.inicio, context.sesion.actual()),
  component: InicioPage,
})
