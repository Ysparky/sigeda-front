import { createFileRoute } from '@tanstack/react-router'
import { ModificarEvaluacionPage } from '@/features/evaluaciones/modificar-evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/evaluaciones/$cod/editar')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.modificarEvaluacion, context.sesion.actual()),
  component: RutaModificarEvaluacion,
})

function RutaModificarEvaluacion() {
  const { cod } = Route.useParams()
  return <ModificarEvaluacionPage codigo={cod} />
}
