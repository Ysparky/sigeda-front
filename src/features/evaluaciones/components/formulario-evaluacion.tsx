import { zodResolver } from '@hookform/resolvers/zod'
import type { UseMutationResult } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { esCategoria, etiquetaCategoria, requiereEvaluador, type Categoria } from '@/lib/dominio/categorias'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { formatearNota } from '@/lib/formato'
import type { CuerpoEvaluacion, EvaluacionGuardada } from '../api'
import { aCuerpoEvaluacion, esquemaEvaluacion, type ValoresEvaluacion } from '../schemas'
import { GrillaCalificaciones } from './grilla-calificaciones'

type Props = {
  valoresIniciales: ValoresEvaluacion
  categorias: readonly Categoria[]
  categoriaFija?: boolean
  guardar: UseMutationResult<EvaluacionGuardada, Error, CuerpoEvaluacion>
  cancelar: ReactNode
}

function resumenDelResultado(resultado: EvaluacionGuardada) {
  const partes = [
    resultado.promedio === null ? null : `Promedio: ${formatearNota(resultado.promedio)}`,
    resultado.clasificacion ? `Clasificación: ${resultado.clasificacion}` : null,
  ].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : undefined
}

export function FormularioEvaluacion({ valoresIniciales, categorias, categoriaFija = false, guardar, cancelar }: Props) {
  const navegar = useNavigate()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const formulario = useForm<ValoresEvaluacion>({
    resolver: zodResolver(esquemaEvaluacion),
    defaultValues: valoresIniciales,
  })
  const { errors } = formulario.formState
  const categoria = useWatch({ control: formulario.control, name: 'categoria' })
  const conEvaluador = esCategoria(categoria) && requiereEvaluador(categoria)

  function enviar(valores: ValoresEvaluacion) {
    setErrorGeneral(null)
    guardar.mutate(aCuerpoEvaluacion(valores), {
      onSuccess: (resultado) => {
        toast.success(resultado.mensaje, { description: resumenDelResultado(resultado) })
        void navegar({ to: '/evaluaciones/$cod', params: { cod: resultado.codigo } })
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          aplicarErroresDeCampo(error, formulario.setError)
          setErrorGeneral(error.message)
        } else {
          setErrorGeneral(MENSAJE_GENERICO)
        }
      },
    })
  }

  return (
    <form noValidate onSubmit={formulario.handleSubmit(enviar)} className="grid gap-6">
      {errorGeneral && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar la evaluación</AlertTitle>
          <AlertDescription>{errorGeneral}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos de la evaluación</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="evaluacion-nombre">Nombre</FieldLabel>
              <Input id="evaluacion-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 10 a 30 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.categoria)}>
              <FieldLabel htmlFor="evaluacion-categoria">Categoría</FieldLabel>
              <NativeSelect
                id="evaluacion-categoria"
                className="w-full"
                disabled={categoriaFija}
                aria-invalid={Boolean(errors.categoria)}
                {...formulario.register('categoria')}
              >
                {!categoriaFija && <NativeSelectOption value="">Elija una categoría</NativeSelectOption>}
                {categorias.map((opcion) => (
                  <NativeSelectOption key={opcion} value={opcion}>
                    {etiquetaCategoria(opcion)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                {categoriaFija
                  ? 'La categoría no se cambia al modificar.'
                  : 'Sugeridas según el estado actual del alumno.'}
              </FieldDescription>
              <FieldError errors={[errors.categoria]} />
            </Field>
            {conEvaluador && (
              <Field data-invalid={Boolean(errors.codEvaluador)}>
                <FieldLabel htmlFor="evaluacion-evaluador">Código del evaluador</FieldLabel>
                <Input
                  id="evaluacion-evaluador"
                  inputMode="numeric"
                  maxLength={6}
                  aria-invalid={Boolean(errors.codEvaluador)}
                  {...formulario.register('codEvaluador')}
                />
                <FieldDescription>Código de 6 dígitos de quien voló el chequeo o la complementación.</FieldDescription>
                <FieldError errors={[errors.codEvaluador]} />
              </Field>
            )}
            <Field data-invalid={Boolean(errors.url)}>
              <FieldLabel htmlFor="evaluacion-url">Enlace a material de respaldo</FieldLabel>
              <Input
                id="evaluacion-url"
                type="url"
                placeholder="https://"
                aria-invalid={Boolean(errors.url)}
                {...formulario.register('url')}
              />
              <FieldDescription>Opcional.</FieldDescription>
              <FieldError errors={[errors.url]} />
            </Field>
            <Field data-invalid={Boolean(errors.recomendacion)} className="md:col-span-2">
              <FieldLabel htmlFor="evaluacion-recomendacion">Recomendación general</FieldLabel>
              <Textarea
                id="evaluacion-recomendacion"
                aria-invalid={Boolean(errors.recomendacion)}
                {...formulario.register('recomendacion')}
              />
              <FieldDescription>Máximo 250 caracteres.</FieldDescription>
              <FieldError errors={[errors.recomendacion]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Calificación por maniobra</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GrillaCalificaciones
            control={formulario.control}
            register={formulario.register}
            errores={errors.calificaciones}
          />
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {cancelar}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar evaluación'}
        </Button>
      </div>
    </form>
  )
}
