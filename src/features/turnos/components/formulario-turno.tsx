import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, TriangleAlert, X } from 'lucide-react'
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
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { agruparPorGrupo, consultasCatalogos, PROGRAMAS, type Programa } from '@/features/catalogos/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { NOTAS_DIRBE } from '@/lib/dominio/dirbe'
import {
  conflictosDeAeronave,
  TEXTO_MISION_AL_MODIFICAR,
  TEXTO_MISION_PONDERA_LA_SUBFASE,
  TEXTO_TURNO_SIN_MISION,
} from '@/lib/dominio/turno'
import { termino } from '@/lib/dominio/vocabulario'
import { TEXTO_ESTADO_TEORICO_DESCONOCIDO, textoBloqueadoPorSubsanacion } from '@/lib/dominio/teoria'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnos, useGuardarTurno } from '../api'
import { useEstadoTeoricoDeAlumnos } from '../use-estado-teorico'
import { aCuerpoTurno, crearEsquemaTurno, type ValoresTurno } from '../schemas'

const RENOMBRAR = { aeronave: 'idAeronave', nota_min: 'notaMin' }

type Props = { valoresIniciales: ValoresTurno; idTurno?: number }

export function FormularioTurno({ valoresIniciales, idTurno }: Props) {
  const modificando = idTurno !== undefined
  const navegar = useNavigate()
  const guardar = useGuardarTurno(idTurno)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [subfasePendiente, setSubfasePendiente] = useState<string | null>(null)
  const [porConfirmar, setPorConfirmar] = useState<ValoresTurno | null>(null)

  const aeronaves = useQuery(consultasCatalogos.aeronaves())
  const subfases = useQuery(consultasCatalogos.subfases())
  const disponibles = useMemo(
    () => new Set((aeronaves.data ?? []).filter((aeronave) => aeronave.estado === 'Disponible').map((aeronave) => aeronave.id)),
    [aeronaves.data],
  )
  const esquema = useMemo(() => crearEsquemaTurno(hoyIso(), disponibles), [disponibles])
  const formulario = useForm<ValoresTurno>({ resolver: zodResolver(esquema), defaultValues: valoresIniciales })
  const { errors } = formulario.formState
  const alumnos = useFieldArray({ control: formulario.control, name: 'alumnosTurno' })
  const maniobras = useFieldArray({ control: formulario.control, name: 'maniobrasTurno' })
  const [programa, idSubfase, fechaEval, idAeronave, horarios] = useWatch({
    control: formulario.control,
    name: ['programa', 'idSubfase', 'fechaEval', 'idAeronave', 'alumnosTurno'],
  })
  const programaActual: Programa = programa === 'PDE' ? 'PDE' : 'PDI'

  const instructores = useQuery(consultasCatalogos.instructores(programaActual))
  const opcionesAlumnos = useQuery(consultasCatalogos.alumnos('programacion', programaActual, null))
  const opcionesManiobras = useQuery(consultasCatalogos.maniobras(Number(idSubfase) || 0))
  const opcionesMisiones = useQuery(consultasCatalogos.misiones(Number(idSubfase) || 0))
  const ocupacion = useQuery(consultasTurnos.ocupacion(fechaEval, Number(idAeronave) || 0))
  const conflictos = conflictosDeAeronave(horarios, ocupacion.data ?? [], idTurno)
  const { estados: estadosTeoricos, comprobando } = useEstadoTeoricoDeAlumnos(horarios.map((alumno) => alumno.codAlumno))
  const hayBloqueados = [...estadosTeoricos.values()].some((estado) => estado.bloqueado)
  const nombreDeAlumno = (codigo: string) =>
    opcionesAlumnos.data?.find((alumno) => alumno.codigo === codigo)?.nombreCompleto ?? codigo

  function enviar(valores: ValoresTurno) {
    setErrorGeneral(null)
    guardar.mutate(aCuerpoTurno(valores), {
      onSuccess: (resultado) => {
        toast.success(resultado.mensaje)
        void navegar({ to: '/turnos/$id', params: { id: String(resultado.id) } })
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          aplicarErroresDeCampo(error, formulario.setError, RENOMBRAR)
          setErrorGeneral(error.message)
        } else {
          setErrorGeneral(MENSAJE_GENERICO)
        }
      },
    })
  }

  function alEnviar(valores: ValoresTurno) {
    if (conflictos.length > 0) setPorConfirmar(valores)
    else enviar(valores)
  }

  function confirmarSubfase() {
    if (subfasePendiente === null) return
    formulario.setValue('idSubfase', subfasePendiente, { shouldValidate: true })
    formulario.setValue('idMision', '')
    maniobras.replace([])
    setSubfasePendiente(null)
  }

  return (
    <form noValidate onSubmit={formulario.handleSubmit(alEnviar)} className="grid gap-6">
      {errorGeneral && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el turno</AlertTitle>
          <AlertDescription>{errorGeneral}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del turno</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="turno-nombre">Nombre</FieldLabel>
              <Input id="turno-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 10 a 30 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.fechaEval)}>
              <FieldLabel htmlFor="turno-fecha">Fecha de evaluación</FieldLabel>
              <Input
                id="turno-fecha"
                type="date"
                min={sumarDias(hoyIso(), 1)}
                aria-invalid={Boolean(errors.fechaEval)}
                {...formulario.register('fechaEval')}
              />
              <FieldError errors={[errors.fechaEval]} />
            </Field>
            <Field data-invalid={Boolean(errors.programa)}>
              <FieldLabel htmlFor="turno-programa">Programa</FieldLabel>
              <Controller
                control={formulario.control}
                name="programa"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-programa"
                    className="w-full"
                    disabled={modificando}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      if (evento.target.value === field.value) return
                      field.onChange(evento.target.value)
                      formulario.setValue('codInstructor', '')
                      alumnos.replace([])
                    }}
                  >
                    {PROGRAMAS.map((opcion) => (
                      <NativeSelectOption key={opcion} value={opcion}>
                        {opcion}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              {modificando ? (
                <FieldDescription>El programa y la sub fase no se cambian al modificar.</FieldDescription>
              ) : (
                <FieldDescription>Cambiarlo quita el instructor y los alumnos elegidos.</FieldDescription>
              )}
            </Field>
            <Field data-invalid={Boolean(errors.idSubfase)}>
              <FieldLabel htmlFor="turno-subfase">Sub fase</FieldLabel>
              <Controller
                control={formulario.control}
                name="idSubfase"
                render={({ field }) => (
                  <NativeSelect
                    id="turno-subfase"
                    className="w-full"
                    disabled={modificando}
                    aria-invalid={Boolean(errors.idSubfase)}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      if (maniobras.fields.length > 0) setSubfasePendiente(evento.target.value)
                      else {
                        field.onChange(evento.target.value)
                        formulario.setValue('idMision', '')
                      }
                    }}
                  >
                    <NativeSelectOption value="">Elija una sub fase</NativeSelectOption>
                    {(subfases.data ?? []).map((subfase) => (
                      <NativeSelectOption key={subfase.id} value={subfase.id}>
                        {subfase.nombre}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              />
              {errorDePrimeraCarga(subfases) !== null && <FieldError>No se pudieron cargar las sub fases.</FieldError>}
              <FieldError errors={[errors.idSubfase]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="turno-mision">Misión del PDI</FieldLabel>
              <NativeSelect
                id="turno-mision"
                className="w-full"
                disabled={idSubfase === ''}
                {...formulario.register('idMision')}
              >
                <NativeSelectOption value="">{TEXTO_TURNO_SIN_MISION}</NativeSelectOption>
                {(opcionesMisiones.data ?? []).map((mision) => (
                  <NativeSelectOption key={mision.id} value={mision.id}>
                    {`${mision.codigo} · ${mision.horas} h · coef. ${mision.coeficiente.toFixed(4)}`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                {modificando ? TEXTO_MISION_AL_MODIFICAR : TEXTO_MISION_PONDERA_LA_SUBFASE}
              </FieldDescription>
              {errorDePrimeraCarga(opcionesMisiones) !== null && (
                <FieldError>No se pudieron cargar las misiones de la sub fase.</FieldError>
              )}
            </Field>
            <Field data-invalid={Boolean(errors.codInstructor)}>
              <FieldLabel htmlFor="turno-instructor">Instructor</FieldLabel>
              <NativeSelect
                id="turno-instructor"
                className="w-full"
                aria-invalid={Boolean(errors.codInstructor)}
                {...formulario.register('codInstructor')}
              >
                <NativeSelectOption value="">Elija un instructor</NativeSelectOption>
                {(instructores.data ?? []).map((instructor) => (
                  <NativeSelectOption key={instructor.codigo} value={instructor.codigo}>
                    {instructor.nombreCompleto}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errorDePrimeraCarga(instructores) !== null && (
                <FieldError>No se pudieron cargar los instructores.</FieldError>
              )}
              <FieldError errors={[errors.codInstructor]} />
            </Field>
            <Field data-invalid={Boolean(errors.idAeronave)}>
              <FieldLabel htmlFor="turno-aeronave">Aeronave</FieldLabel>
              <NativeSelect
                id="turno-aeronave"
                className="w-full"
                aria-invalid={Boolean(errors.idAeronave)}
                {...formulario.register('idAeronave')}
              >
                <NativeSelectOption value="">Elija una aeronave</NativeSelectOption>
                {(aeronaves.data ?? []).map((aeronave) => (
                  <NativeSelectOption key={aeronave.id} value={aeronave.id} disabled={aeronave.estado !== 'Disponible'}>
                    {aeronave.estado === 'Disponible'
                      ? aeronave.nombre
                      : `${aeronave.nombre} · ${termino('aeronave', aeronave.estado).etiqueta}`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Solo se pueden elegir aeronaves disponibles.</FieldDescription>
              {errorDePrimeraCarga(aeronaves) !== null && <FieldError>No se pudieron cargar las aeronaves.</FieldError>}
              <FieldError errors={[errors.idAeronave]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Alumnos</h2>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => alumnos.append({ codAlumno: '', horaInicio: '', horaFin: '' })}
          >
            <Plus aria-hidden />
            Agregar alumno
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {alumnos.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Agregue a los alumnos que vuelan en este turno.</p>
          )}
          {errorDePrimeraCarga(opcionesAlumnos) !== null && <FieldError>No se pudieron cargar los alumnos.</FieldError>}
          {alumnos.fields.map((fila, indice) => {
            const error = errors.alumnosTurno?.[indice]
            const numero = indice + 1
            const estadoTeorico = estadosTeoricos.get(horarios[indice]?.codAlumno ?? '')
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
                <Field data-invalid={Boolean(error?.codAlumno)}>
                  <FieldLabel htmlFor={`alumno-${indice}`}>Alumno {numero}</FieldLabel>
                  <NativeSelect
                    id={`alumno-${indice}`}
                    className="w-full"
                    aria-invalid={Boolean(error?.codAlumno)}
                    {...formulario.register(`alumnosTurno.${indice}.codAlumno`)}
                  >
                    <NativeSelectOption value="">Elija un alumno</NativeSelectOption>
                    {agruparPorGrupo(opcionesAlumnos.data ?? []).map(([grupo, lista]) => (
                      <NativeSelectOptGroup key={grupo} label={grupo}>
                        {lista.map((alumno) => (
                          <NativeSelectOption key={alumno.codigo} value={alumno.codigo}>
                            {alumno.nombreCompleto}
                          </NativeSelectOption>
                        ))}
                      </NativeSelectOptGroup>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[error?.codAlumno]} />
                  {estadoTeorico?.bloqueado === true && (
                    <FieldError>{textoBloqueadoPorSubsanacion(estadoTeorico.motivo ?? '')}</FieldError>
                  )}
                  {estadoTeorico?.desconocido === true && <FieldError>{TEXTO_ESTADO_TEORICO_DESCONOCIDO}</FieldError>}
                </Field>
                <Field data-invalid={Boolean(error?.horaInicio)}>
                  <FieldLabel htmlFor={`inicio-${indice}`}>Inicio {numero}</FieldLabel>
                  <Input
                    id={`inicio-${indice}`}
                    type="time"
                    aria-invalid={Boolean(error?.horaInicio)}
                    {...formulario.register(`alumnosTurno.${indice}.horaInicio`)}
                  />
                  <FieldError errors={[error?.horaInicio]} />
                </Field>
                <Field data-invalid={Boolean(error?.horaFin)}>
                  <FieldLabel htmlFor={`fin-${indice}`}>Fin {numero}</FieldLabel>
                  <Input
                    id={`fin-${indice}`}
                    type="time"
                    aria-invalid={Boolean(error?.horaFin)}
                    {...formulario.register(`alumnosTurno.${indice}.horaFin`)}
                  />
                  <FieldError errors={[error?.horaFin]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Quitar alumno ${numero}`}
                  onClick={() => alumnos.remove(indice)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            )
          })}
          <FieldError errors={[errors.alumnosTurno?.root ?? errors.alumnosTurno]} />
          {conflictos.length > 0 && (
            <Alert>
              <TriangleAlert />
              <AlertTitle>Horario superpuesto en la aeronave</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {conflictos.map(({ indice, ocupacion: otro }) => (
                    <li key={`${indice}-${otro.idTurno}`}>
                      {nombreDeAlumno(horarios[indice]?.codAlumno ?? '')} ({horarios[indice]?.horaInicio}–
                      {horarios[indice]?.horaFin}) se cruza con «{otro.nombre}» ({otro.horaInicio}–{otro.horaFin}).
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Maniobras</h2>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={idSubfase === ''}
            onClick={() => maniobras.append({ idManiobra: '', notaMin: '' })}
          >
            <Plus aria-hidden />
            Agregar maniobra
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {idSubfase === '' ? (
            <p className="text-sm text-muted-foreground">Elija primero la sub fase para ver sus maniobras.</p>
          ) : (
            opcionesManiobras.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">La sub fase no tiene maniobras asignadas.</p>
            )
          )}
          {errorDePrimeraCarga(opcionesManiobras) !== null && (
            <FieldError>No se pudieron cargar las maniobras.</FieldError>
          )}
          {maniobras.fields.map((fila, indice) => {
            const error = errors.maniobrasTurno?.[indice]
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_10rem_auto]">
                <Field data-invalid={Boolean(error?.idManiobra)}>
                  <FieldLabel htmlFor={`maniobra-${indice}`}>Maniobra {numero}</FieldLabel>
                  <NativeSelect
                    id={`maniobra-${indice}`}
                    className="w-full"
                    aria-invalid={Boolean(error?.idManiobra)}
                    {...formulario.register(`maniobrasTurno.${indice}.idManiobra`)}
                  >
                    <NativeSelectOption value="">Elija una maniobra</NativeSelectOption>
                    {(opcionesManiobras.data ?? []).map((maniobra) => (
                      <NativeSelectOption key={maniobra.id} value={maniobra.id}>
                        {maniobra.nombre}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[error?.idManiobra]} />
                </Field>
                <Field data-invalid={Boolean(error?.notaMin)}>
                  <FieldLabel htmlFor={`nota-${indice}`}>Nota mínima {numero}</FieldLabel>
                  <NativeSelect
                    id={`nota-${indice}`}
                    className="w-full"
                    aria-invalid={Boolean(error?.notaMin)}
                    {...formulario.register(`maniobrasTurno.${indice}.notaMin`)}
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {NOTAS_DIRBE.map((nota) => (
                      <NativeSelectOption key={nota} value={nota}>
                        {nota}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[error?.notaMin]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Quitar maniobra ${numero}`}
                  onClick={() => maniobras.remove(indice)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            )
          })}
          <FieldError errors={[errors.maniobrasTurno?.root ?? errors.maniobrasTurno]} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/turnos/$id" params={{ id: String(idTurno) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/turnos">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending || hayBloqueados || comprobando}>
          {guardar.isPending ? 'Guardando…' : 'Guardar turno'}
        </Button>
      </div>

      <AlertDialog open={subfasePendiente !== null} onOpenChange={(abierto) => !abierto && setSubfasePendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar la sub fase?</AlertDialogTitle>
            <AlertDialogDescription>
              Las maniobras elegidas pertenecen a la sub fase actual y se quitarán del turno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar sub fase</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarSubfase}>Cambiar y quitar maniobras</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={porConfirmar !== null} onOpenChange={(abierto) => !abierto && setPorConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Guardar con horarios superpuestos?</AlertDialogTitle>
            <AlertDialogDescription>
              La aeronave ya tiene vuelos programados en ese horario. Puede guardar de todos modos o corregir los horarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Corregir horarios</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (porConfirmar) enviar(porConfirmar)
                setPorConfirmar(null)
              }}
            >
              Guardar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
