import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { TEXTO_PREGUNTA_EN_USO } from '@/lib/dominio/teoria'
import { clavesMaterias } from '@/features/materias/api'
import { clavesPreguntas, eliminarPregunta, type PreguntaFila } from '../api'

type Props = { pregunta: PreguntaFila; deshabilitado?: boolean }

export function EliminarPregunta({ pregunta, deshabilitado = false }: Props) {
  const queryClient = useQueryClient()
  const etiqueta = `Eliminar la pregunta ${pregunta.id}`

  const eliminar = useMutation({
    mutationFn: () => eliminarPregunta(pregunta.id),
    onSuccess: async (mensaje) => {
      toast.success(mensaje)
      await queryClient.invalidateQueries({ queryKey: clavesPreguntas.todo })
      await queryClient.invalidateQueries({ queryKey: clavesMaterias.todo })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : MENSAJE_GENERICO),
  })

  if (pregunta.enUso) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="destructive" size="sm" disabled aria-label={etiqueta}>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
        <p className="text-xs text-muted-foreground">{TEXTO_PREGUNTA_EN_USO}</p>
      </div>
    )
  }

  return (
    <ConfirmDialog
      disparador={
        <Button variant="destructive" size="sm" disabled={deshabilitado || eliminar.isPending} aria-label={etiqueta}>
          <Trash2 aria-hidden />
          Eliminar
        </Button>
      }
      titulo="¿Eliminar la pregunta?"
      descripcion="Se eliminará la pregunta y sus alternativas. Esta acción no se puede deshacer."
      confirmar="Eliminar"
      destructivo
      alConfirmar={() => eliminar.mutate()}
    />
  )
}
