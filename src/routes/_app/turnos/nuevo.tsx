import { createFileRoute } from '@tanstack/react-router'
import { RegistrarTurnoPage } from '@/features/turnos/registrar-turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/nuevo')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarTurno, context.sesion.actual()),
  component: RegistrarTurnoPage,
})
