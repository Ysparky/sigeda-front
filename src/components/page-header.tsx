import type { ReactNode } from 'react'

type Props = { titulo: string; descripcion?: string; acciones?: ReactNode }

export function PageHeader({ titulo, descripcion, acciones }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  )
}
