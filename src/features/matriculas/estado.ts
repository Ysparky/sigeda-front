import type { EstadoMatricula } from './api'

export const ETIQUETA_ESTADO: Record<EstadoMatricula, { texto: string; variante: 'secondary' | 'default' | 'destructive' }> =
  {
    PENDIENTE: { texto: 'Pendiente', variante: 'secondary' },
    OBSERVADA: { texto: 'Observada', variante: 'secondary' },
    VALIDADA: { texto: 'Validada', variante: 'default' },
    RECHAZADA: { texto: 'Rechazada', variante: 'destructive' },
    NO_ADMITIDO: { texto: 'No admitido', variante: 'destructive' },
  }
