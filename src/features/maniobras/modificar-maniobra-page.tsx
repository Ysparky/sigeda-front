import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { consultasManiobras } from './api'
import { FormularioManiobra } from './components/formulario-maniobra'

export function ModificarManiobraPage({ id }: { id: number }) {
  const { data: maniobra } = useSuspenseQuery(consultasManiobras.detalle(id))
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/programa/maniobras/$id" params={{ id: String(maniobra.id) }}>
        Volver a la maniobra
      </Link>
    </Button>
  )

  if (!accionDisponible('modificarManiobra')) {
    return (
      <>
        <PageHeader titulo="Modificar maniobra" descripcion={maniobra.nombre} acciones={volver} />
        <Alert>
          <CircleAlert />
          <AlertTitle>No disponible</AlertTitle>
          <AlertDescription>{MENSAJE_DEPENDENCIA_PENDIENTE}</AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader titulo="Modificar maniobra" descripcion={maniobra.nombre} acciones={volver} />
      <FormularioManiobra maniobra={maniobra} />
    </>
  )
}
