import { createFileRoute } from '@tanstack/react-router'
import { cargarManiobraVisible } from '@/features/maniobras/cargar'
import { ManiobraPage } from '@/features/maniobras/maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobra, context.sesion.actual()),
  loader: ({ context, params }) => cargarManiobraVisible(context.queryClient, params.id),
  component: RutaManiobra,
})

function RutaManiobra() {
  const { id } = Route.useParams()
  return <ManiobraPage id={Number(id)} />
}
