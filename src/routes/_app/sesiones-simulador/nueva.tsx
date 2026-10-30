import { createFileRoute } from '@tanstack/react-router'
import { FormularioSesion } from '@/features/sesiones-simulador/formulario-sesion'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/sesiones-simulador/nueva')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.sesionNueva, context.sesion.actual()),
  component: FormularioSesion,
})
