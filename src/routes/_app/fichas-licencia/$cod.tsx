import { createFileRoute } from '@tanstack/react-router'
import { fichaQuery } from '@/features/ficha-licencia/api'
import { FichaPage } from '@/features/ficha-licencia/ficha-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/fichas-licencia/$cod')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.fichaLicencia, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(fichaQuery(params.cod)),
  component: RutaFicha,
})

function RutaFicha() {
  const { cod } = Route.useParams()
  return <FichaPage cod={cod} />
}
