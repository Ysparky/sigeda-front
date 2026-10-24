import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/errors'
import { sesion } from '@/lib/auth/sesion'
import { clavesMia, miMatriculaQuery, reenviarComprobante, type EstadoMatricula } from './api'
import { BarraPublica } from './barra-publica'
import { errorDeComprobante } from './schemas'

const ETIQUETA: Record<EstadoMatricula, { texto: string; variante: 'secondary' | 'default' | 'destructive' }> = {
  PENDIENTE: { texto: 'Pendiente de validación', variante: 'secondary' },
  VALIDADA: { texto: 'Validada', variante: 'default' },
  RECHAZADA: { texto: 'Rechazada', variante: 'destructive' },
}

export function MiMatriculaPage() {
  const { data, isPending, isError, error } = useQuery(miMatriculaQuery())
  const navegar = useNavigate()

  async function salir() {
    await sesion.cerrar()
    await navegar({ to: '/login', search: {} })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-muted/20">
      <BarraPublica
        accion={
          <Button variant="ghost" size="sm" onClick={() => void salir()}>
            Cerrar sesión
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Mi matrícula</h1>
        <p className="mb-6 text-sm text-muted-foreground">El estado de tu inscripción en el Aeroclub.</p>

        {isPending ? (
        <p className="text-sm text-muted-foreground">Cargando tu matrícula…</p>
      ) : isError ? (
        <Alert>
          <AlertTitle>No encontramos una matrícula</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError && error.status === 404
              ? 'Tu cuenta no tiene una matrícula registrada.'
              : 'No pudimos cargar tu matrícula. Intenta de nuevo más tarde.'}
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>
                {data.nombres} {data.aPaterno}
              </span>
              <Badge variant={ETIQUETA[data.estado].variante}>{ETIQUETA[data.estado].texto}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <dl className="grid gap-1">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">DNI</dt>
                <dd>{data.dni}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Correo</dt>
                <dd>{data.correo}</dd>
              </div>
            </dl>

            {data.estado === 'PENDIENTE' && (
              <p className="text-muted-foreground">
                El coordinador académico revisará tu comprobante. Te avisaremos cuando quede validada.
              </p>
            )}
            {data.estado === 'VALIDADA' && (
              <p className="text-muted-foreground">¡Tu matrícula fue validada! Ya eres alumno del curso.</p>
            )}
            {data.estado === 'RECHAZADA' && <ReenvioComprobante motivo={data.motivoRechazo} />}
          </CardContent>
        </Card>
        )}
      </main>
    </div>
  )
}

function ReenvioComprobante({ motivo }: { motivo: string | null }) {
  const queryClient = useQueryClient()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  const reenviar = useMutation({
    mutationFn: () => reenviarComprobante(archivo as File),
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesMia.mia() })
    },
  })

  return (
    <div className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm">
        <strong>Motivo del rechazo:</strong> {motivo ?? 'No especificado.'}
      </p>
      <Field data-invalid={Boolean(errorArchivo)}>
        <FieldLabel htmlFor="reenvio">Vuelve a subir tu comprobante (PDF, JPG o PNG, máx. 5 MB)</FieldLabel>
        <Input
          id="reenvio"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          aria-invalid={Boolean(errorArchivo)}
          onChange={(evento) => {
            const elegido = evento.target.files?.[0] ?? null
            setArchivo(elegido)
            setErrorArchivo(errorDeComprobante(elegido))
          }}
        />
        {errorArchivo && <FieldError>{errorArchivo}</FieldError>}
      </Field>
      <Button
        className="w-fit"
        disabled={reenviar.isPending}
        onClick={() => {
          const problema = errorDeComprobante(archivo)
          setErrorArchivo(problema)
          if (!problema) reenviar.mutate()
        }}
      >
        {reenviar.isPending ? 'Enviando…' : 'Reenviar comprobante'}
      </Button>
    </div>
  )
}
