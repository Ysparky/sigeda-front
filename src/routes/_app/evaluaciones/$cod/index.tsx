import { createFileRoute } from '@tanstack/react-router'
import { EvaluacionPage } from '@/features/evaluaciones/evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/$cod/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.evaluacion, context.sesion.actual()),
  component: RutaEvaluacion,
})

function RutaEvaluacion() {
  const { cod } = Route.useParams()
  return <EvaluacionPage codigo={cod} />
}
