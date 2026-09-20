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
import { clavesFases } from '@/features/fases/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import {
  MENSAJE_ESTANDARES_GUARDADOS,
  TEXTO_DESCRIPCION_SE_CONSERVA,
  TEXTO_ESTANDAR_NO_SE_QUITA,
} from '@/lib/dominio/programa'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesManiobras, consultasManiobras, guardarEstandares } from './api'
import { esquemaEstandares, type ValoresEstandares } from './schemas'

export function EstandaresPage({ id }: { id: number }) {
  const { data: maniobra } = useSuspenseQuery(consultasManiobras.detalle(id))
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales: ValoresEstandares = {
    estandares:
      maniobra.estandares.length > 0
        ? maniobra.estandares.map((estandar) => ({
            id: String(estandar.id),
            nombre: estandar.nombre,
            descripcion: estandar.descripcion ?? '',
          }))
        : [{ id: '0', nombre: '', descripcion: '' }],
  }
  const formulario = useForm<ValoresEstandares>({ resolver: zodResolver(esquemaEstandares), defaultValues: iniciales })
  const { errors } = formulario.formState
  const estandares = useFieldArray({ control: formulario.control, name: 'estandares' })

  const guardar = useMutation({
    mutationFn: (valores: ValoresEstandares) =>
      guardarEstandares(maniobra.id, {
        estandares: valores.estandares.map((estandar) => ({
          id: Number(estandar.id),
          nombre: estandar.nombre.trim(),
          descripcion: estandar.descripcion.trim(),
        })),
      }),
    onSuccess: async () => {
      toast.success(MENSAJE_ESTANDARES_GUARDADOS)
      await queryClient.invalidateQueries({ queryKey: clavesManiobras.todo })
      await queryClient.invalidateQueries({ queryKey: clavesFases.todo })
      await navegar({ to: '/programa/maniobras/$id', params: { id: String(maniobra.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <>
      <PageHeader
        titulo="Estándares de la maniobra"
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
            <AlertTitle>No se pudieron guardar los estándares</AlertTitle>
            <AlertDescription>
              {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>
              <h2>Estándares</h2>
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => estandares.append({ id: '0', nombre: '', descripcion: '' })}
            >
              <Plus aria-hidden />
              Agregar estándar
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FieldError errors={[errors.estandares?.root ?? errors.estandares]} />
            {estandares.fields.map((fila, indice) => {
              const error = errors.estandares?.[indice]
              const guardado = formulario.getValues(`estandares.${indice}.id`) !== '0'
              const numero = indice + 1
              return (
                <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field data-invalid={Boolean(error?.nombre)}>
                    <FieldLabel htmlFor={`estandar-nombre-${indice}`}>Nombre {numero}</FieldLabel>
                    <Input
                      id={`estandar-nombre-${indice}`}
                      aria-invalid={Boolean(error?.nombre)}
                      {...formulario.register(`estandares.${indice}.nombre`)}
                    />
                    <FieldError errors={[error?.nombre]} />
                  </Field>
                  <Field data-invalid={Boolean(error?.descripcion)}>
                    <FieldLabel htmlFor={`estandar-descripcion-${indice}`}>Descripción {numero}</FieldLabel>
                    <Input
                      id={`estandar-descripcion-${indice}`}
                      aria-invalid={Boolean(error?.descripcion)}
                      {...formulario.register(`estandares.${indice}.descripcion`)}
                    />
                    {guardado && <FieldDescription>{TEXTO_DESCRIPCION_SE_CONSERVA}</FieldDescription>}
                    <FieldError errors={[error?.descripcion]} />
                  </Field>
                  {guardado ? (
                    <p className="text-xs text-muted-foreground sm:mt-8">{TEXTO_ESTANDAR_NO_SE_QUITA}</p>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="sm:mt-6"
                      aria-label={`Quitar estándar ${numero}`}
                      onClick={() => estandares.remove(indice)}
                    >
                      <X aria-hidden />
                    </Button>
                  )}
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
            {guardar.isPending ? 'Guardando…' : 'Guardar estándares'}
          </Button>
        </div>
      </form>
    </>
  )
}
