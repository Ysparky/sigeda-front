import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Props = {
  disparador: ReactNode
  titulo: string
  descripcion: string
  confirmar: string
  destructivo?: boolean
  alConfirmar: () => void
}

export function ConfirmDialog({ disparador, titulo, descripcion, confirmar, destructivo = false, alConfirmar }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{disparador}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={destructivo ? 'destructive' : 'default'} onClick={alConfirmar}>
            {confirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
