import { createFileRoute } from '@tanstack/react-router'
import { ModificarTurnoPage } from '@/features/turnos/modificar-turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarTurno, context.sesion.actual()),
  component: RutaModificarTurno,
})

function RutaModificarTurno() {
  const { id } = Route.useParams()
  return <ModificarTurnoPage id={Number(id)} />
}
