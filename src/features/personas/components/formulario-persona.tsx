import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasCuentas } from '@/features/cuentas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { rolesCompatibles, rolPorDefecto, SIN_TIPO, TIPOS_PERSONA } from '@/lib/dominio/personas'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import type { Rol } from '@/features/cuentas/api'
import { clavesPersonas, crearPersona } from '../api'
import { aCuerpoPersonaNueva, esquemaPersonaNueva, personaNuevaVacia, type ValoresPersonaNueva } from '../schemas'

export function FormularioPersona() {
  const roles = useQuery(consultasCuentas.roles())
  const errorDeRoles = errorDePrimeraCarga(roles)

  if (errorDeRoles !== null) return <AvisoDeError error={errorDeRoles} alReintentar={() => void roles.refetch()} />
  if (!roles.isSuccess) return <p className="text-sm text-muted-foreground">Cargando los roles…</p>
  return <FormularioConRoles roles={roles.data} />
}

function FormularioConRoles({ roles }: { roles: Rol[] }) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales = personaNuevaVacia(roles.find((rol) => rol.nombre === 'Alumno')?.id)
  const formulario = useForm<ValoresPersonaNueva>({
    resolver: zodResolver(esquemaPersonaNueva),
    defaultValues: iniciales,
  })
  const { errors } = formulario.formState
  const tipo = useWatch({ control: formulario.control, name: 'tipo' })
  const compatibles = roles.filter((rol) => rolesCompatibles(tipo === '' ? null : tipo).includes(rol.nombre))

  const guardar = useMutation({
    mutationFn: (valores: ValoresPersonaNueva) => crearPersona(aCuerpoPersonaNueva(valores)),
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      formulario.reset(iniciales)
      await queryClient.invalidateQueries({ queryKey: clavesPersonas.todo })
      await navegar({ to: '/personas/$cod', params: { cod: resultado.codigo } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function cambiarTipo(valor: string) {
    formulario.setValue('tipo', valor, { shouldValidate: formulario.formState.isSubmitted })
    const permitidos = rolesCompatibles(valor === '' ? null : valor)
    const propuesto = roles.find((rol) => rol.nombre === rolPorDefecto(valor === '' ? null : valor))
    const actual = roles.find((rol) => String(rol.id) === formulario.getValues('usuario.idRol'))
    if (actual && permitidos.includes(actual.nombre)) return
    formulario.setValue('usuario.idRol', propuesto ? String(propuesto.id) : '')
  }

  return (
    <form
      noValidate
      onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))}
      className="grid gap-6"
    >
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo registrar la persona</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos de la persona</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.codigo)}>
              <FieldLabel htmlFor="persona-codigo">Código</FieldLabel>
              <Input id="persona-codigo" aria-invalid={Boolean(errors.codigo)} {...formulario.register('codigo')} />
              <FieldDescription>6 caracteres alfanuméricos.</FieldDescription>
              <FieldError errors={[errors.codigo]} />
            </Field>
            <Field data-invalid={Boolean(errors.dni)}>
              <FieldLabel htmlFor="persona-dni">DNI</FieldLabel>
              <Input id="persona-dni" inputMode="numeric" aria-invalid={Boolean(errors.dni)} {...formulario.register('dni')} />
              <FieldError errors={[errors.dni]} />
            </Field>
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="persona-nombre">Nombre</FieldLabel>
              <Input id="persona-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.aPaterno)}>
              <FieldLabel htmlFor="persona-apaterno">Apellido paterno</FieldLabel>
              <Input id="persona-apaterno" aria-invalid={Boolean(errors.aPaterno)} {...formulario.register('aPaterno')} />
              <FieldError errors={[errors.aPaterno]} />
            </Field>
            <Field data-invalid={Boolean(errors.aMaterno)}>
              <FieldLabel htmlFor="persona-amaterno">Apellido materno</FieldLabel>
              <Input id="persona-amaterno" aria-invalid={Boolean(errors.aMaterno)} {...formulario.register('aMaterno')} />
              <FieldError errors={[errors.aMaterno]} />
            </Field>
            <Field data-invalid={Boolean(errors.rango)}>
              <FieldLabel htmlFor="persona-rango">Rango</FieldLabel>
              <Input id="persona-rango" aria-invalid={Boolean(errors.rango)} {...formulario.register('rango')} />
              <FieldError errors={[errors.rango]} />
            </Field>
            <Field data-invalid={Boolean(errors.tipo)}>
              <FieldLabel htmlFor="persona-tipo">Tipo</FieldLabel>
              <Controller
                control={formulario.control}
                name="tipo"
                render={({ field }) => (
                  <NativeSelect
                    id="persona-tipo"
                    className="w-full"
                    aria-invalid={Boolean(errors.tipo)}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => cambiarTipo(evento.target.value)}
                  >
                    {TIPOS_PERSONA.map((opcion) => (
                      <NativeSelectOption key={opcion} value={opcion}>
                        {opcion}
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value="">{SIN_TIPO}</NativeSelectOption>
                  </NativeSelect>
                )}
              />
              <FieldDescription>El tipo define los roles que puede tener la cuenta.</FieldDescription>
              <FieldError errors={[errors.tipo]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Cuenta</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.usuario?.username)}>
              <FieldLabel htmlFor="persona-usuario">Usuario</FieldLabel>
              <Input
                id="persona-usuario"
                aria-invalid={Boolean(errors.usuario?.username)}
                {...formulario.register('usuario.username')}
              />
              <FieldDescription>De 4 a 30 caracteres: minúsculas, dígitos, punto o guion bajo.</FieldDescription>
              <FieldError errors={[errors.usuario?.username]} />
            </Field>
            <Field data-invalid={Boolean(errors.usuario?.correo)}>
              <FieldLabel htmlFor="persona-correo">Correo</FieldLabel>
              <Input
                id="persona-correo"
                type="email"
                aria-invalid={Boolean(errors.usuario?.correo)}
                {...formulario.register('usuario.correo')}
              />
              <FieldError errors={[errors.usuario?.correo]} />
            </Field>
            <Field data-invalid={Boolean(errors.usuario?.password)}>
              <FieldLabel htmlFor="persona-password">Contraseña</FieldLabel>
              <Input
                id="persona-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.usuario?.password)}
                {...formulario.register('usuario.password')}
              />
              <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
              <FieldError errors={[errors.usuario?.password]} />
            </Field>
            <Field data-invalid={Boolean(errors.usuario?.confirmacion)}>
              <FieldLabel htmlFor="persona-confirmacion">Repetir contraseña</FieldLabel>
              <Input
                id="persona-confirmacion"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.usuario?.confirmacion)}
                {...formulario.register('usuario.confirmacion')}
              />
              <FieldError errors={[errors.usuario?.confirmacion]} />
            </Field>
            <Field data-invalid={Boolean(errors.usuario?.idRol)}>
              <FieldLabel htmlFor="persona-rol">Rol</FieldLabel>
              <Controller
                control={formulario.control}
                name="usuario.idRol"
                render={({ field }) => (
                  <NativeSelect
                    id="persona-rol"
                    className="w-full"
                    aria-invalid={Boolean(errors.usuario?.idRol)}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => field.onChange(evento.target.value)}
                  >
                    <NativeSelectOption value="">Elija un rol</NativeSelectOption>
                    {compatibles.map((rol) => (
                      <NativeSelectOption key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              <FieldError errors={[errors.usuario?.idRol]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          <Link to="/personas">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar persona'}
        </Button>
      </div>
    </form>
  )
}
