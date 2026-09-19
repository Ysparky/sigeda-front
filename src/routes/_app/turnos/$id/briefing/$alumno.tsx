import { createFileRoute } from '@tanstack/react-router'
import { HojaDeBriefingPage } from '@/features/turnos/hoja-de-briefing-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/$id/briefing/$alumno')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.hojaDeBriefing, context.sesion.actual()),
  component: RutaHojaDeBriefing,
})

function RutaHojaDeBriefing() {
  const { id, alumno } = Route.useParams()
  return <HojaDeBriefingPage id={Number(id)} codAlumno={alumno} />
}
