import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, X } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesManiobras, consultasManiobras, guardarParametros } from './api'
import { aCuerpoParametros, esquemaParametros, PARAMETRO_VACIO, type ValoresParametros } from './schemas'

const MENSAJE_PARAMETROS_GUARDADOS = 'Tolerancias guardadas con éxito.'

export function ParametrosPage({ id }: { id: number }) {
  const { data: maniobra } = useSuspenseQuery(consultasManiobras.detalle(id))
  const { data: parametros } = useSuspenseQuery(consultasManiobras.parametros(id))
  const navegar = useNavigate()
  const queryClient = useQueryClient()

  const iniciales: ValoresParametros = {
    parametros:
      parametros.length > 0
        ? parametros.map((parametro) => ({
            clave: parametro.clave,
            tipo: parametro.tipo,
            unidad: parametro.unidad ?? '',
            objetivo: String(parametro.objetivo),
            tolExcelente: String(parametro.tolExcelente),
            tolBueno: String(parametro.tolBueno),
            tolRegular: String(parametro.tolRegular),
          }))
        : [{ ...PARAMETRO_VACIO }],
  }
  const formulario = useForm<ValoresParametros>({ resolver: zodResolver(esquemaParametros), defaultValues: iniciales })
  const { errors } = formulario.formState
  const filas = useFieldArray({ control: formulario.control, name: 'parametros' })

  const guardar = useMutation({
    mutationFn: (valores: ValoresParametros) => guardarParametros(maniobra.id, aCuerpoParametros(valores)),
    onSuccess: async () => {
      toast.success(MENSAJE_PARAMETROS_GUARDADOS)
      await queryClient.invalidateQueries({ queryKey: clavesManiobras.todo })
      await navegar({ to: '/programa/maniobras/$id', params: { id: String(maniobra.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <>
      <PageHeader
        titulo="Tolerancias de la maniobra"
        descripcion={maniobra.nombre}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/programa/maniobras/$id" params={{ id: String(maniobra.id) }}>
              Volver a la maniobra
            </Link>
          </Button>
        }
      />
      <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
        {guardar.error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron guardar las tolerancias</AlertTitle>
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>
              <h2>Parámetros medibles</h2>
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => filas.append({ ...PARAMETRO_VACIO })}>
              <Plus aria-hidden />
              Agregar parámetro
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FieldDescription>
              Cada parámetro define un objetivo y las bandas de desvío que dan la letra: hasta Excelente ⇒ E, hasta Bueno
              ⇒ B, hasta Regular ⇒ R, más allá ⇒ I. Una maniobra con tolerancias es «simulable».
            </FieldDescription>
            <FieldError errors={[errors.parametros?.root ?? errors.parametros]} />
            {filas.fields.map((fila, indice) => {
              const error = errors.parametros?.[indice]
              const numero = indice + 1
              return (
                <div key={fila.id} className="grid items-start gap-3 md:grid-cols-[1fr_8rem_6rem_auto]">
                  <Field data-invalid={Boolean(error?.clave)}>
                    <FieldLabel htmlFor={`parametro-clave-${indice}`}>Clave {numero}</FieldLabel>
                    <Input
                      id={`parametro-clave-${indice}`}
                      placeholder="ALTITUD"
                      aria-invalid={Boolean(error?.clave)}
                      {...formulario.register(`parametros.${indice}.clave`)}
                    />
                    <FieldError errors={[error?.clave]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`parametro-tipo-${indice}`}>Tipo {numero}</FieldLabel>
                    <NativeSelect
                      id={`parametro-tipo-${indice}`}
                      className="w-full"
                      {...formulario.register(`parametros.${indice}.tipo`)}
                    >
                      <NativeSelectOption value="LINEAL">Lineal</NativeSelectOption>
                      <NativeSelectOption value="ANGULAR">Angular</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field data-invalid={Boolean(error?.unidad)}>
                    <FieldLabel htmlFor={`parametro-unidad-${indice}`}>Unidad {numero}</FieldLabel>
                    <Input
                      id={`parametro-unidad-${indice}`}
                      placeholder="ft"
                      aria-invalid={Boolean(error?.unidad)}
                      {...formulario.register(`parametros.${indice}.unidad`)}
                    />
                    <FieldError errors={[error?.unidad]} />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:mt-6"
                    aria-label={`Quitar parámetro ${numero}`}
                    onClick={() => filas.remove(indice)}
                  >
                    <X aria-hidden />
                  </Button>
                  <div className="grid gap-3 sm:grid-cols-4 md:col-span-4">
                    <Field data-invalid={Boolean(error?.objetivo)}>
                      <FieldLabel htmlFor={`parametro-objetivo-${indice}`}>Objetivo {numero}</FieldLabel>
                      <Input
                        id={`parametro-objetivo-${indice}`}
                        inputMode="decimal"
                        aria-invalid={Boolean(error?.objetivo)}
                        {...formulario.register(`parametros.${indice}.objetivo`)}
                      />
                      <FieldError errors={[error?.objetivo]} />
                    </Field>
                    <Field data-invalid={Boolean(error?.tolExcelente)}>
                      <FieldLabel htmlFor={`parametro-tolE-${indice}`}>Banda E {numero}</FieldLabel>
                      <Input
                        id={`parametro-tolE-${indice}`}
                        inputMode="decimal"
                        aria-invalid={Boolean(error?.tolExcelente)}
                        {...formulario.register(`parametros.${indice}.tolExcelente`)}
                      />
                      <FieldError errors={[error?.tolExcelente]} />
                    </Field>
                    <Field data-invalid={Boolean(error?.tolBueno)}>
                      <FieldLabel htmlFor={`parametro-tolB-${indice}`}>Banda B {numero}</FieldLabel>
                      <Input
                        id={`parametro-tolB-${indice}`}
                        inputMode="decimal"
                        aria-invalid={Boolean(error?.tolBueno)}
                        {...formulario.register(`parametros.${indice}.tolBueno`)}
                      />
                      <FieldError errors={[error?.tolBueno]} />
                    </Field>
                    <Field data-invalid={Boolean(error?.tolRegular)}>
                      <FieldLabel htmlFor={`parametro-tolR-${indice}`}>Banda R {numero}</FieldLabel>
                      <Input
                        id={`parametro-tolR-${indice}`}
                        inputMode="decimal"
                        aria-invalid={Boolean(error?.tolRegular)}
                        {...formulario.register(`parametros.${indice}.tolRegular`)}
                      />
                      <FieldError errors={[error?.tolRegular]} />
                    </Field>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link to="/programa/maniobras/$id" params={{ id: String(maniobra.id) }}>
              Cancelar
            </Link>
          </Button>
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar tolerancias'}
          </Button>
        </div>
      </form>
    </>
  )
}
