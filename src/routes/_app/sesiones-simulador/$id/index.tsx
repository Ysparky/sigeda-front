import { createFileRoute } from '@tanstack/react-router'
import { sesionQuery } from '@/features/sesiones-simulador/api'
import { SesionDetallePage } from '@/features/sesiones-simulador/sesion-detalle-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/sesiones-simulador/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.sesion, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sesionQuery(Number(params.id))),
  component: RutaSesion,
})

function RutaSesion() {
  const { id } = Route.useParams()
  return <SesionDetallePage id={Number(id)} />
}
