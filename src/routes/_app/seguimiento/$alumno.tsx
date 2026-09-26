import { createFileRoute } from '@tanstack/react-router'
import { LegajoPage } from '@/features/seguimiento/legajo-page'
import { esquemaBusquedaLegajo } from '@/features/seguimiento/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/seguimiento/$alumno')({
  validateSearch: esquemaBusquedaLegajo,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.legajo, context.sesion.actual()),
  component: RutaLegajo,
})

function RutaLegajo() {
  const { alumno } = Route.useParams()
  return <LegajoPage codAlumno={alumno} />
}
