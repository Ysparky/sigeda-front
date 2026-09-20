import { createFileRoute } from '@tanstack/react-router'
import { cargarManiobraVisible } from '@/features/maniobras/cargar'
import { ModificarManiobraPage } from '@/features/maniobras/modificar-maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarManiobra, context.sesion.actual()),
  loader: ({ context, params }) => cargarManiobraVisible(context.queryClient, params.id),
  component: RutaModificarManiobra,
})

function RutaModificarManiobra() {
  const { id } = Route.useParams()
  return <ModificarManiobraPage id={Number(id)} />
}
