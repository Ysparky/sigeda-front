import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { clavesPersonas, eliminarPersona, nombreCompletoDePersona, type PersonaDetalle } from '../api'

export function EliminarPersona({ persona }: { persona: PersonaDetalle }) {
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const disponible = accionDisponible('eliminarPersona')
  const eliminar = useMutation({
    mutationFn: () => eliminarPersona(persona.codigo),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPersonas.todo })
      await navegar({ to: '/personas' })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  if (!disponible) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="destructive" disabled>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }

  return (
    <ConfirmDialog
      disparador={
        <Button variant="destructive" disabled={eliminar.isPending}>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
      }
      titulo="¿Eliminar la persona?"
      descripcion={`Se eliminará a ${nombreCompletoDePersona(persona)} y su cuenta de acceso. Esta acción no se puede deshacer.`}
      confirmar="Eliminar"
      destructivo
      alConfirmar={() => eliminar.mutate()}
    />
  )
}
