import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesSimuladores, crearSimulador, modificarSimulador, type Simulador } from './api'
import { aCuerpoSimulador, esquemaSimulador, SIMULADOR_VACIO, type ValoresSimulador } from './schemas'

export function FormularioSimulador({ simulador }: { simulador?: Simulador }) {
  const modificando = simulador !== undefined
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const iniciales: ValoresSimulador = simulador
    ? {
        nombre: simulador.nombre,
        tipo: simulador.tipo,
        descripcion: simulador.descripcion ?? '',
        ubicacion: simulador.ubicacion ?? '',
        activo: simulador.activo,
      }
    : SIMULADOR_VACIO
  const formulario = useForm<ValoresSimulador>({ resolver: zodResolver(esquemaSimulador), defaultValues: iniciales })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresSimulador) =>
      simulador ? modificarSimulador(simulador.id, aCuerpoSimulador(valores)) : crearSimulador(aCuerpoSimulador(valores)),
    onSuccess: async (guardado) => {
      toast.success(modificando ? 'Simulador actualizado.' : 'Simulador registrado.')
      await queryClient.invalidateQueries({ queryKey: clavesSimuladores.todo })
      await navegar({ to: '/simuladores/$id', params: { id: String(guardado.id) } })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  return (
    <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))} className="grid gap-6">
      {guardar.error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el simulador</AlertTitle>
          <AlertDescription>
            {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Datos del simulador</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field data-invalid={Boolean(errors.nombre)}>
            <FieldLabel htmlFor="sim-nombre">Nombre</FieldLabel>
            <Input id="sim-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
            <FieldError errors={[errors.nombre]} />
          </Field>
          <Field data-invalid={Boolean(errors.tipo)}>
            <FieldLabel htmlFor="sim-tipo">Tipo</FieldLabel>
            <NativeSelect id="sim-tipo" aria-invalid={Boolean(errors.tipo)} {...formulario.register('tipo')}>
              <NativeSelectOption value="FNPT">FNPT — Entrenador de procedimientos</NativeSelectOption>
              <NativeSelectOption value="FTD">FTD — Dispositivo de entrenamiento</NativeSelectOption>
              <NativeSelectOption value="FFS">FFS — Simulador completo</NativeSelectOption>
            </NativeSelect>
            <FieldError errors={[errors.tipo]} />
          </Field>
          <Field data-invalid={Boolean(errors.ubicacion)}>
            <FieldLabel htmlFor="sim-ubicacion">Ubicación</FieldLabel>
            <Input id="sim-ubicacion" aria-invalid={Boolean(errors.ubicacion)} {...formulario.register('ubicacion')} />
            <FieldError errors={[errors.ubicacion]} />
          </Field>
          <Field data-invalid={Boolean(errors.descripcion)}>
            <FieldLabel htmlFor="sim-descripcion">Descripción</FieldLabel>
            <Textarea
              id="sim-descripcion"
              aria-invalid={Boolean(errors.descripcion)}
              {...formulario.register('descripcion')}
            />
            <FieldError errors={[errors.descripcion]} />
          </Field>
          <div className="flex items-center gap-2">
            <Controller
              control={formulario.control}
              name="activo"
              render={({ field }) => (
                <Checkbox id="sim-activo" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              )}
            />
            <FieldLabel htmlFor="sim-activo">Activo</FieldLabel>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          {modificando ? (
            <Link to="/simuladores/$id" params={{ id: String(simulador.id) }}>
              Cancelar
            </Link>
          ) : (
            <Link to="/simuladores">Cancelar</Link>
          )}
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
