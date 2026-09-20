import { createFileRoute } from '@tanstack/react-router'
import { ManiobraPage } from '@/features/maniobras/maniobra-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.maniobra, context.sesion.actual()),
  component: RutaManiobra,
})

function RutaManiobra() {
  const { id } = Route.useParams()
  return <ManiobraPage id={Number(id)} />
}
