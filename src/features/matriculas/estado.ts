import type { EstadoMatricula } from './api'

export const ETIQUETA_ESTADO: Record<EstadoMatricula, { texto: string; variante: 'secondary' | 'default' | 'destructive' }> =
  {
    PENDIENTE: { texto: 'Pendiente', variante: 'secondary' },
    VALIDADA: { texto: 'Validada', variante: 'default' },
    RECHAZADA: { texto: 'Rechazada', variante: 'destructive' },
  }
