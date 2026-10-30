import { createFileRoute } from '@tanstack/react-router'
import { FormularioEscenario } from '@/features/escenarios/formulario-escenario'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/escenarios/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.escenarioNuevo, context.sesion.actual()),
  component: () => <FormularioEscenario />,
})
