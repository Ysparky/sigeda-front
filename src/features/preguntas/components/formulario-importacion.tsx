import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { generarCuestionario, type Cuestionario } from '@/features/aprendizaje/api'
import { mensajeDeError } from '@/features/aprendizaje/mensajes'
import { TIPOS_PREGUNTA as TIPOS_DE_IA } from '@/features/aprendizaje/schemas'
import { useDocumentosListos } from '@/features/aprendizaje/use-documentos-listos'
import { consultasMaterias } from '@/features/materias/api'
import { CanceladoError } from '@/lib/api/errors'
import { conLimiteDeTiempo } from '@/lib/api/http'
import {
  TEXTO_GENERACION_DEMORADA,
  TEXTO_GENERANDO_CUESTIONARIO,
  TEXTO_SIN_DOCUMENTOS_LISTOS_CUESTIONARIO,
} from '@/lib/dominio/aprendizaje'
import { DIFICULTADES, TEXTO_GENERACION_RECHAZADA_E8 } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import { esquemaImportacion, IMPORTACION_VACIA, type ValoresImportacion } from '../schemas'

export const LIMITE_DE_GENERACION = 120_000

type Props = { alGenerar: (cuestionario: Cuestionario, valores: ValoresImportacion) => void }

export function FormularioImportacion({ alGenerar }: Props) {
  const documentos = useDocumentosListos()
  const materias = useQuery(consultasMaterias.lista())
  const error = errorDePrimeraCarga(documentos)
  const formulario = useForm<ValoresImportacion>({
    resolver: zodResolver(esquemaImportacion),
    defaultValues: IMPORTACION_VACIA,
  })
  const { errors } = formulario.formState

  const generar = useMutation({
    mutationFn: (valores: ValoresImportacion) =>
      conLimiteDeTiempo(LIMITE_DE_GENERACION, (senal) =>
        generarCuestionario(
          {
            documentIds: valores.documentos,
            questionTypes: valores.tipos,
            questionCount: Number(valores.cantidad),
          },
          senal,
        ),
      ),
    onSuccess: (cuestionario) => alGenerar(cuestionario, formulario.getValues()),
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

  if (documentos.data === undefined || materias.data === undefined) {
    return <Skeleton className="h-40 w-full" aria-busy="true" />
  }

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
    <form noValidate onSubmit={formulario.handleSubmit((valores) => generar.mutate(valores))} className="grid gap-6">
      {generar.isPending && (
        <Alert>
          <AlertDescription>{TEXTO_GENERANDO_CUESTIONARIO}</AlertDescription>
        </Alert>
      )}
      {generar.error && !generar.isPending && (
        <Alert variant="destructive">
          <AlertDescription>
            {demorada ? TEXTO_GENERACION_DEMORADA : mensajeDeError(generar.error, TEXTO_GENERACION_RECHAZADA_E8)}
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
                      id={`importar-documento-${documento.id}`}
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
                    <Label htmlFor={`importar-documento-${documento.id}`} className="font-normal">
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
            <h2>Preguntas del lote</h2>
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
                    {TIPOS_DE_IA.map((tipo) => (
                      <div key={tipo.valor} className="flex items-center gap-2">
                        <Checkbox
                          id={`importar-tipo-${tipo.valor}`}
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
                        <Label htmlFor={`importar-tipo-${tipo.valor}`} className="font-normal">
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
              <FieldLabel htmlFor="importar-cantidad">Cantidad de preguntas</FieldLabel>
              <Input
                id="importar-cantidad"
                inputMode="numeric"
                disabled={generar.isPending}
                aria-invalid={Boolean(errors.cantidad)}
                {...formulario.register('cantidad')}
              />
              <FieldDescription>De 2 a 20 preguntas.</FieldDescription>
              <FieldError errors={[errors.cantidad]} />
            </Field>
            <Field data-invalid={Boolean(errors.idMateria)}>
              <FieldLabel htmlFor="importar-materia">Materia del lote</FieldLabel>
              <NativeSelect
                id="importar-materia"
                className="w-full"
                disabled={generar.isPending}
                aria-invalid={Boolean(errors.idMateria)}
                {...formulario.register('idMateria')}
              >
                <NativeSelectOption value="">Elija una materia</NativeSelectOption>
                {materias.data.map((materia) => (
                  <NativeSelectOption key={materia.id} value={materia.id}>
                    {materia.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Se puede cambiar por pregunta antes de importar.</FieldDescription>
              <FieldError errors={[errors.idMateria]} />
            </Field>
            <Field data-invalid={Boolean(errors.dificultad)}>
              <FieldLabel htmlFor="importar-dificultad">Dificultad del lote</FieldLabel>
              <NativeSelect
                id="importar-dificultad"
                className="w-full"
                disabled={generar.isPending}
                {...formulario.register('dificultad')}
              >
                {DIFICULTADES.map((dificultad) => (
                  <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                    {dificultad.etiqueta}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
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
              {demorada ? 'Reintentar' : 'Generar preguntas'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
