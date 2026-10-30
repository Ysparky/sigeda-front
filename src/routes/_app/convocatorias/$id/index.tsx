import { createFileRoute } from '@tanstack/react-router'
import { convocatoriaQuery } from '@/features/convocatorias/api'
import { ConvocatoriaDetallePage } from '@/features/convocatorias/convocatoria-detalle-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/convocatorias/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.convocatoria, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(convocatoriaQuery(Number(params.id))),
  component: RutaDetalle,
})

function RutaDetalle() {
  const { id } = Route.useParams()
  return <ConvocatoriaDetallePage id={Number(id)} />
}
