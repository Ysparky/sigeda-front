import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, X } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import {
  MENSAJE_FASE_MODIFICADA,
  MENSAJE_FASE_REGISTRADA,
  TEXTO_DESCRIPCION_SE_CONSERVA,
  TEXTO_SUBFASE_NO_SE_QUITA,
} from '@/lib/dominio/programa'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesFases, crearFase, modificarFase, type FaseDetalle } from '../api'
import { esquemaFase, FASE_VACIA, type ValoresFase } from '../schemas'

type Props = { fase?: FaseDetalle }

export function FormularioFase({ fase }: Props) {
  const modificando = fase !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales: ValoresFase = fase
    ? {
        nombre: fase.nombre,
        descripcion: fase.descripcion ?? '',
        subfases: fase.subfases.map((subfase) => ({
          id: String(subfase.id),
          nombre: subfase.nombre,
          descripcion: subfase.descripcion ?? '',
        })),
      }
    : FASE_VACIA
  const formulario = useForm<ValoresFase>({ resolver: zodResolver(esquemaFase), defaultValues: iniciales })
  const { errors } = formulario.formState
  const subfases = useFieldArray({ control: formulario.control, name: 'subfases' })

  const guardar = useMutation({
    mutationFn: (valores: ValoresFase) => {
      const cuerpo = {
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion.trim(),
        subfases: valores.subfases.map((subfase) => ({
          id: Number(subfase.id),
          nombre: subfase.nombre.trim(),
          descripcion: subfase.descripcion.trim(),
        })),
      }
      return fase ? modificarFase(fase.id, cuerpo) : crearFase(cuerpo)
    },
    onSuccess: async (id) => {
      toast.success(modificando ? MENSAJE_FASE_MODIFICADA : MENSAJE_FASE_REGISTRADA)
      await queryClient.invalidateQueries({ queryKey: clavesFases.todo })
      await navegar({ to: '/programa/fases/$id', params: { id: String(id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar la fase</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos de la fase</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="fase-nombre">Nombre</FieldLabel>
              <Input id="fase-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 3 a 35 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.descripcion)}>
              <FieldLabel htmlFor="fase-descripcion">Descripción</FieldLabel>
              <Textarea
                id="fase-descripcion"
                aria-invalid={Boolean(errors.descripcion)}
                {...formulario.register('descripcion')}
              />
              {modificando && <FieldDescription>{TEXTO_DESCRIPCION_SE_CONSERVA}</FieldDescription>}
              <FieldError errors={[errors.descripcion]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <h2>Subfases</h2>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => subfases.append({ id: '0', nombre: '', descripcion: '' })}
          >
            <Plus aria-hidden />
            Agregar subfase
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {subfases.fields.map((fila, indice) => {
            const error = errors.subfases?.[indice]
            const guardada = formulario.getValues(`subfases.${indice}.id`) !== '0'
            const numero = indice + 1
            return (
              <div key={fila.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Field data-invalid={Boolean(error?.nombre)}>
                  <FieldLabel htmlFor={`subfase-nombre-${indice}`}>Nombre {numero}</FieldLabel>
                  <Input
                    id={`subfase-nombre-${indice}`}
                    aria-invalid={Boolean(error?.nombre)}
                    {...formulario.register(`subfases.${indice}.nombre`)}
                  />
                  <FieldError errors={[error?.nombre]} />
                </Field>
                <Field data-invalid={Boolean(error?.descripcion)}>
                  <FieldLabel htmlFor={`subfase-descripcion-${indice}`}>Descripción {numero}</FieldLabel>
                  <Input
                    id={`subfase-descripcion-${indice}`}
                    aria-invalid={Boolean(error?.descripcion)}
                    {...formulario.register(`subfases.${indice}.descripcion`)}
                  />
                  {guardada && <FieldDescription>{TEXTO_DESCRIPCION_SE_CONSERVA}</FieldDescription>}
                  <FieldError errors={[error?.descripcion]} />
                </Field>
                {guardada ? (
                  <p className="text-xs text-muted-foreground sm:mt-8">{TEXTO_SUBFASE_NO_SE_QUITA}</p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="sm:mt-6"
                    aria-label={`Quitar subfase ${numero}`}
                    onClick={() => subfases.remove(indice)}
                  >
                    <X aria-hidden />
                  </Button>
                )}
              </div>
            )
          })}
          <FieldError errors={[errors.subfases?.root ?? errors.subfases]} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/programa/fases/$id" params={{ id: String(fase.id) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/programa/fases">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar fase'}
        </Button>
      </div>
    </form>
  )
}
