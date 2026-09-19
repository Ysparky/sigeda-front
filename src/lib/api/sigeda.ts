import { tokens } from '@/lib/auth/tokens'
import { config } from '@/lib/config'
import { crearCliente } from './http'

export const sigeda = crearCliente(config.sigedaApiUrl, {
  obtenerToken: () => tokens.acceso(),
  renovarToken: () => tokens.renovar(),
  alExpirar: () => tokens.expirar(),
})
