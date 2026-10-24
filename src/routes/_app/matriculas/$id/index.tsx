import { createFileRoute } from '@tanstack/react-router'
import { MatriculaDetallePage } from '@/features/matriculas/matricula-detalle-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/matriculas/$id/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.matricula, context.sesion.actual()),
  component: RutaMatricula,
})

function RutaMatricula() {
  const { id } = Route.useParams()
  return <MatriculaDetallePage id={Number(id)} />
}
