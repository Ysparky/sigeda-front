import { createFileRoute } from '@tanstack/react-router'
import { ModificarManiobraPage } from '@/features/maniobras/modificar-maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarManiobra, context.sesion.actual()),
  component: RutaModificarManiobra,
})

function RutaModificarManiobra() {
  const { id } = Route.useParams()
  return <ModificarManiobraPage id={Number(id)} />
}
