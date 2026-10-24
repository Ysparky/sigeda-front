import { createFileRoute } from '@tanstack/react-router'
import { AsistenciaRegistroPage } from '@/features/asistencias/registro'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/asistencia')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.registrarAsistencia, context.sesion.actual()),
  component: RutaAsistencia,
})

function RutaAsistencia() {
  const { id } = Route.useParams()
  return <AsistenciaRegistroPage idTurno={Number(id)} />
}
