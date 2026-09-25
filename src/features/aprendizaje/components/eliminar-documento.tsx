import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { MENSAJE_GENERICO } from '@/lib/api/errors'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { MENSAJE_DOCUMENTO_ELIMINADO, TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO } from '@/lib/dominio/aprendizaje'
import { clavesAprendizaje, eliminarDocumento, type Documento } from '../api'
import { mensajeDeError } from '../mensajes'

export function EliminarDocumento({ documento }: { documento: Documento }) {
  const queryClient = useQueryClient()
  const disponible = accionDisponible('eliminarDocumento')

  const eliminar = useMutation({
    mutationFn: () => eliminarDocumento(documento.id),
    onSuccess: async () => {
      toast.success(MENSAJE_DOCUMENTO_ELIMINADO)
      await queryClient.invalidateQueries({ queryKey: clavesAprendizaje.todo })
    },
    onError: (error) => toast.error(mensajeDeError(error, MENSAJE_GENERICO)),
  })

  if (!disponible) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="destructive" size="sm" disabled>
          <Trash2 aria-hidden />
          Eliminar {documento.filename}
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }

  return (
    <ConfirmDialog
      disparador={
        <Button variant="destructive" size="sm" disabled={eliminar.isPending}>
          <Trash2 aria-hidden />
          Eliminar {documento.filename}
        </Button>
      }
      titulo="¿Eliminar el documento?"
      descripcion={TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO}
      confirmar="Eliminar"
      destructivo
      alConfirmar={() => eliminar.mutate()}
    />
  )
}
