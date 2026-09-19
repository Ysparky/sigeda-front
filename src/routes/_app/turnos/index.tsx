import { createFileRoute } from '@tanstack/react-router'
import { TurnosPage } from '@/features/turnos/turnos-page'
import { esquemaBusquedaTurnos } from '@/features/turnos/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/')({
  validateSearch: esquemaBusquedaTurnos,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.turnos, context.sesion.actual()),
  component: TurnosPage,
})
