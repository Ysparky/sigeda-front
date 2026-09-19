import { createFileRoute } from '@tanstack/react-router'
import { RegistrarEvaluacionPage } from '@/features/evaluaciones/registrar-evaluacion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/evaluar/$alumno')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarEvaluacion, context.sesion.actual()),
  component: RutaRegistrarEvaluacion,
})

function RutaRegistrarEvaluacion() {
  const { id, alumno } = Route.useParams()
  return <RegistrarEvaluacionPage id={Number(id)} codAlumno={alumno} />
}
