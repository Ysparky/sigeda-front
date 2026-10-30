import { createFileRoute } from '@tanstack/react-router'
import { FormularioSimulador } from '@/features/simuladores/formulario-simulador'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/simuladores/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.simuladorNuevo, context.sesion.actual()),
  component: () => <FormularioSimulador />,
})
