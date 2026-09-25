import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { consultasMaterias } from '@/features/materias/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { useSesion } from '@/lib/auth/use-sesion'
import { DIFICULTADES, MARCADOR_COMPLETAR, TIPOS_PREGUNTA, type TipoPregunta } from '@/lib/dominio/teoria'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesPreguntas, consultasPreguntas, crearPregunta, modificarPregunta, type PreguntaDetalle } from '../api'
import {
  aCuerpoPregunta,
  alternativasPara,
  esquemaPregunta,
  preguntaVacia,
  valoresDesdePregunta,
  type ValoresPregunta,
} from '../schemas'

type PropsFormulario = { pregunta?: PreguntaDetalle; alGuardar: () => void }

function FormularioPregunta({ pregunta, alGuardar }: PropsFormulario) {
  const queryClient = useQueryClient()
  const sesion = useSesion()
  const materias = useQuery(consultasMaterias.lista())
  const [tipoPendiente, setTipoPendiente] = useState<TipoPregunta | null>(null)
  const formulario = useForm<ValoresPregunta>({
    resolver: zodResolver(esquemaPregunta),
    defaultValues: pregunta ? valoresDesdePregunta(pregunta) : preguntaVacia(),
  })
  const { errors } = formulario.formState
  const [tipoPregunta, alternativas] = useWatch({ control: formulario.control, name: ['tipoPregunta', 'alternativas'] })

  const guardar = useMutation({
    mutationFn: (valores: ValoresPregunta) => {
      const cuerpo = aCuerpoPregunta(valores, sesion?.codPersona ?? '')
      return pregunta ? modificarPregunta(pregunta.id, cuerpo) : crearPregunta(cuerpo)
    },
    onSuccess: async (mensaje) => {
      alGuardar()
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPreguntas.todo })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function cambiarTipo(siguiente: TipoPregunta) {
    formulario.setValue('tipoPregunta', siguiente)
    formulario.setValue('alternativas', alternativasPara(siguiente))
    formulario.setValue('correcta', siguiente === 'COMPLETAR' ? '0' : '')
    formulario.clearErrors()
  }

  function pedirCambioDeTipo(siguiente: string) {
    const elegido = TIPOS_PREGUNTA.find((tipo) => tipo.valor === siguiente)?.valor
    if (elegido === undefined || elegido === tipoPregunta) return
    const conTexto = formulario
      .getValues('alternativas')
      .some((alternativa, indice) => alternativa.respuesta.trim() !== '' && alternativasPara(tipoPregunta)[indice]?.respuesta !== alternativa.respuesta)
    if (conTexto) setTipoPendiente(elegido)
    else cambiarTipo(elegido)
  }

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))}>
      <FieldGroup>
        {guardar.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Field data-invalid={Boolean(errors.idMateria)}>
          <FieldLabel htmlFor="pregunta-materia">Materia</FieldLabel>
          <NativeSelect
            id="pregunta-materia"
            className="w-full"
            aria-invalid={Boolean(errors.idMateria)}
            {...formulario.register('idMateria')}
          >
            <NativeSelectOption value="">Elija una materia</NativeSelectOption>
            {(materias.data ?? []).map((materia) => (
              <NativeSelectOption key={materia.id} value={materia.id}>
                {materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(materias) !== null && <FieldError>No se pudieron cargar las materias.</FieldError>}
          <FieldError errors={[errors.idMateria]} />
        </Field>
        <Field data-invalid={Boolean(errors.tipoPregunta)}>
          <FieldLabel htmlFor="pregunta-tipo">Tipo de pregunta</FieldLabel>
          <NativeSelect
            id="pregunta-tipo"
            className="w-full"
            value={tipoPregunta}
            onChange={(evento) => pedirCambioDeTipo(evento.target.value)}
          >
            {TIPOS_PREGUNTA.map((tipo) => (
              <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>Cambiarlo rehace las alternativas.</FieldDescription>
        </Field>
        <Field data-invalid={Boolean(errors.enunciado)}>
          <FieldLabel htmlFor="pregunta-enunciado">Enunciado</FieldLabel>
          <Textarea
            id="pregunta-enunciado"
            aria-invalid={Boolean(errors.enunciado)}
            {...formulario.register('enunciado')}
          />
          <FieldDescription>
            De 10 a 500 caracteres
            {tipoPregunta === 'COMPLETAR' ? `, con el marcador ${MARCADOR_COMPLETAR}.` : '.'}
          </FieldDescription>
          <FieldError errors={[errors.enunciado]} />
        </Field>
        <Field data-invalid={Boolean(errors.dificultad)}>
          <FieldLabel htmlFor="pregunta-dificultad">Dificultad</FieldLabel>
          <NativeSelect
            id="pregunta-dificultad"
            className="w-full"
            aria-invalid={Boolean(errors.dificultad)}
            {...formulario.register('dificultad')}
          >
            {DIFICULTADES.map((dificultad) => (
              <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                {dificultad.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={Boolean(errors.alternativas ?? errors.correcta)}>
          <FieldLabel>{tipoPregunta === 'COMPLETAR' ? 'Respuesta esperada' : 'Alternativas'}</FieldLabel>
          {tipoPregunta === 'COMPLETAR' ? (
            <>
              <Input
                aria-label="Respuesta esperada"
                aria-invalid={Boolean(errors.alternativas?.[0]?.respuesta)}
                {...formulario.register('alternativas.0.respuesta')}
              />
              <FieldError errors={[errors.alternativas?.[0]?.respuesta]} />
            </>
          ) : (
            <Controller
              control={formulario.control}
              name="correcta"
              render={({ field }) => (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="grid gap-2"
                  aria-label="Alternativa correcta"
                  value={field.value}
                  onValueChange={(valor) => valor !== '' && field.onChange(valor)}
                >
                  {alternativas.map((_, indice) => (
                    <div key={indice} className="flex items-center gap-2">
                      <ToggleGroupItem value={String(indice)} aria-label={`Alternativa ${indice + 1} es la correcta`}>
                        Correcta
                      </ToggleGroupItem>
                      {tipoPregunta === 'VERDADERO_FALSO' ? (
                        <span>{formulario.getValues(`alternativas.${indice}.respuesta`)}</span>
                      ) : (
                        <Input
                          aria-label={`Alternativa ${indice + 1}`}
                          aria-invalid={Boolean(errors.alternativas?.[indice]?.respuesta)}
                          {...formulario.register(`alternativas.${indice}.respuesta`)}
                        />
                      )}
                    </div>
                  ))}
                </ToggleGroup>
              )}
            />
          )}
          <FieldError errors={[errors.correcta, errors.alternativas?.root ?? errors.alternativas]} />
          {tipoPregunta === 'OPCION_MULTIPLE' &&
            alternativas.map((_, indice) => (
              <FieldError key={indice} errors={[errors.alternativas?.[indice]?.respuesta]} />
            ))}
        </Field>
        <Field data-invalid={Boolean(errors.explicacion)}>
          <FieldLabel htmlFor="pregunta-explicacion">Explicación</FieldLabel>
          <Textarea
            id="pregunta-explicacion"
            aria-invalid={Boolean(errors.explicacion)}
            {...formulario.register('explicacion')}
          />
          <FieldDescription>Opcional, hasta 1000 caracteres. El alumno la ve al cerrar el turno.</FieldDescription>
          <FieldError errors={[errors.explicacion]} />
        </Field>
      </FieldGroup>
      <DialogFooter className="mt-6">
        <Button type="button" variant="ghost" onClick={alGuardar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar pregunta'}
        </Button>
      </DialogFooter>
      <AlertDialog open={tipoPendiente !== null} onOpenChange={(abierto) => !abierto && setTipoPendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar el tipo de pregunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Las alternativas escritas pertenecen al tipo actual y se descartarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar el tipo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tipoPendiente) cambiarTipo(tipoPendiente)
                setTipoPendiente(null)
              }}
            >
              Cambiar y rehacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

export function DialogoPregunta({ idPregunta, disparador }: { idPregunta?: number; disparador: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const detalle = useQuery({
    ...consultasPreguntas.detalle(idPregunta ?? 0),
    enabled: abierto && idPregunta !== undefined,
  })
  const error = errorDePrimeraCarga(detalle)
  const esperando = idPregunta !== undefined && detalle.data === undefined

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{disparador}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{idPregunta === undefined ? 'Registrar pregunta' : 'Modificar pregunta'}</DialogTitle>
          <DialogDescription>Materia, enunciado, tipo, dificultad y sus alternativas.</DialogDescription>
        </DialogHeader>
        {error !== null ? (
          <AvisoDeError error={error} alReintentar={() => void detalle.refetch()} />
        ) : esperando ? (
          <Skeleton className="h-64 w-full" aria-busy="true" />
        ) : (
          <FormularioPregunta pregunta={detalle.data} alGuardar={() => setAbierto(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
