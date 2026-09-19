import { createFileRoute } from '@tanstack/react-router'
import { OrdenDeVueloPage } from '@/features/turnos/orden-de-vuelo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/turnos/dia/$fecha')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.ordenDeVueloDelDia, context.sesion.actual()),
  component: RutaOrdenDeVuelo,
})

function RutaOrdenDeVuelo() {
  const { fecha } = Route.useParams()
  return <OrdenDeVueloPage fecha={fecha} />
}
