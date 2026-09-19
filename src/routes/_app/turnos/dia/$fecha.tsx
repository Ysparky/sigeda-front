import { createFileRoute, notFound } from '@tanstack/react-router'
import { OrdenDeVueloPage } from '@/features/turnos/orden-de-vuelo-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { esFechaIso } from '@/lib/dominio/calendario'

export const Route = createFileRoute('/_app/turnos/dia/$fecha')({
  beforeLoad: ({ context, params }) => {
    exigirPantalla(PANTALLAS.ordenDeVueloDelDia, context.sesion.actual())
    if (!esFechaIso(params.fecha)) throw notFound()
  },
  component: RutaOrdenDeVuelo,
})

function RutaOrdenDeVuelo() {
  const { fecha } = Route.useParams()
  return <OrdenDeVueloPage fecha={fecha} />
}
