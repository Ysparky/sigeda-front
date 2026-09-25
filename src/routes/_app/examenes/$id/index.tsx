import { createFileRoute } from '@tanstack/react-router'
import { cargarExamenPropio } from '@/features/examenes/cargar'
import { RendirExamenPage } from '@/features/examenes/rendir-examen-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/examenes/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.rendirExamen, context.sesion.actual()),
  loader: ({ context, params }) => cargarExamenPropio(context.queryClient, context.sesion.actual(), params.id),
  component: RutaRendir,
})

function RutaRendir() {
  const { id } = Route.useParams()
  return <RendirExamenPage idTurno={Number(id)} />
}
