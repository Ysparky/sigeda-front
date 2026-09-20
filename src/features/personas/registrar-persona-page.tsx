import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { FormularioPersona } from './components/formulario-persona'

export function RegistrarPersonaPage() {
  const volver = (
    <Button variant="outline" asChild>
      <Link to="/personas">Volver a personas</Link>
    </Button>
  )

  if (!accionDisponible('registrarPersona')) {
    return (
      <>
        <PageHeader titulo="Registrar persona" acciones={volver} />
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
      <PageHeader
        titulo="Registrar persona"
        descripcion="Registre una persona y la cuenta con la que ingresa."
        acciones={volver}
      />
      <FormularioPersona />
    </>
  )
}
