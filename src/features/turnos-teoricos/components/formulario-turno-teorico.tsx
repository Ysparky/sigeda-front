import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, Shuffle, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { PROGRAMAS } from '@/features/catalogos/api'
import { consultasMaterias } from '@/features/materias/api'
import { consultasPreguntas } from '@/features/preguntas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { accionDisponible } from '@/lib/dependencias'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import {
  CANTIDAD_AUTOGENERADA_POR_DEFECTO,
  distribuirPuntaje,
  elegirAlAzar,
  exigeTurnoOrigen,
  PUNTAJE_TOTAL_EXAMEN,
  TEXTO_MATERIA_SIN_PREGUNTAS,
  TEXTO_SUBSANACION_TARDIA,
  textoPuntajeAsignado,
  TIPOS_EXAMEN,
} from '@/lib/dominio/teoria'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesTurnosTeoricos, consultasTurnosTeoricos, crearTurnoTeorico, modificarTurnoTeorico } from '../api'
import { aCuerpoTurnoTeorico, crearEsquemaTurnoTeorico, puntajeAsignado, type ValoresTurnoTeorico } from '../schemas'

type Props = { valoresIniciales: ValoresTurnoTeorico; idTurno?: number }

export function FormularioTurnoTeorico({ valoresIniciales, idTurno }: Props) {
  const modificando = idTurno !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [erroresGenerales, setErroresGenerales] = useState<string[]>([])
  const [materiaPendiente, setMateriaPendiente] = useState<string | null>(null)
  const [cantidadAutogenerar, setCantidadAutogenerar] = useState(CANTIDAD_AUTOGENERADA_POR_DEFECTO)
  const esquema = useMemo(() => crearEsquemaTurnoTeorico(new Date()), [])
  const formulario = useForm<ValoresTurnoTeorico>({ resolver: zodResolver(esquema), defaultValues: valoresIniciales })
  const { errors } = formulario.formState
  const preguntas = useFieldArray({ control: formulario.control, name: 'preguntas' })
  const valores = useWatch({ control: formulario.control }) as ValoresTurnoTeorico

  const materias = useQuery(consultasMaterias.lista())
  const grupos = useQuery(consultasTurnosTeoricos.grupos(valores.programa))
  const banco = useQuery(consultasPreguntas.porMateria(Number(valores.idMateria) || 0))
  const origenes = useQuery(
    consultasTurnosTeoricos.finalizados(Number(valores.idMateria) || 0, Number(valores.idGrupo) || 0),
  )

  const guardar = useMutation({
    mutationFn: (siguientes: ValoresTurnoTeorico) => {
      const cuerpo = aCuerpoTurnoTeorico(siguientes)
      return modificando ? modificarTurnoTeorico(idTurno, cuerpo) : crearTurnoTeorico(cuerpo)
    },
    onSuccess: async (resultado) => {
      toast.success(resultado.mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesTurnosTeoricos.todo })
      await navegar({ to: '/teoria/turnos/$id', params: { id: String(resultado.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const huerfanos = aplicarErroresDeCampo(error, formulario.setError, {}, [], formulario.getValues)
        setErroresGenerales(huerfanos.length > 0 ? huerfanos : [error.message])
      } else {
        setErroresGenerales([MENSAJE_GENERICO])
      }
    },
  })

  const puedeProgramar = accionDisponible('programarTurnoTeorico')
  const puntaje = puntajeAsignado(valores)
  const sumaCorrecta = puntaje === PUNTAJE_TOTAL_EXAMEN
  const conOrigen = exigeTurnoOrigen(valores.tipoExamen)
  const origenElegido = origenes.data?.find((turno) => String(turno.id) === valores.idTurnoOrigen)
  const subsanacionTardia =
    valores.tipoExamen === 'SUBSANACION' &&
    origenElegido !== undefined &&
    valores.fechaExamen > sumarDias(origenElegido.fechaExamen, 1)
  const materiaSinPreguntas = valores.idMateria !== '' && banco.data?.length === 0
  // No se pueden repartir 20 puntos enteros ≥ 1 entre más de 20 preguntas, ni elegir más de las que
  // tiene el banco: ese es el techo del autogenerado.
  const maximoAutogenerable = Math.min(banco.data?.length ?? 0, PUNTAJE_TOTAL_EXAMEN)
  // Sólo al crear: reemplazar al azar las preguntas de un examen ya armado sería una sorpresa, no una
  // ayuda. Al modificar se siguen agregando a mano.
  const puedeAutogenerar = !modificando && valores.idMateria !== '' && maximoAutogenerable > 0

  function autogenerarPreguntas() {
    const disponibles = banco.data ?? []
    const cantidad = Math.min(Math.max(1, cantidadAutogenerar), maximoAutogenerable)
    const elegidas = elegirAlAzar(disponibles, cantidad)
    const puntajes = distribuirPuntaje(elegidas.length)
    preguntas.replace(
      elegidas.map((pregunta, indice) => ({
        idPregunta: String(pregunta.id),
        puntajeMaximo: String(puntajes[indice]),
      })),
    )
  }

  function confirmarMateria() {
    if (materiaPendiente === null) return
    formulario.setValue('idMateria', materiaPendiente, { shouldValidate: true })
    formulario.setValue('idTurnoOrigen', '')
    preguntas.replace([])
    setMateriaPendiente(null)
  }

  return (
    <form
      noValidate
      onSubmit={formulario.handleSubmit((siguientes) => {
        setErroresGenerales([])
        guardar.mutate(siguientes)
      })}
      className="grid gap-6"
    >
      {erroresGenerales.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el turno teórico</AlertTitle>
          <AlertDescription className="grid gap-1">
            {erroresGenerales.map((mensaje) => (
              <span key={mensaje}>{mensaje}</span>
            ))}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del examen</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.programa)}>
              <FieldLabel htmlFor="turno-teorico-programa">Programa</FieldLabel>
              <Controller
                control={formulario.control}
                name="programa"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-teorico-programa"
                    className="w-full"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      if (evento.target.value === field.value) return
                      field.onChange(evento.target.value)
                      formulario.setValue('idGrupo', '')
                      formulario.setValue('idTurnoOrigen', '')
                    }}
                  >
                    {PROGRAMAS.map((programa) => (
                      <NativeSelectOption key={programa} value={programa}>
                        {programa}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              <FieldDescription>Se elige primero: limita los grupos ofrecidos.</FieldDescription>
              <FieldError errors={[errors.programa]} />
            </Field>
            <Field data-invalid={Boolean(errors.idGrupo)}>
              <FieldLabel htmlFor="turno-teorico-grupo">Grupo</FieldLabel>
              <NativeSelect
                id="turno-teorico-grupo"
                className="w-full"
                aria-invalid={Boolean(errors.idGrupo)}
                {...formulario.register('idGrupo')}
              >
                <NativeSelectOption value="">Elija un grupo</NativeSelectOption>
                {(grupos.data ?? []).map((grupo) => (
                  <NativeSelectOption key={grupo.id} value={grupo.id}>
                    {grupo.nombre} · {grupo.cantAlumnos} {grupo.cantAlumnos === 1 ? 'alumno' : 'alumnos'}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errorDePrimeraCarga(grupos) !== null && <FieldError>No se pudieron cargar los grupos.</FieldError>}
              <FieldError errors={[errors.idGrupo]} />
            </Field>
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="turno-teorico-nombre">Nombre</FieldLabel>
              <Input
                id="turno-teorico-nombre"
                aria-invalid={Boolean(errors.nombre)}
                {...formulario.register('nombre')}
              />
              <FieldDescription>De 10 a 60 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.idMateria)}>
              <FieldLabel htmlFor="turno-teorico-materia">Materia</FieldLabel>
              <Controller
                control={formulario.control}
                name="idMateria"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-teorico-materia"
                    className="w-full"
                    aria-invalid={Boolean(errors.idMateria)}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      if (evento.target.value === field.value) return
                      if (preguntas.fields.length > 0) setMateriaPendiente(evento.target.value)
                      else {
                        field.onChange(evento.target.value)
                        formulario.setValue('idTurnoOrigen', '')
                      }
                    }}
                  >
                    <NativeSelectOption value="">Elija una materia</NativeSelectOption>
                    {(materias.data ?? []).map((materia) => (
                      <NativeSelectOption key={materia.id} value={materia.id}>
                        {materia.nombre}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              {errorDePrimeraCarga(materias) !== null && <FieldError>No se pudieron cargar las materias.</FieldError>}
              <FieldError errors={[errors.idMateria]} />
            </Field>
            <Field data-invalid={Boolean(errors.tipoExamen)}>
              <FieldLabel htmlFor="turno-teorico-tipo">Tipo de examen</FieldLabel>
              <Controller
                control={formulario.control}
                name="tipoExamen"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-teorico-tipo"
                    className="w-full"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      field.onChange(evento.target.value)
                      if (!exigeTurnoOrigen(evento.target.value)) formulario.setValue('idTurnoOrigen', '')
                    }}
                  >
                    {TIPOS_EXAMEN.map((tipo) => (
                      <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                        {tipo.etiqueta}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              <FieldError errors={[errors.tipoExamen]} />
            </Field>
            <Field data-invalid={Boolean(errors.fechaExamen)}>
              <FieldLabel htmlFor="turno-teorico-fecha">Fecha del examen</FieldLabel>
              <Input
                id="turno-teorico-fecha"
                type="date"
                min={hoyIso()}
                aria-invalid={Boolean(errors.fechaExamen)}
                {...formulario.register('fechaExamen')}
              />
              <FieldError errors={[errors.fechaExamen]} />
            </Field>
            <Field data-invalid={Boolean(errors.horaInicio)}>
              <FieldLabel htmlFor="turno-teorico-inicio">Hora de inicio</FieldLabel>
              <Input
                id="turno-teorico-inicio"
                type="time"
                aria-invalid={Boolean(errors.horaInicio)}
                {...formulario.register('horaInicio')}
              />
              <FieldError errors={[errors.horaInicio]} />
            </Field>
            <Field data-invalid={Boolean(errors.horaFin)}>
              <FieldLabel htmlFor="turno-teorico-fin">Hora de fin</FieldLabel>
              <Input
                id="turno-teorico-fin"
                type="time"
                aria-invalid={Boolean(errors.horaFin)}
                {...formulario.register('horaFin')}
              />
              <FieldDescription>La ventana debe durar al menos 10 minutos.</FieldDescription>
              <FieldError errors={[errors.horaFin]} />
            </Field>
            {conOrigen && (
              <Field data-invalid={Boolean(errors.idTurnoOrigen)}>
                <FieldLabel htmlFor="turno-teorico-origen">Turno de origen</FieldLabel>
                <NativeSelect
                  id="turno-teorico-origen"
                  className="w-full"
                  aria-invalid={Boolean(errors.idTurnoOrigen)}
                  {...formulario.register('idTurnoOrigen')}
                >
                  <NativeSelectOption value="">Elija el turno de origen</NativeSelectOption>
                  {(origenes.data ?? []).map((turno) => (
                    <NativeSelectOption key={turno.id} value={turno.id}>
                      {turno.nombre}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {errorDePrimeraCarga(origenes) !== null && (
                  <FieldError>No se pudieron cargar los turnos de origen.</FieldError>
                )}
                <FieldDescription>Solo turnos finalizados de la misma materia y grupo.</FieldDescription>
                <FieldError errors={[errors.idTurnoOrigen]} />
              </Field>
            )}
          </FieldGroup>
          {subsanacionTardia && (
            <Alert className="mt-5">
              <TriangleAlert />
              <AlertDescription>{TEXTO_SUBSANACION_TARDIA}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle>
            <h2>Preguntas</h2>
          </CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            {puedeAutogenerar && (
              <div className="flex items-end gap-2">
                <Field className="w-24">
                  <FieldLabel htmlFor="turno-teorico-cantidad-azar">Cantidad</FieldLabel>
                  <Input
                    id="turno-teorico-cantidad-azar"
                    type="number"
                    min={1}
                    max={maximoAutogenerable}
                    value={cantidadAutogenerar}
                    onChange={(evento) => setCantidadAutogenerar(Number(evento.target.value))}
                  />
                </Field>
                <Button type="button" variant="outline" size="sm" onClick={autogenerarPreguntas}>
                  <Shuffle aria-hidden />
                  Autogenerar al azar
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={valores.idMateria === '' || banco.data?.length === 0}
              onClick={() => preguntas.append({ idPregunta: '', puntajeMaximo: '' })}
            >
              <Plus aria-hidden />
              Agregar pregunta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {valores.idMateria === '' && (
            <p className="text-sm text-muted-foreground">Elija primero la materia para ver sus preguntas.</p>
          )}
          {materiaSinPreguntas && (
            <Alert>
              <AlertDescription>{TEXTO_MATERIA_SIN_PREGUNTAS}</AlertDescription>
            </Alert>
          )}
          {errorDePrimeraCarga(banco) !== null && <FieldError>No se pudieron cargar las preguntas.</FieldError>}
          {preguntas.fields.map((fila, indice) => {
            const error = errors.preguntas?.[indice]
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_8rem_auto]">
                <Field data-invalid={Boolean(error?.idPregunta)}>
                  <FieldLabel htmlFor={`pregunta-${indice}`}>Pregunta {numero}</FieldLabel>
                  <NativeSelect
                    id={`pregunta-${indice}`}
                    className="w-full"
                    aria-invalid={Boolean(error?.idPregunta)}
                    {...formulario.register(`preguntas.${indice}.idPregunta`)}
                  >
                    <NativeSelectOption value="">Elija una pregunta</NativeSelectOption>
                    {(banco.data ?? []).map((pregunta) => (
                      <NativeSelectOption key={pregunta.id} value={pregunta.id}>
                        {pregunta.enunciado}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[error?.idPregunta]} />
                </Field>
                <Field data-invalid={Boolean(error?.puntajeMaximo)}>
                  <FieldLabel htmlFor={`puntaje-${indice}`}>Puntaje {numero}</FieldLabel>
                  <Input
                    id={`puntaje-${indice}`}
                    inputMode="numeric"
                    aria-invalid={Boolean(error?.puntajeMaximo)}
                    {...formulario.register(`preguntas.${indice}.puntajeMaximo`)}
                  />
                  <FieldError errors={[error?.puntajeMaximo]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Quitar pregunta ${numero}`}
                  onClick={() => preguntas.remove(indice)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            )
          })}
          <FieldError errors={[errors.preguntas?.root ?? errors.preguntas]} />
          <p className="text-sm font-medium tabular-nums">{textoPuntajeAsignado(puntaje)}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/teoria/turnos/$id" params={{ id: String(idTurno) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/teoria/turnos">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending || !sumaCorrecta || !puedeProgramar}>
          {guardar.isPending ? 'Guardando…' : 'Guardar turno teórico'}
        </Button>
      </div>

      <AlertDialog open={materiaPendiente !== null} onOpenChange={(abierto) => !abierto && setMateriaPendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar la materia?</AlertDialogTitle>
            <AlertDialogDescription>
              Las preguntas elegidas pertenecen a la materia actual y se quitarán del examen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar la materia</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarMateria}>Cambiar y quitar preguntas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
