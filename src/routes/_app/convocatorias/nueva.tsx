import { createFileRoute } from '@tanstack/react-router'
import { FormularioConvocatoria } from '@/features/convocatorias/formulario-convocatoria'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/convocatorias/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.convocatoriaNueva, context.sesion.actual()),
  component: () => <FormularioConvocatoria />,
})
