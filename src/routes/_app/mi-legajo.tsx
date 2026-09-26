import { createFileRoute, redirect } from '@tanstack/react-router'
import { exigirPantalla, SinPermisoError } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/mi-legajo')({
  beforeLoad: ({ context }) => {
    exigirPantalla(PANTALLAS.miLegajo, context.sesion.actual())
    const codPersona = context.sesion.actual()?.codPersona
    if (!codPersona) throw new SinPermisoError()
    throw redirect({ to: '/seguimiento/$alumno', params: { alumno: codPersona } })
  },
})
