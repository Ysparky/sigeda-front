import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { aplicarErroresDeCampo } from '@/lib/formularios'
import { clavesMaterias, crearMateria, modificarMateria, PARTES_CURSO, type Materia } from '../api'
import { esquemaMateria, MATERIA_VACIA, type ValoresMateria } from '../schemas'

type Props = { materia?: Materia; disparador: React.ReactNode }

export function DialogoMateria({ materia, disparador }: Props) {
  const [abierto, setAbierto] = useState(false)
  const queryClient = useQueryClient()
  const iniciales: ValoresMateria = materia
    ? {
        nombre: materia.nombre,
        notaMinima: String(materia.notaMinima),
        coeficiente: String(materia.coeficiente),
        parte: materia.parte,
      }
    : MATERIA_VACIA
  const formulario = useForm<ValoresMateria>({ resolver: zodResolver(esquemaMateria), defaultValues: iniciales })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (valores: ValoresMateria) => {
      const cuerpo = {
        nombre: valores.nombre.trim(),
        notaMinima: Number(valores.notaMinima),
        coeficiente: Number(valores.coeficiente),
        parte: valores.parte,
      }
      return materia ? modificarMateria(materia.id, cuerpo) : crearMateria(cuerpo)
    },
    onSuccess: async (mensaje) => {
      setAbierto(false)
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesMaterias.todo })
    },
    onError: (error) => {
      if (error instanceof ApiError) aplicarErroresDeCampo(error, formulario.setError)
    },
  })

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente)
    if (siguiente) formulario.reset(iniciales)
  }

  return (
    <Dialog open={abierto} onOpenChange={alAbrir}>
      <DialogTrigger asChild>{disparador}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{materia ? 'Modificar materia' : 'Registrar materia'}</DialogTitle>
          <DialogDescription>Nota mínima, coeficiente y parte del curso en tierra.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={formulario.handleSubmit((valores) => guardar.mutate(valores))}>
          <FieldGroup>
            {guardar.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="materia-nombre">Nombre</FieldLabel>
              <Input id="materia-nombre" aria-invalid={Boolean(errors.nombre)} {...formulario.register('nombre')} />
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={Boolean(errors.notaMinima)}>
              <FieldLabel htmlFor="materia-nota">Nota mínima</FieldLabel>
              <Input
                id="materia-nota"
                inputMode="numeric"
                aria-invalid={Boolean(errors.notaMinima)}
                {...formulario.register('notaMinima')}
              />
              <FieldError errors={[errors.notaMinima]} />
            </Field>
            <Field data-invalid={Boolean(errors.coeficiente)}>
              <FieldLabel htmlFor="materia-coeficiente">Coeficiente</FieldLabel>
              <Input
                id="materia-coeficiente"
                inputMode="decimal"
                aria-invalid={Boolean(errors.coeficiente)}
                {...formulario.register('coeficiente')}
              />
              <FieldError errors={[errors.coeficiente]} />
            </Field>
            <Field data-invalid={Boolean(errors.parte)}>
              <FieldLabel htmlFor="materia-parte">Parte del curso</FieldLabel>
              <NativeSelect id="materia-parte" className="w-full" {...formulario.register('parte')}>
                {PARTES_CURSO.map((parte) => (
                  <NativeSelectOption key={parte.valor} value={parte.valor}>
                    {parte.etiqueta}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.parte]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar materia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
