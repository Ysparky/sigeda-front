import { Alert, AlertDescription } from '@/components/ui/alert'
import { accionDisponible, type AccionConDependencia } from '@/lib/dependencias'

export function AvisoDeDependencia({ accion, texto }: { accion: AccionConDependencia; texto: string }) {
  if (accionDisponible(accion)) return null
  return (
    <Alert>
      <AlertDescription>{texto}</AlertDescription>
    </Alert>
  )
}
