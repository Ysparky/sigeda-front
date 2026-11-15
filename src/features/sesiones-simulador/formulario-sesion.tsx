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
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { agruparPorGrupo, consultasCatalogos, fuenteDeAlumnos, type OpcionAlumno, type PersonaResumida } from '@/features/catalogos/api'
import { hoyIso } from '@/lib/dominio/calendario'
import { useSesion } from '@/lib/auth/use-sesion'
import { escenariosQuery, type Escenario } from '@/features/escenarios/api'
import { simuladoresQuery, type Simulador } from '@/features/simuladores/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesSesiones, planificarSesion } from './api'
import { aCuerpoSesion, esquemaSesion, type ValoresSesion } from './schemas'

export function FormularioSesion() {
  const sesion = useSesion()
  const fuente = sesion ? fuenteDeAlumnos(sesion.permisos) : null
  const simuladores = useQuery(simuladoresQuery())
  const escenarios = useQuery(escenariosQuery())
  const instructores = useQuery(consultasCatalogos.instructores('PDI'))
  const alumnos = useQuery({ ...consultasCatalogos.alumnos(fuente ?? 'programacion', 'PDI', sesion?.codPersona ?? null), enabled: fuente !== null })
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
  if (!simuladores.data || !escenarios.data || instructores.isPending || (fuente !== null && alumnos.isPending))
    return <p className="text-sm text-muted-foreground">Cargando…</p>

  return (
    <FormularioInterno
      simuladores={simuladores.data}
      escenarios={escenarios.data}
      alumnos={alumnos.data ?? null}
      instructores={instructores.data ?? null}
      codUsuario={sesion?.codPersona ?? null}
    />
  )
}

function FormularioInterno({
  simuladores,
  escenarios,
  alumnos,
  instructores,
  codUsuario,
}: {
  simuladores: Simulador[]
  escenarios: Escenario[]
  alumnos: OpcionAlumno[] | null
  instructores: PersonaResumida[] | null
  codUsuario: string | null
}) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const formulario = useForm<ValoresSesion>({
    resolver: zodResolver(esquemaSesion),
    defaultValues: {
      idSimulador: String(simuladores[0]?.id ?? ''),
      idEscenario: String(escenarios[0]?.id ?? ''),
      codAlumno: '',
      codInstructor: instructores?.some((i) => i.codigo === codUsuario) ? (codUsuario ?? '') : '',
      fechaPlanificada: hoyIso(),
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
              <FieldLabel htmlFor="ses-alumno">Alumno</FieldLabel>
              {alumnos ? (
                <NativeSelect id="ses-alumno" aria-invalid={Boolean(errors.codAlumno)} {...formulario.register('codAlumno')}>
                  <NativeSelectOption value="">Elija un alumno</NativeSelectOption>
                  {agruparPorGrupo(alumnos).map(([grupo, lista]) => (
                    <NativeSelectOptGroup key={grupo} label={grupo}>
                      {lista.map((a) => (
                        <NativeSelectOption key={a.codigo} value={a.codigo}>
                          {a.nombreCompleto} ({a.codigo})
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  ))}
                </NativeSelect>
              ) : (
                <Input id="ses-alumno" placeholder="Código del alumno" aria-invalid={Boolean(errors.codAlumno)} {...formulario.register('codAlumno')} />
              )}
              <FieldError errors={[errors.codAlumno]} />
            </Field>
            <Field data-invalid={Boolean(errors.codInstructor)}>
              <FieldLabel htmlFor="ses-instructor">Instructor</FieldLabel>
              {instructores ? (
                <NativeSelect id="ses-instructor" aria-invalid={Boolean(errors.codInstructor)} {...formulario.register('codInstructor')}>
                  <NativeSelectOption value="">Elija un instructor</NativeSelectOption>
                  {instructores.map((i) => (
                    <NativeSelectOption key={i.codigo} value={i.codigo}>
                      {i.nombreCompleto}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Input id="ses-instructor" placeholder="Código del instructor" aria-invalid={Boolean(errors.codInstructor)} {...formulario.register('codInstructor')} />
              )}
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
