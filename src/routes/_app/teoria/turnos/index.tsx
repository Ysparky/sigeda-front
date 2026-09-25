import { createFileRoute } from '@tanstack/react-router'
import { esquemaBusquedaTurnosTeoricos } from '@/features/turnos-teoricos/schemas'
import { TurnosTeoricosPage } from '@/features/turnos-teoricos/turnos-teoricos-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/teoria/turnos/')({
  validateSearch: esquemaBusquedaTurnosTeoricos,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.turnosTeoricos, context.sesion.actual()),
  component: TurnosTeoricosPage,
})
