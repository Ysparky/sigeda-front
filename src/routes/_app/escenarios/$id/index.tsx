import { createFileRoute } from '@tanstack/react-router'
import { escenarioQuery } from '@/features/escenarios/api'
import { EscenarioDetallePage } from '@/features/escenarios/escenario-detalle-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/escenarios/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.escenario, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(escenarioQuery(Number(params.id))),
  component: RutaEscenario,
})

function RutaEscenario() {
  const { id } = Route.useParams()
  return <EscenarioDetallePage id={Number(id)} />
}
