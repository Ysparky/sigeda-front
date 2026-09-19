import { Circle, CircleCheck } from 'lucide-react'
import type { EtapaMision } from '@/lib/dominio/briefing'
import { cn } from '@/lib/utils'

export function LineaDeTiempo({ etapas }: { etapas: EtapaMision[] }) {
  return (
    <ol aria-label="Ciclo de la misión" className="grid gap-3 sm:grid-cols-4">
      {etapas.map((etapa) => (
        <li key={etapa.clave} data-hecha={etapa.hecha} className="flex items-start gap-2">
          {etapa.hecha ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-tono-exito" aria-hidden />
          ) : (
            <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="grid gap-0.5">
            <p className={cn('text-sm font-medium', !etapa.hecha && 'text-muted-foreground')}>{etapa.titulo}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{etapa.detalle}</p>
            <span className="sr-only">{etapa.hecha ? 'Completada' : 'Pendiente'}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
