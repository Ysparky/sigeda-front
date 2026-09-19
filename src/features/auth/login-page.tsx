import { zodResolver } from '@hookform/resolvers/zod'
import { Plane } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { sesion } from '@/lib/auth/sesion'

const esquema = z.object({
  username: z.string().trim().min(1, 'Ingrese su usuario.'),
  password: z.string().min(1, 'Ingrese su contraseña.'),
})

type Credenciales = z.infer<typeof esquema>

export function LoginPage() {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const formulario = useForm<Credenciales>({
    resolver: zodResolver(esquema),
    defaultValues: { username: '', password: '' },
  })
  const { errors, isSubmitting } = formulario.formState

  async function ingresar(datos: Credenciales) {
    setErrorGeneral(null)
    try {
      await sesion.iniciar(datos.username, datos.password)
    } catch (error) {
      setErrorGeneral(error instanceof ApiError ? error.message : MENSAJE_GENERICO)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-6" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
          <CardDescription>SIGEDA · Aeroclub Sudamericano de los Andes</CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={formulario.handleSubmit(ingresar)}>
            <FieldGroup>
              {errorGeneral && (
                <Alert variant="destructive">
                  <AlertDescription>{errorGeneral}</AlertDescription>
                </Alert>
              )}
              <Field data-invalid={Boolean(errors.username)}>
                <FieldLabel htmlFor="username">Usuario</FieldLabel>
                <Input
                  id="username"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.username)}
                  {...formulario.register('username')}
                />
                <FieldError errors={[errors.username]} />
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  {...formulario.register('password')}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
