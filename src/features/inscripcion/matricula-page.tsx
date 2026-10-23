import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { Route } from '@/routes/matricula'
import { crearMatricula, cursoQuery, type DatosMatricula } from './api'
import { errorDeComprobante, esquemaMatricula, matriculaVacia, type ValoresMatricula } from './schemas'

export function MatriculaPage() {
  const { curso } = Route.useSearch()

  if (!curso) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Matrícula</h1>
        <p className="mt-2 text-muted-foreground">
          Elige un curso en el{' '}
          <Link to="/bienvenida" className="font-medium text-primary underline-offset-4 hover:underline">
            catálogo
          </Link>{' '}
          para inscribirte.
        </p>
      </main>
    )
  }

  return <FormularioMatricula idCurso={curso} />
}

function FormularioMatricula({ idCurso }: { idCurso: number }) {
  const detalle = useQuery(cursoQuery(idCurso))
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  const formulario = useForm<ValoresMatricula>({ resolver: zodResolver(esquemaMatricula), defaultValues: matriculaVacia })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresMatricula) => {
      const datos: DatosMatricula = {
        idCurso,
        dni: valores.dni,
        nombres: valores.nombres,
        aPaterno: valores.aPaterno,
        aMaterno: valores.aMaterno,
        correo: valores.correo,
        contacto: valores.contacto,
        idHorario: valores.idHorario === '' ? null : Number(valores.idHorario),
        password: valores.password,
      }
      return crearMatricula(datos, archivo as File)
    },
    onSuccess: () => setEnviado(true),
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function enviar(valores: ValoresMatricula) {
    const problema = errorDeComprobante(archivo)
    setErrorArchivo(problema)
    if (problema) return
    guardar.mutate(valores)
  }

  const errorDetalle = errorDePrimeraCarga(detalle)
  if (errorDetalle !== null)
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <AvisoDeError error={errorDetalle} alReintentar={() => void detalle.refetch()} />
      </main>
    )

  if (enviado) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>Matrícula enviada</h1>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>
              Tu matrícula quedó <strong>pendiente de validación</strong>. Creamos tu cuenta con el correo que
              indicaste.
            </p>
            <p>
              Inicia sesión para seguir su estado y, si hiciera falta, volver a subir tu comprobante.
            </p>
            <Button asChild className="w-fit">
              <Link to="/login" search={{}}>
                Iniciar sesión
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Inscripción{detalle.data ? ` — ${detalle.data.nombre}` : ''}
      </h1>
      <form noValidate onSubmit={formulario.handleSubmit(enviar)} className="mt-6 grid gap-6">
        {guardar.error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo enviar la matrícula</AlertTitle>
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Tus datos</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={Boolean(errors.dni)}>
                <FieldLabel htmlFor="m-dni">DNI</FieldLabel>
                <Input id="m-dni" aria-invalid={Boolean(errors.dni)} {...formulario.register('dni')} />
                {errors.dni && <FieldError>{errors.dni.message}</FieldError>}
              </Field>
              <Field data-invalid={Boolean(errors.nombres)}>
                <FieldLabel htmlFor="m-nombres">Nombres</FieldLabel>
                <Input id="m-nombres" aria-invalid={Boolean(errors.nombres)} {...formulario.register('nombres')} />
                {errors.nombres && <FieldError>{errors.nombres.message}</FieldError>}
              </Field>
              <Field data-invalid={Boolean(errors.aPaterno)}>
                <FieldLabel htmlFor="m-apaterno">Apellido paterno</FieldLabel>
                <Input id="m-apaterno" aria-invalid={Boolean(errors.aPaterno)} {...formulario.register('aPaterno')} />
                {errors.aPaterno && <FieldError>{errors.aPaterno.message}</FieldError>}
              </Field>
              <Field data-invalid={Boolean(errors.aMaterno)}>
                <FieldLabel htmlFor="m-amaterno">Apellido materno</FieldLabel>
                <Input id="m-amaterno" aria-invalid={Boolean(errors.aMaterno)} {...formulario.register('aMaterno')} />
                {errors.aMaterno && <FieldError>{errors.aMaterno.message}</FieldError>}
              </Field>
              <Field data-invalid={Boolean(errors.correo)}>
                <FieldLabel htmlFor="m-correo">Correo</FieldLabel>
                <Input id="m-correo" type="email" aria-invalid={Boolean(errors.correo)} {...formulario.register('correo')} />
                <FieldDescription>Con este correo iniciarás sesión.</FieldDescription>
                {errors.correo && <FieldError>{errors.correo.message}</FieldError>}
              </Field>
              <Field data-invalid={Boolean(errors.contacto)}>
                <FieldLabel htmlFor="m-contacto">Teléfono de contacto</FieldLabel>
                <Input id="m-contacto" aria-invalid={Boolean(errors.contacto)} {...formulario.register('contacto')} />
                {errors.contacto && <FieldError>{errors.contacto.message}</FieldError>}
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="m-password">Contraseña</FieldLabel>
                <Input id="m-password" type="password" aria-invalid={Boolean(errors.password)} {...formulario.register('password')} />
                {errors.password && <FieldError>{errors.password.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="m-horario">Preferencia de horario</FieldLabel>
                <NativeSelect id="m-horario" {...formulario.register('idHorario')}>
                  <NativeSelectOption value="">Sin preferencia</NativeSelectOption>
                  {detalle.data?.horarios.map((horario) => (
                    <NativeSelectOption key={horario.id} value={String(horario.id)}>
                      {horario.nombre} — {horario.detalle}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Comprobante de pago</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Field data-invalid={Boolean(errorArchivo)}>
              <FieldLabel htmlFor="m-comprobante">Archivo (PDF, JPG o PNG, máx. 5 MB)</FieldLabel>
              <Input
                id="m-comprobante"
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
          </CardContent>
        </Card>
        <Button type="submit" disabled={guardar.isPending} className="w-fit">
          {guardar.isPending ? 'Enviando…' : 'Enviar matrícula'}
        </Button>
      </form>
    </main>
  )
}
