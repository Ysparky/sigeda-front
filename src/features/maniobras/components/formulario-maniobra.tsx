import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { clavesFases, consultasFases, type FaseConSubfases } from '@/features/fases/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import {
  MENSAJE_MANIOBRA_MODIFICADA,
  MENSAJE_MANIOBRA_REGISTRADA,
  TEXTO_DESCRIPCION_SE_CONSERVA,
} from '@/lib/dominio/programa'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesManiobras, crearManiobra, modificarManiobra, type ManiobraDetalle } from '../api'
import { esquemaManiobra, MANIOBRA_VACIA, type ValoresManiobra } from '../schemas'

type Props = { maniobra?: ManiobraDetalle }

export function FormularioManiobra({ maniobra }: Props) {
  const fases = useQuery(consultasFases.conSubfases())
  const error = errorDePrimeraCarga(fases)

  if (error !== null) return <AvisoDeError error={error} alReintentar={() => void fases.refetch()} />
  if (!fases.isSuccess) return <p className="text-sm text-muted-foreground">Cargando las subfases…</p>
  return <FormularioConSubfases maniobra={maniobra} fases={fases.data} />
}

function FormularioConSubfases({ maniobra, fases }: Props & { fases: FaseConSubfases[] }) {
  const modificando = maniobra !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales: ValoresManiobra = maniobra
    ? {
        nombre: maniobra.nombre,
        descripcion: maniobra.descripcion ?? '',
        subfases: (maniobra.subfases ?? []).map((subfase) => String(subfase.id)),
      }
    : MANIOBRA_VACIA
  const formulario = useForm<ValoresManiobra>({ resolver: zodResolver(esquemaManiobra), defaultValues: iniciales })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresManiobra) => {
      const cuerpo = {
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion.trim(),
        subfases: valores.subfases.map((id) => ({ idSubfase: Number(id) })),
      }
      return maniobra ? modificarManiobra(maniobra.id, cuerpo) : crearManiobra(cuerpo)
    },
    onSuccess: async (id) => {
      toast.success(modificando ? MENSAJE_MANIOBRA_MODIFICADA : MENSAJE_MANIOBRA_REGISTRADA)
      await queryClient.invalidateQueries({ queryKey: clavesManiobras.todo })
      await queryClient.invalidateQueries({ queryKey: clavesFases.todo })
      await navegar({ to: '/programa/maniobras/$id', params: { id: String(id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError, {}, ['subfases'])
    },
  })

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar la maniobra</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos de la maniobra</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="maniobra-nombre">Nombre</FieldLabel>
              <Input id="maniobra-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldDescription>De 3 a 35 caracteres.</FieldDescription>
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.descripcion)}>
              <FieldLabel htmlFor="maniobra-descripcion">Descripción</FieldLabel>
              <Textarea
                id="maniobra-descripcion"
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
        <CardHeader>
          <CardTitle>
            <h2>Subfases</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Controller
            control={formulario.control}
            name="subfases"
            render={({ field }) => (
              <div role="group" aria-label="Subfases de la maniobra" className="grid gap-4">
                {fases.map((grupo) => (
                  <div key={grupo.fase.id} className="grid gap-2">
                    <p className="text-sm font-medium">{grupo.fase.nombre}</p>
                    {grupo.subfases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">La fase no tiene subfases.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {grupo.subfases.map((subfase) => (
                          <div key={subfase.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`subfase-${subfase.id}`}
                              checked={field.value.includes(String(subfase.id))}
                              onCheckedChange={(marcado) =>
                                field.onChange(
                                  marcado === true
                                    ? [...field.value, String(subfase.id)]
                                    : field.value.filter((id) => id !== String(subfase.id)),
                                )
                              }
                            />
                            <Label htmlFor={`subfase-${subfase.id}`} className="font-normal">
                              {subfase.nombre}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          />
          <FieldError errors={[errors.subfases?.root ?? errors.subfases]} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/programa/maniobras/$id" params={{ id: String(maniobra.id) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/programa/maniobras">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar maniobra'}
        </Button>
      </div>
    </form>
  )
}
