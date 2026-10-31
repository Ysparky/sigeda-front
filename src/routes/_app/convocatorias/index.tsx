import { createFileRoute } from '@tanstack/react-router'
import { ConvocatoriasPage } from '@/features/convocatorias/convocatorias-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/convocatorias/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.convocatorias, context.sesion.actual()),
  component: ConvocatoriasPage,
})
