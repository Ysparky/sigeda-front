import { createFileRoute } from '@tanstack/react-router'
import { cargarTurnoTeorico } from '@/features/turnos-teoricos/cargar'
import { ModificarTurnoTeoricoPage } from '@/features/turnos-teoricos/modificar-turno-teorico-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/teoria/turnos/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarTurnoTeorico, context.sesion.actual()),
  loader: ({ context, params }) => cargarTurnoTeorico(context.queryClient, params.id),
  component: RutaModificar,
})

function RutaModificar() {
  const { id } = Route.useParams()
  return <ModificarTurnoTeoricoPage id={Number(id)} />
}
