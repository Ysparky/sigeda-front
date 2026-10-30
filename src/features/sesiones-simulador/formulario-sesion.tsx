import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { escenariosQuery, type Escenario } from '@/features/escenarios/api'
import { simuladoresQuery, type Simulador } from '@/features/simuladores/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesSesiones, planificarSesion } from './api'
import { aCuerpoSesion, esquemaSesion, type ValoresSesion } from './schemas'

export function FormularioSesion() {
  const simuladores = useQuery(simuladoresQuery())
  const escenarios = useQuery(escenariosQuery())
  const error = errorDePrimeraCarga(simuladores, escenarios)

  if (error !== null)
    return (
      <AvisoDeError
        error={error}
        alReintentar={() => {
          void simuladores.refetch()
          void escenarios.refetch()
        }}
      />
    )
  if (!simuladores.data || !escenarios.data)
    return <p className="text-sm text-muted-foreground">Cargando…</p>

  return <FormularioInterno simuladores={simuladores.data} escenarios={escenarios.data} />
}

function FormularioInterno({ simuladores, escenarios }: { simuladores: Simulador[]; escenarios: Escenario[] }) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const formulario = useForm<ValoresSesion>({
    resolver: zodResolver(esquemaSesion),
    defaultValues: {
      idSimulador: String(simuladores[0]?.id ?? ''),
      idEscenario: String(escenarios[0]?.id ?? ''),
      codAlumno: '',
      codInstructor: '',
      fechaPlanificada: '',
    },
  })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresSesion) => planificarSesion(aCuerpoSesion(valores)),
    onSuccess: async (respuesta) => {
      toast.success('Sesión planificada.')
      await queryClient.invalidateQueries({ queryKey: clavesSesiones.todo })
      await navegar({ to: '/sesiones-simulador/$id', params: { id: String(respuesta.sesion.id) } })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo planificar la sesión.'),
  })

  return (
    <div className="grid gap-6">
      <PageHeader titulo="Planificar sesión" descripcion="Programe una sesión de simulador para un alumno." />
      <form noValidate onSubmit={formulario.handleSubmit((v) => guardar.mutate(v))} className="grid gap-6">
        {guardar.error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo planificar la sesión</AlertTitle>
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardContent className="grid gap-4">
            <Field data-invalid={Boolean(errors.idSimulador)}>
              <FieldLabel htmlFor="ses-simulador">Simulador</FieldLabel>
              <NativeSelect id="ses-simulador" {...formulario.register('idSimulador')}>
                {simuladores.map((s) => (
                  <NativeSelectOption key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.idSimulador]} />
            </Field>
            <Field data-invalid={Boolean(errors.idEscenario)}>
              <FieldLabel htmlFor="ses-escenario">Escenario</FieldLabel>
              <NativeSelect id="ses-escenario" {...formulario.register('idEscenario')}>
                {escenarios.map((e) => (
                  <NativeSelectOption key={e.id} value={String(e.id)}>
                    {e.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.idEscenario]} />
            </Field>
            <Field data-invalid={Boolean(errors.codAlumno)}>
              <FieldLabel htmlFor="ses-alumno">Código del alumno</FieldLabel>
              <Input id="ses-alumno" aria-invalid={Boolean(errors.codAlumno)} {...formulario.register('codAlumno')} />
              <FieldError errors={[errors.codAlumno]} />
            </Field>
            <Field data-invalid={Boolean(errors.codInstructor)}>
              <FieldLabel htmlFor="ses-instructor">Código del instructor</FieldLabel>
              <Input
                id="ses-instructor"
                aria-invalid={Boolean(errors.codInstructor)}
                {...formulario.register('codInstructor')}
              />
              <FieldError errors={[errors.codInstructor]} />
            </Field>
            <Field data-invalid={Boolean(errors.fechaPlanificada)}>
              <FieldLabel htmlFor="ses-fecha">Fecha planificada</FieldLabel>
              <Input
                id="ses-fecha"
                type="date"
                aria-invalid={Boolean(errors.fechaPlanificada)}
                {...formulario.register('fechaPlanificada')}
              />
              <FieldError errors={[errors.fechaPlanificada]} />
            </Field>
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link to="/sesiones-simulador">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? 'Planificando…' : 'Planificar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
