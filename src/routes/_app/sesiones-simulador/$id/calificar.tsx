import { createFileRoute } from '@tanstack/react-router'
import { sesionQuery } from '@/features/sesiones-simulador/api'
import { CalificarSesionPage } from '@/features/sesiones-simulador/calificar-sesion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/sesiones-simulador/$id/calificar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.sesionCalificar, context.sesion.actual()),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sesionQuery(Number(params.id))),
  component: RutaCalificar,
})

function RutaCalificar() {
  const { id } = Route.useParams()
  return <CalificarSesionPage id={Number(id)} />
}
