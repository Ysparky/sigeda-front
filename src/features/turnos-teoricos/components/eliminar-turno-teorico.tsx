import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { clavesTurnosTeoricos, eliminarTurnoTeorico } from '../api'

type Props = { id: number; nombre: string; alEliminar?: () => void; deshabilitado?: boolean }

export function EliminarTurnoTeorico({ id, nombre, alEliminar, deshabilitado = false }: Props) {
  const queryClient = useQueryClient()

  const eliminar = useMutation({
    mutationFn: () => eliminarTurnoTeorico(id),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesTurnosTeoricos.todo })
      alEliminar?.()
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  return (
    <ConfirmDialog
      disparador={
        <Button
          variant="destructive"
          size="sm"
          disabled={deshabilitado || eliminar.isPending}
          aria-label={`Eliminar ${nombre}`}
        >
          <Trash2 aria-hidden />
          Eliminar
        </Button>
      }
      titulo="¿Eliminar el turno teórico?"
      descripcion={`Se eliminará «${nombre}» y sus preguntas. Esta acción no se puede deshacer.`}
      confirmar="Eliminar"
      destructivo
      alConfirmar={() => eliminar.mutate()}
    />
  )
}
