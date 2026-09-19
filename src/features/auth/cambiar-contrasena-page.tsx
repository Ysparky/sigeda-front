import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { useSesion } from '@/lib/auth/use-sesion'

const esquema = z
  .object({
    nueva: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmacion: z.string().min(1, 'Repita la contraseña nueva.'),
  })
  .refine((datos) => datos.nueva === datos.confirmacion, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmacion'],
  })

type Formulario = z.infer<typeof esquema>
type RespuestaGuardado = { mensaje: string }

export function CambiarContrasenaPage() {
  const actual = useSesion()
  const formulario = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nueva: '', confirmacion: '' },
  })
  const { errors } = formulario.formState

  const cambio = useMutation({
    mutationFn: (datos: Formulario) => {
      if (!actual) throw new ApiError(401, MENSAJE_GENERICO)
      return sigeda.put<RespuestaGuardado>(`/api/usuarios/${actual.usuario.id}`, {
        username: actual.usuario.username,
        password: datos.nueva,
      })
    },
    onSuccess: (respuesta) => {
      toast.success(respuesta.mensaje)
      formulario.reset()
    },
  })

  return (
    <>
      <PageHeader titulo="Cambiar contraseña" descripcion="Actualice la contraseña con la que ingresa a SIGEDA." />
      <Card className="max-w-md">
        <CardContent>
          <form noValidate onSubmit={formulario.handleSubmit((datos) => cambio.mutate(datos))}>
            <FieldGroup>
              {cambio.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {cambio.error instanceof ApiError ? cambio.error.message : MENSAJE_GENERICO}
                  </AlertDescription>
                </Alert>
              )}
              <Field data-invalid={Boolean(errors.nueva)}>
                <FieldLabel htmlFor="nueva">Contraseña nueva</FieldLabel>
                <Input
                  id="nueva"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.nueva)}
                  {...formulario.register('nueva')}
                />
                <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
                <FieldError errors={[errors.nueva]} />
              </Field>
              <Field data-invalid={Boolean(errors.confirmacion)}>
                <FieldLabel htmlFor="confirmacion">Repetir contraseña nueva</FieldLabel>
                <Input
                  id="confirmacion"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmacion)}
                  {...formulario.register('confirmacion')}
                />
                <FieldError errors={[errors.confirmacion]} />
              </Field>
              <Button type="submit" disabled={cambio.isPending}>
                {cambio.isPending ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
