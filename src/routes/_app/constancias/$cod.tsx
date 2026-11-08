import { createFileRoute } from '@tanstack/react-router'
import { consultasEgreso } from '@/features/egreso/api'
import { ConstanciaPage } from '@/features/egreso/constancia-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/constancias/$cod')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.constancia, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(consultasEgreso.constancia(params.cod)),
  component: RutaConstancia,
})

function RutaConstancia() {
  const { cod } = Route.useParams()
  return <ConstanciaPage cod={cod} />
}
