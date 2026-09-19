import { tokens } from '@/lib/auth/tokens'
import { config } from '@/lib/config'
import { crearCliente } from './http'

export const ia = crearCliente(config.iaApiUrl, {
  obtenerToken: () => tokens.acceso(),
  renovarToken: () => tokens.renovar(),
  alExpirar: () => tokens.expirar(),
})
