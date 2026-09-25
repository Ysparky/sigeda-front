import { Alert, AlertDescription } from '@/components/ui/alert'
import { accionDisponible } from '@/lib/dependencias'
import { TEXTO_DOCUMENTOS_COMPARTIDOS } from '@/lib/dominio/aprendizaje'

export function AvisoDocumentosCompartidos() {
  if (accionDisponible('subirDocumento')) return null
  return (
    <Alert>
      <AlertDescription>{TEXTO_DOCUMENTOS_COMPARTIDOS}</AlertDescription>
    </Alert>
  )
}
