import { createFileRoute } from '@tanstack/react-router'
import { cargarEvaluacionVisible } from '@/features/evaluaciones/cargar'
import { EvaluacionPage } from '@/features/evaluaciones/evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/$cod/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.evaluacion, context.sesion.actual()),
  loader: ({ context, params }) => cargarEvaluacionVisible(context.queryClient, context.sesion.actual(), params.cod),
  component: RutaEvaluacion,
})

function RutaEvaluacion() {
  const { cod } = Route.useParams()
  return <EvaluacionPage codigo={cod} />
}
