import { createFileRoute } from '@tanstack/react-router'
import { cargarPersonaVisible } from '@/features/personas/cargar'
import { PersonaPage } from '@/features/personas/persona-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/personas/$cod')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.persona, context.sesion.actual()),
  loader: ({ context, params }) => cargarPersonaVisible(context.queryClient, params.cod),
  component: RutaPersona,
})

function RutaPersona() {
  const { cod } = Route.useParams()
  return <PersonaPage cod={cod} />
}
