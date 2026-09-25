import { createFileRoute } from '@tanstack/react-router'
import { RegistrarTurnoTeoricoPage } from '@/features/turnos-teoricos/registrar-turno-teorico-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/teoria/turnos/nuevo')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarTurnoTeorico, context.sesion.actual()),
  component: RegistrarTurnoTeoricoPage,
})
