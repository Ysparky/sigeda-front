import { createFileRoute } from '@tanstack/react-router'
import { cargarExamenPropio } from '@/features/examenes/cargar'
import { ResultadoExamenPage } from '@/features/examenes/resultado-examen-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/examenes/$id/resultado')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.resultadoExamen, context.sesion.actual()),
  loader: ({ context, params }) => cargarExamenPropio(context.queryClient, context.sesion.actual(), params.id),
  component: RutaResultado,
})

function RutaResultado() {
  const { id } = Route.useParams()
  return <ResultadoExamenPage idTurno={Number(id)} />
}
