import type { EstadoMatricula } from './api'

export const ETIQUETA_ESTADO: Record<EstadoMatricula, { texto: string; variante: 'secondary' | 'default' | 'destructive' }> =
  {
    PENDIENTE: { texto: 'Pendiente', variante: 'secondary' },
    OBSERVADA: { texto: 'Observada', variante: 'secondary' },
    VALIDADA: { texto: 'Validada', variante: 'default' },
    CITADA: { texto: 'Citada', variante: 'default' },
    ADMITIDA: { texto: 'Admitida', variante: 'default' },
    NO_ADMITIDO: { texto: 'No admitido', variante: 'destructive' },
    RECHAZADA: { texto: 'Rechazada', variante: 'destructive' },
  }
