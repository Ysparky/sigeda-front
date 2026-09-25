import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { AvisoDeError } from '@/components/aviso-de-error'
import { EmptyState } from '@/components/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { CanceladoError } from '@/lib/api/errors'
import { conLimiteDeTiempo } from '@/lib/api/http'
import {
  TEXTO_GENERACION_DEMORADA,
  TEXTO_GENERACION_RECHAZADA,
  TEXTO_GENERANDO_CUESTIONARIO,
  TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO,
} from '@/lib/dominio/aprendizaje'
import { errorDePrimeraCarga } from '@/lib/query'
import { generarCuestionario, type Cuestionario, type TipoPregunta } from '../api'
import { mensajeDeError } from '../mensajes'
import { esquemaGeneracion, GENERACION_VACIA, TIPOS_PREGUNTA, type ValoresGeneracion } from '../schemas'
import { useDocumentosListos } from '../use-documentos-listos'

export const LIMITE_DE_GENERACION = 120_000

export function FormularioGeneracion({ alGenerar }: { alGenerar: (cuestionario: Cuestionario) => void }) {
  const documentos = useDocumentosListos()
  const error = errorDePrimeraCarga(documentos)
  const formulario = useForm<ValoresGeneracion>({
    resolver: zodResolver(esquemaGeneracion),
    defaultValues: GENERACION_VACIA,
  })
  const { errors } = formulario.formState

  const generar = useMutation({
    mutationFn: (valores: ValoresGeneracion) =>
      conLimiteDeTiempo(LIMITE_DE_GENERACION, (senal) =>
        generarCuestionario(
          {
            documentIds: valores.documentos,
            questionTypes: valores.tipos as TipoPregunta[],
            questionCount: Number(valores.cantidad),
          },
          senal,
        ),
      ),
    onSuccess: alGenerar,
  })

  if (error !== null) {
    return (
      <AvisoDeError
        titulo="No se pudieron cargar los documentos"
        error={error}
        alReintentar={() => void documentos.refetch()}
      />
    )
  }

  if (documentos.data === undefined) return <Skeleton className="h-40 w-full" aria-busy="true" />

  if (documentos.data.length === 0) {
    return (
      <EmptyState
        titulo="No hay documentos listos"
        descripcion={TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO}
        accion={
          <Button variant="outline" asChild>
            <Link to="/aprendizaje">Ir a Documentos</Link>
          </Button>
        }
      />
    )
  }

  const demorada = generar.error instanceof CanceladoError

  return (
    <form
      noValidate
      onSubmit={formulario.handleSubmit((valores) => generar.mutate(valores))}
      className="grid gap-6"
    >
      {generar.isPending && (
        <Alert>
          <AlertDescription>{TEXTO_GENERANDO_CUESTIONARIO}</AlertDescription>
        </Alert>
      )}
      {generar.error && !generar.isPending && (
        <Alert variant="destructive">
          <AlertDescription>
            {demorada ? TEXTO_GENERACION_DEMORADA : mensajeDeError(generar.error, TEXTO_GENERACION_RECHAZADA)}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Documentos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={formulario.control}
            name="documentos"
            render={({ field }) => (
              <div role="group" aria-label="Documentos del cuestionario" className="grid gap-3 sm:grid-cols-2">
                {documentos.data.map((documento) => (
                  <div key={documento.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`cuestionario-documento-${documento.id}`}
                      disabled={generar.isPending}
                      checked={field.value.includes(documento.id)}
                      onCheckedChange={(marcado) =>
                        field.onChange(
                          marcado === true
                            ? [...field.value, documento.id]
                            : field.value.filter((id) => id !== documento.id),
                        )
                      }
                    />
                    <Label htmlFor={`cuestionario-documento-${documento.id}`} className="font-normal">
                      {documento.filename}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          />
          <FieldError className="mt-3" errors={[errors.documentos?.root ?? errors.documentos]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Preguntas</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.tipos)}>
              <FieldLabel>Tipos de pregunta</FieldLabel>
              <Controller
                control={formulario.control}
                name="tipos"
                render={({ field }) => (
                  <div role="group" aria-label="Tipos de pregunta" className="grid gap-3">
                    {TIPOS_PREGUNTA.map((tipo) => (
                      <div key={tipo.valor} className="flex items-center gap-2">
                        <Checkbox
                          id={`cuestionario-tipo-${tipo.valor}`}
                          disabled={generar.isPending}
                          checked={field.value.includes(tipo.valor)}
                          onCheckedChange={(marcado) =>
                            field.onChange(
                              marcado === true
                                ? [...field.value, tipo.valor]
                                : field.value.filter((valor) => valor !== tipo.valor),
                            )
                          }
                        />
                        <Label htmlFor={`cuestionario-tipo-${tipo.valor}`} className="font-normal">
                          {tipo.etiqueta}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              />
              <FieldError errors={[errors.tipos?.root ?? errors.tipos]} />
            </Field>
            <Field data-invalid={Boolean(errors.cantidad)}>
              <FieldLabel htmlFor="cuestionario-cantidad">Cantidad de preguntas</FieldLabel>
              <Input
                id="cuestionario-cantidad"
                inputMode="numeric"
                disabled={generar.isPending}
                aria-invalid={Boolean(errors.cantidad)}
                {...formulario.register('cantidad')}
              />
              <FieldDescription>De 2 a 20 preguntas.</FieldDescription>
              <FieldError errors={[errors.cantidad]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={generar.isPending}>
          {generar.isPending ? (
            'Generando…'
          ) : (
            <>
              <Sparkles aria-hidden />
              {demorada ? 'Reintentar' : 'Generar cuestionario'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
