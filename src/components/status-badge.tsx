import { Badge } from '@/components/ui/badge'
import { CLASES_TONO } from '@/lib/dominio/tonos'
import { termino, type Vocabulario } from '@/lib/dominio/vocabulario'
import { cn } from '@/lib/utils'

type Props = { vocabulario: Vocabulario; valor: string; className?: string }

export function StatusBadge({ vocabulario, valor, className }: Props) {
  const { etiqueta, tono, descripcion } = termino(vocabulario, valor)
  return (
    <Badge variant="outline" data-tono={tono} className={cn(CLASES_TONO[tono], className)}>
      {etiqueta}
      {descripcion && <span className="sr-only"> ({descripcion})</span>}
    </Badge>
  )
}
