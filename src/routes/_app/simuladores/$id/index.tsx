import { createFileRoute } from '@tanstack/react-router'
import { SimuladorDetallePage } from '@/features/simuladores/simulador-detalle-page'
import { simuladorQuery } from '@/features/simuladores/api'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/simuladores/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.simulador, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(simuladorQuery(Number(params.id))),
  component: RutaSimulador,
})

function RutaSimulador() {
  const { id } = Route.useParams()
  return <SimuladorDetallePage id={Number(id)} />
}
