import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { CircleAlert, ShieldAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { SinPermisoError } from '@/lib/auth/guardas'

function BotonReintentar() {
  const router = useRouter()
  return (
    <Button variant="outline" size="sm" className="mt-3" onClick={() => void router.invalidate()}>
      Reintentar
    </Button>
  )
}

export function ErrorDeRuta({ error }: ErrorComponentProps) {
  if (error instanceof SinPermisoError) {
    return (
      <Alert className="max-w-xl">
        <ShieldAlert />
        <AlertTitle>Acceso restringido</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive" className="max-w-xl">
      <CircleAlert />
      <AlertTitle>No se pudo cargar la página</AlertTitle>
      <AlertDescription>
        <p>{error instanceof ApiError ? error.message : MENSAJE_GENERICO}</p>
        <BotonReintentar />
      </AlertDescription>
    </Alert>
  )
}

export function NoEncontrado() {
  return (
    <main className="grid min-h-[50svh] place-items-center p-6">
      <Alert className="max-w-xl">
        <CircleAlert />
        <AlertTitle>Página no encontrada</AlertTitle>
        <AlertDescription>
          <p>La dirección no existe o fue movida.</p>
          <Link to="/" className="mt-3 inline-block underline underline-offset-4">
            Volver al inicio
          </Link>
        </AlertDescription>
      </Alert>
    </main>
  )
}
