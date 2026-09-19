import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'

type Props = { titulo?: string; error: unknown; alReintentar?: () => void }

export function AvisoDeError({ titulo, error, alReintentar }: Props) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      {titulo && <AlertTitle>{titulo}</AlertTitle>}
      <AlertDescription>
        <p>{error instanceof ApiError ? error.message : MENSAJE_GENERICO}</p>
        {alReintentar && (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={alReintentar}>
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
