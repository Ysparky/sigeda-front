import { createFileRoute } from '@tanstack/react-router'
import { MisTurnosPage } from '@/features/turnos/mis-turnos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mis-turnos')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.misTurnos, context.sesion.actual()),
  component: MisTurnosPage,
})
