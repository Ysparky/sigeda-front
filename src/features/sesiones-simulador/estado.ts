import type { EstadoSesion, ResumenSesion } from './api'

export const ETIQUETA_ESTADO_SESION: Record<
  EstadoSesion,
  { texto: string; variante: 'secondary' | 'default' | 'destructive' | 'outline' }
> = {
  PLANIFICADA: { texto: 'Planificada', variante: 'secondary' },
  EN_CURSO: { texto: 'En curso', variante: 'default' },
  COMPLETADA: { texto: 'Completada', variante: 'outline' },
  CANCELADA: { texto: 'Cancelada', variante: 'destructive' },
}

export const ETIQUETA_RESUMEN: Record<ResumenSesion, { texto: string; variante: 'default' | 'destructive' }> = {
  COMPETENTE: { texto: 'Competente', variante: 'default' },
  NO_COMPETENTE: { texto: 'No competente', variante: 'destructive' },
}
