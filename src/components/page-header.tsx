import type { ReactNode } from 'react'

type Props = { titulo: string; descripcion?: string; acciones?: ReactNode }

export function PageHeader({ titulo, descripcion, acciones }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid min-w-0 gap-1.5">
        <h1 className="font-heading text-3xl leading-none font-bold tracking-wide uppercase md:text-4xl">{titulo}</h1>
        {descripcion && <p className="text-[15px] text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}
