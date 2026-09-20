import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { restablecerContrasena } from '@/features/cuentas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import type { CuentaDePersona } from '../api'

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

const RENOMBRAR = { password: 'nueva' }

const INICIALES: Formulario = { nueva: '', confirmacion: '' }

export function DialogoRestablecerContrasena({ cuenta }: { cuenta: CuentaDePersona }) {
  const [abierto, setAbierto] = useState(false)
  const formulario = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: INICIALES })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (datos: Formulario) => restablecerContrasena(cuenta.id, cuenta.username, datos.nueva),
    onSuccess: (mensaje) => {
      setAbierto(false)
      formulario.reset()
      toast.success(mensaje)
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError, RENOMBRAR)
    },
  })

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente)
    if (siguiente) formulario.reset(INICIALES)
  }

  return (
    <Dialog open={abierto} onOpenChange={alAbrir}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound aria-hidden />
          Restablecer contraseña
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>Se conserva el usuario «{cuenta.username}».</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={formulario.handleSubmit((datos) => guardar.mutate(datos))}>
          <FieldGroup>
            {guardar.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.nueva)}>
              <FieldLabel htmlFor="cuenta-nueva">Contraseña nueva</FieldLabel>
              <Input
                id="cuenta-nueva"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.nueva)}
                {...formulario.register('nueva')}
              />
              <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
              <FieldError errors={[errors.nueva]} />
            </Field>
            <Field data-invalid={Boolean(errors.confirmacion)}>
              <FieldLabel htmlFor="cuenta-confirmacion">Repetir contraseña nueva</FieldLabel>
              <Input
                id="cuenta-confirmacion"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmacion)}
                {...formulario.register('confirmacion')}
              />
              <FieldError errors={[errors.confirmacion]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
