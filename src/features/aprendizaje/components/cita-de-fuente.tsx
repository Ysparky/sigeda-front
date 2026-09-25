import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { porcentajeDeSimilitud } from '@/lib/dominio/aprendizaje'
import type { Fuente } from '../api'

export function CitaDeFuente({ etiqueta, fuente }: { etiqueta: string; fuente: Fuente }) {
  const porcentaje = porcentajeDeSimilitud(fuente.similarity)
  const sinContenido = fuente.documentFilename === null && fuente.excerpt === null

  if (sinContenido) {
    return <span className="rounded bg-muted px-1 tabular-nums">{etiqueta}</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-5 px-1 tabular-nums">
          {etiqueta}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>{fuente.documentFilename ?? 'Documento no disponible'}</PopoverTitle>
          {porcentaje !== null && <PopoverDescription>Similitud {porcentaje}</PopoverDescription>}
        </PopoverHeader>
        <PopoverDescription>{fuente.excerpt ?? 'El fragmento ya no está disponible.'}</PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
