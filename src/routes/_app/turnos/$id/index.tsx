import { createFileRoute } from '@tanstack/react-router'
import { cargarTurnoVisible } from '@/features/turnos/cargar'
import { TurnoPage } from '@/features/turnos/turno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.turno, context.sesion.actual()),
  loader: ({ context, params }) => cargarTurnoVisible(context.queryClient, context.sesion.actual(), params.id),
  component: RutaTurno,
})

function RutaTurno() {
  const { id } = Route.useParams()
  return <TurnoPage id={Number(id)} />
}
