import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { catalogoQuery } from '@/features/inscripcion/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesConvocatorias, crearConvocatoria, modificarConvocatoria, type Convocatoria } from './api'
import { aCuerpoConvocatoria, CONVOCATORIA_VACIA, esquemaConvocatoria, type ValoresConvocatoria } from './schemas'

function valoresDesde(convocatoria: Convocatoria): ValoresConvocatoria {
  return {
    idCurso: convocatoria.idCurso === null ? '' : String(convocatoria.idCurso),
    nombre: convocatoria.nombre,
    descripcion: convocatoria.descripcion ?? '',
    fechaInicio: convocatoria.fechaInicio,
    fechaFin: convocatoria.fechaFin,
    vacantes: String(convocatoria.vacantes),
  }
}

export function FormularioConvocatoria({ convocatoria }: { convocatoria?: Convocatoria }) {
  const modificando = convocatoria !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const cursos = useQuery(catalogoQuery())
  const formulario = useForm<ValoresConvocatoria>({
    resolver: zodResolver(esquemaConvocatoria),
    defaultValues: convocatoria ? valoresDesde(convocatoria) : CONVOCATORIA_VACIA,
  })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresConvocatoria) =>
      modificando
        ? modificarConvocatoria(convocatoria.id, aCuerpoConvocatoria(valores))
        : crearConvocatoria(aCuerpoConvocatoria(valores)),
    onSuccess: async (guardada) => {
      toast.success(modificando ? 'Convocatoria actualizada.' : 'Convocatoria creada.')
      await queryClient.invalidateQueries({ queryKey: clavesConvocatorias.todo })
      await navegar({ to: '/convocatorias/$id', params: { id: String(guardada.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <>
      <PageHeader
        titulo={modificando ? 'Modificar convocatoria' : 'Nueva convocatoria'}
        descripcion="Proceso de admisión con vacantes, fechas y documentos requeridos."
        acciones={
          <Button variant="outline" asChild>
            <Link to="/convocatorias">Volver</Link>
          </Button>
        }
      />
      <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
        {guardar.error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo guardar la convocatoria</AlertTitle>
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="conv-nombre">Nombre</FieldLabel>
              <Input id="conv-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.idCurso)}>
              <FieldLabel htmlFor="conv-curso">Curso</FieldLabel>
              <NativeSelect id="conv-curso" className="w-full" {...formulario.register('idCurso')}>
                <NativeSelectOption value="">Elija un curso</NativeSelectOption>
                {(cursos.data ?? []).map((curso) => (
                  <NativeSelectOption key={curso.id} value={curso.id}>
                    {curso.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.idCurso]} />
            </Field>
            <Field data-invalid={Boolean(errors.fechaInicio)}>
              <FieldLabel htmlFor="conv-inicio">Fecha de inicio</FieldLabel>
              <Input id="conv-inicio" type="date" aria-invalid={Boolean(errors.fechaInicio)} {...formulario.register('fechaInicio')} />
              <FieldError errors={[errors.fechaInicio]} />
            </Field>
            <Field data-invalid={Boolean(errors.fechaFin)}>
              <FieldLabel htmlFor="conv-fin">Fecha de fin</FieldLabel>
              <Input id="conv-fin" type="date" aria-invalid={Boolean(errors.fechaFin)} {...formulario.register('fechaFin')} />
              <FieldError errors={[errors.fechaFin]} />
            </Field>
            <Field data-invalid={Boolean(errors.vacantes)}>
              <FieldLabel htmlFor="conv-vacantes">Vacantes</FieldLabel>
              <Input id="conv-vacantes" inputMode="numeric" aria-invalid={Boolean(errors.vacantes)} {...formulario.register('vacantes')} />
              <FieldError errors={[errors.vacantes]} />
            </Field>
            <Field data-invalid={Boolean(errors.descripcion)} className="md:col-span-2">
              <FieldLabel htmlFor="conv-desc">Descripción</FieldLabel>
              <Input id="conv-desc" aria-invalid={Boolean(errors.descripcion)} {...formulario.register('descripcion')} />
              <FieldError errors={[errors.descripcion]} />
            </Field>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link to="/convocatorias">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar convocatoria'}
          </Button>
        </div>
      </form>
    </>
  )
}
