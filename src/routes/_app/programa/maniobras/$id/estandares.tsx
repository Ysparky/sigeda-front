import { createFileRoute } from '@tanstack/react-router'
import { EstandaresPage } from '@/features/maniobras/estandares-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/programa/maniobras/$id/estandares')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.estandares, context.sesion.actual()),
  component: RutaEstandares,
})

function RutaEstandares() {
  const { id } = Route.useParams()
  return <EstandaresPage id={Number(id)} />
}
