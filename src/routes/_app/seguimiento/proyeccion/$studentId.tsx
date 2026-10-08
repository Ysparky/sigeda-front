import { createFileRoute } from '@tanstack/react-router'
import { ProyeccionAlumnoPage } from '@/features/proyeccion/proyeccion-alumno-page'
import { exigirPantalla } from '@/lib/auth/guardas'
import { PANTALLAS } from '@/lib/auth/pantallas'

export const Route = createFileRoute('/_app/seguimiento/proyeccion/$studentId')({
  beforeLoad: ({ context }) => exigirPantalla(PANTALLAS.proyeccionAlumno, context.sesion.actual()),
  component: RutaProyeccionAlumno,
})

function RutaProyeccionAlumno() {
  const { studentId } = Route.useParams()
  return <ProyeccionAlumnoPage studentId={studentId} />
}
