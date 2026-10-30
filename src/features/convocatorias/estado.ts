import type { EstadoConvocatoria } from './api'

export const ETIQUETA_ESTADO_CONVOCATORIA: Record<
  EstadoConvocatoria,
  { texto: string; variante: 'secondary' | 'default' | 'destructive' }
> = {
  BORRADOR: { texto: 'Borrador', variante: 'secondary' },
  PUBLICADA: { texto: 'Publicada', variante: 'default' },
  CERRADA: { texto: 'Cerrada', variante: 'secondary' },
  FINALIZADA: { texto: 'Finalizada', variante: 'destructive' },
}
