import type { Tono } from './vocabulario'

export const CLASES_TONO: Record<Tono, string> = {
  neutro: 'border-tono-neutro/40 bg-tono-neutro/10 text-tono-neutro-texto',
  info: 'border-tono-info/40 bg-tono-info/10 text-tono-info-texto',
  exito: 'border-tono-exito/40 bg-tono-exito/10 text-tono-exito-texto',
  aviso: 'border-tono-aviso/50 bg-tono-aviso/15 text-tono-aviso-texto',
  alerta: 'border-tono-alerta/40 bg-tono-alerta/15 text-tono-alerta-texto',
  peligro: 'border-tono-peligro/40 bg-tono-peligro/10 text-tono-peligro-texto',
  violeta: 'border-tono-violeta/40 bg-tono-violeta/10 text-tono-violeta-texto',
}

export const CLASES_ETIQUETA_DEBRIEFING = {
  observacion: 'text-tono-peligro-texto',
  causa: 'text-tono-info-texto',
  recomendacion: '',
} as const
