import { createFileRoute } from '@tanstack/react-router'
import { ProyeccionPage } from '@/features/proyeccion/proyeccion-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/seguimiento/proyeccion/')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.proyeccion, context.sesion.actual()),
  component: ProyeccionPage,
})
