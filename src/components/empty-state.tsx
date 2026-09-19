import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = { titulo: string; descripcion?: string; icono?: LucideIcon; accion?: ReactNode }

export function EmptyState({ titulo, descripcion, icono: Icono = Inbox, accion }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <Icono className="size-8 text-muted-foreground" aria-hidden />
      <div className="grid gap-1">
        <p className="font-medium">{titulo}</p>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}
