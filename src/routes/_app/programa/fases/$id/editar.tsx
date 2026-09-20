import { createFileRoute } from '@tanstack/react-router'
import { ModificarFasePage } from '@/features/fases/modificar-fase-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/fases/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarFase, context.sesion.actual()),
  component: RutaModificarFase,
})

function RutaModificarFase() {
  const { id } = Route.useParams()
  return <ModificarFasePage id={Number(id)} />
}
