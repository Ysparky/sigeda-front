import { Alert, AlertDescription } from '@/components/ui/alert'
import { accionDisponible, type AccionConDependencia } from '@/lib/dependencias'
import { TEXTO_TEORIA_SOLO_MOCK } from '@/lib/dominio/teoria'

export function AvisoDeTeoria({ accion }: { accion: AccionConDependencia }) {
  if (accionDisponible(accion)) return null
  return (
    <Alert>
      <AlertDescription>{TEXTO_TEORIA_SOLO_MOCK}</AlertDescription>
    </Alert>
  )
}
