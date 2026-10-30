import { createFileRoute } from '@tanstack/react-router'
import { SesionesPage } from '@/features/sesiones-simulador/sesiones-page'
import { esquemaBusquedaSesiones } from '@/features/sesiones-simulador/schemas'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/sesiones-simulador/')({
  validateSearch: esquemaBusquedaSesiones,
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.sesiones, context.sesion.actual()),
  component: RutaSesiones,
})

function RutaSesiones() {
  const { estado } = Route.useSearch()
  return <SesionesPage estado={estado} />
}
