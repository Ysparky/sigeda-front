import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { SIN_TIPO, tiposCompatibles } from '@/lib/dominio/personas'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesPersonas, modificarPersona, type PersonaDetalle } from '../api'

export const TEXTO_SOLO_RANGO_Y_TIPO = 'El código, el DNI y los nombres no se pueden modificar; solo el rango y el tipo.'

const esquema = z.object({
  rango: z.string().trim().max(30, 'El rango no puede superar los 30 caracteres.'),
  tipo: z.string(),
})

type Formulario = z.infer<typeof esquema>

export function DialogoModificarPersona({ persona }: { persona: PersonaDetalle }) {
  const [abierto, setAbierto] = useState(false)
  const queryClient = useQueryClient()
  const formulario = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { rango: persona.rango ?? '', tipo: persona.tipo ?? '' },
  })
  const { errors } = formulario.formState
  const opciones = tiposCompatibles(persona.cuenta?.rol?.nombre ?? null)

  const guardar = useMutation({
    mutationFn: (datos: Formulario) =>
      modificarPersona(persona.codigo, {
        rango: datos.rango.trim() === '' ? null : datos.rango.trim(),
        tipo: datos.tipo === '' ? null : datos.tipo,
      }),
    onSuccess: async (mensaje) => {
      setAbierto(false)
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPersonas.todo })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente)
    if (siguiente) formulario.reset({ rango: persona.rango ?? '', tipo: persona.tipo ?? '' })
  }

  return (
    <Dialog open={abierto} onOpenChange={alAbrir}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil aria-hidden />
          Modificar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modificar persona</DialogTitle>
          <DialogDescription>{TEXTO_SOLO_RANGO_Y_TIPO}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={formulario.handleSubmit((datos) => guardar.mutate(datos))}>
          <FieldGroup>
            {guardar.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.rango)}>
              <FieldLabel htmlFor="persona-rango">Rango</FieldLabel>
              <Input id="persona-rango" aria-invalid={Boolean(errors.rango)} {...formulario.register('rango')} />
              <FieldError errors={[errors.rango]} />
            </Field>
            <Field data-invalid={Boolean(errors.tipo)}>
              <FieldLabel htmlFor="persona-tipo">Tipo</FieldLabel>
              <NativeSelect id="persona-tipo" className="w-full" {...formulario.register('tipo')}>
                {opciones.map((opcion) => (
                  <NativeSelectOption key={opcion ?? 'sin-tipo'} value={opcion ?? ''}>
                    {opcion ?? SIN_TIPO}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>{TEXTO_SOLO_RANGO_Y_TIPO}</FieldDescription>
              <FieldError errors={[errors.tipo]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar persona'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
