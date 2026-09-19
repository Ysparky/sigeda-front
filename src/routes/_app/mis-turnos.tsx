import { createFileRoute } from '@tanstack/react-router'
import { MisTurnosPage } from '@/features/turnos/mis-turnos-page'
import { esquemaBusquedaPaginada } from '@/features/turnos/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mis-turnos')({
  validateSearch: esquemaBusquedaPaginada,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misTurnos, context.sesion.actual()),
  component: MisTurnosPage,
})
