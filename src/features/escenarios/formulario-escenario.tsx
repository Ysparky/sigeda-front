import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasCatalogos } from '@/features/catalogos/api'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, X } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesEscenarios, crearEscenario, type Escenario, modificarEscenario } from './api'
import { aCuerpoEscenario, ESCENARIO_VACIO, esquemaEscenario, type ValoresEscenario } from './schemas'

export function FormularioEscenario({ escenario }: { escenario?: Escenario }) {
  const modificando = escenario !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales: ValoresEscenario = escenario
    ? {
        nombre: escenario.nombre,
        descripcion: escenario.descripcion ?? '',
        objetivo: escenario.objetivo ?? '',
        duracionMin: escenario.duracionMin === null ? '' : String(escenario.duracionMin),
        activo: escenario.activo,
        idSubfase: escenario.idSubfase === null ? '' : String(escenario.idSubfase),
        indicadores: escenario.indicadores.map((indicador) => ({
          nombre: indicador.nombre,
          competencia: indicador.competencia ?? '',
        })),
      }
    : ESCENARIO_VACIO
  const formulario = useForm<ValoresEscenario>({ resolver: zodResolver(esquemaEscenario), defaultValues: iniciales })
  const { errors } = formulario.formState
  const indicadores = useFieldArray({ control: formulario.control, name: 'indicadores' })
  const subfases = useQuery(consultasCatalogos.subfases())

  const guardar = useMutation({
    mutationFn: (valores: ValoresEscenario) =>
      escenario ? modificarEscenario(escenario.id, aCuerpoEscenario(valores)) : crearEscenario(aCuerpoEscenario(valores)),
    onSuccess: async (guardado) => {
      toast.success(modificando ? 'Escenario actualizado.' : 'Escenario registrado.')
      await queryClient.invalidateQueries({ queryKey: clavesEscenarios.todo })
      await navegar({ to: '/escenarios/$id', params: { id: String(guardado.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el escenario</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del escenario</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field data-invalid={Boolean(errors.nombre)}>
            <FieldLabel htmlFor="esc-nombre">Nombre</FieldLabel>
            <Input id="esc-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
            <FieldError errors={[errors.nombre]} />
          </Field>
          <Field data-invalid={Boolean(errors.objetivo)}>
            <FieldLabel htmlFor="esc-objetivo">Objetivo</FieldLabel>
            <Textarea id="esc-objetivo" aria-invalid={Boolean(errors.objetivo)} {...formulario.register('objetivo')} />
            <FieldError errors={[errors.objetivo]} />
          </Field>
          <Field data-invalid={Boolean(errors.descripcion)}>
            <FieldLabel htmlFor="esc-descripcion">Descripción</FieldLabel>
            <Textarea
              id="esc-descripcion"
              aria-invalid={Boolean(errors.descripcion)}
              {...formulario.register('descripcion')}
            />
            <FieldError errors={[errors.descripcion]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="esc-subfase">Requisito antes de volar la sub fase</FieldLabel>
            <NativeSelect id="esc-subfase" {...formulario.register('idSubfase')}>
              <NativeSelectOption value="">Ninguna (práctica libre)</NativeSelectOption>
              {(subfases.data ?? []).map((s) => (
                <NativeSelectOption key={s.id} value={String(s.id)}>
                  {s.nombre}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>El alumno debe aprobar este escenario en simulador antes de que se le programe esa sub fase.</FieldDescription>
          </Field>
          <Field data-invalid={Boolean(errors.duracionMin)}>
            <FieldLabel htmlFor="esc-duracion">Duración (min)</FieldLabel>
            <Input
              id="esc-duracion"
              inputMode="numeric"
              aria-invalid={Boolean(errors.duracionMin)}
              {...formulario.register('duracionMin')}
            />
            <FieldError errors={[errors.duracionMin]} />
          </Field>
          <div className="flex items-center gap-2">
            <Controller
              control={formulario.control}
              name="activo"
              render={({ field }) => (
                <Checkbox id="esc-activo" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              )}
            />
            <FieldLabel htmlFor="esc-activo">Activo</FieldLabel>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Indicadores de competencia</h2>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => indicadores.append({ nombre: '', competencia: '' })}
          >
            <Plus aria-hidden />
            Agregar indicador
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {indicadores.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Agregue al menos un indicador de competencia.</p>
          )}
          {indicadores.fields.map((fila, indice) => {
            const error = errors.indicadores?.[indice]
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Field data-invalid={Boolean(error?.nombre)}>
                  <FieldLabel htmlFor={`indicador-nombre-${indice}`}>Indicador {numero}</FieldLabel>
                  <Input
                    id={`indicador-nombre-${indice}`}
                    aria-invalid={Boolean(error?.nombre)}
                    {...formulario.register(`indicadores.${indice}.nombre`)}
                  />
                  <FieldError errors={[error?.nombre]} />
                </Field>
                <Field data-invalid={Boolean(error?.competencia)}>
                  <FieldLabel htmlFor={`indicador-competencia-${indice}`}>Competencia {numero}</FieldLabel>
                  <Input
                    id={`indicador-competencia-${indice}`}
                    aria-invalid={Boolean(error?.competencia)}
                    {...formulario.register(`indicadores.${indice}.competencia`)}
                  />
                  <FieldError errors={[error?.competencia]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Quitar indicador ${numero}`}
                  onClick={() => indicadores.remove(indice)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/escenarios/$id" params={{ id: String(escenario.id) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/escenarios">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
