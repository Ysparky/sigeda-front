import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { AvisoDeError } from '@/components/aviso-de-error'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { asignarRol, consultasCuentas } from '@/features/cuentas/api'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { rolesCompatibles } from '@/lib/dominio/personas'
import { errorDePrimeraCarga } from '@/lib/query'
import { clavesPersonas, type PersonaDetalle } from '../api'

const esquema = z.object({ idRol: z.string().min(1, 'Elija un rol.') })

type Formulario = z.infer<typeof esquema>

type Props = { persona: PersonaDetalle; idUsuario: number }

export function DialogoAsignarRol({ persona, idUsuario }: Props) {
  const [abierto, setAbierto] = useState(false)
  const queryClient = useQueryClient()
  const roles = useQuery({ ...consultasCuentas.roles(), enabled: abierto })
  const errorDeRoles = errorDePrimeraCarga(roles)
  const compatibles = (roles.data ?? []).filter((rol) => rolesCompatibles(persona.tipo).includes(rol.nombre))
  const iniciales: Formulario = { idRol: persona.cuenta?.rol ? String(persona.cuenta.rol.id) : '' }
  const formulario = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: iniciales })
  const { errors } = formulario.formState

  const guardar = useMutation({
    mutationFn: (datos: Formulario) => asignarRol(idUsuario, Number(datos.idRol)),
    onSuccess: async (mensaje) => {
      setAbierto(false)
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPersonas.todo })
    },
  })

  function alAbrir(siguiente: boolean) {
    setAbierto(siguiente)
    if (siguiente) formulario.reset(iniciales)
  }

  return (
    <Dialog open={abierto} onOpenChange={alAbrir}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldCheck aria-hidden />
          Asignar rol
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar rol</DialogTitle>
          <DialogDescription>Solo se ofrecen los roles compatibles con el tipo de la persona.</DialogDescription>
        </DialogHeader>
        {errorDeRoles !== null ? (
          <AvisoDeError error={errorDeRoles} alReintentar={() => void roles.refetch()} />
        ) : !roles.isSuccess ? (
          <Skeleton className="h-10 w-full" aria-busy="true" />
        ) : (
          <form noValidate onSubmit={formulario.handleSubmit((datos) => guardar.mutate(datos))}>
            <FieldGroup>
              {guardar.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {guardar.error instanceof ApiError ? guardar.error.message : MENSAJE_GENERICO}
                  </AlertDescription>
                </Alert>
              )}
              <Field data-invalid={Boolean(errors.idRol)}>
                <FieldLabel htmlFor="cuenta-rol">Rol</FieldLabel>
                <NativeSelect
                  id="cuenta-rol"
                  className="w-full"
                  aria-invalid={Boolean(errors.idRol)}
                  {...formulario.register('idRol')}
                >
                  <NativeSelectOption value="">Elija un rol</NativeSelectOption>
                  {compatibles.map((rol) => (
                    <NativeSelectOption key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.idRol]} />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : 'Guardar rol'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
