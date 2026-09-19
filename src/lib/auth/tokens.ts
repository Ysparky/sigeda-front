import type { ResultadoRenovacion } from '@/lib/api/http'
import { config } from '@/lib/config'

export const CLAVE_REFRESH = 'sigeda.refresh'

let tokenDeAcceso: string | null = null
let renovacionEnCurso: Promise<ResultadoRenovacion> | null = null
let oyenteDeExpiracion: () => void = () => undefined

function leerRefresh(): string | null {
  try {
    return localStorage.getItem(CLAVE_REFRESH)
  } catch {
    return null
  }
}

function escribirRefresh(valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(CLAVE_REFRESH)
    else localStorage.setItem(CLAVE_REFRESH, valor)
  } catch {
    return
  }
}

async function pedirRenovacion(): Promise<ResultadoRenovacion> {
  const refresh = leerRefresh()
  if (!refresh) return { estado: 'rechazado' }
  let respuesta: Response
  try {
    respuesta = await fetch(`${config.sigedaApiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
  } catch {
    return { estado: 'no-disponible' }
  }
  if (respuesta.status === 401 || respuesta.status === 403) return { estado: 'rechazado' }
  if (!respuesta.ok) return { estado: 'no-disponible' }
  let datos: { accessToken?: unknown }
  try {
    datos = (await respuesta.json()) as { accessToken?: unknown }
  } catch {
    return { estado: 'no-disponible' }
  }
  if (typeof datos.accessToken !== 'string') return { estado: 'rechazado' }
  tokenDeAcceso = datos.accessToken
  return { estado: 'renovado', token: tokenDeAcceso }
}

export function usernameDelToken(token: string): string | null {
  const carga = token.split('.')[1]
  if (!carga) return null
  try {
    const base64 = carga.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(carga.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0))
    const datos = JSON.parse(new TextDecoder().decode(bytes)) as { sub?: unknown }
    return typeof datos.sub === 'string' ? datos.sub : null
  } catch {
    return null
  }
}

export const tokens = {
  acceso: (): string | null => tokenDeAcceso,
  refresh: (): string | null => leerRefresh(),
  guardar(acceso: string, refresh: string) {
    tokenDeAcceso = acceso
    escribirRefresh(refresh)
  },
  limpiar() {
    tokenDeAcceso = null
    escribirRefresh(null)
  },
  renovar(): Promise<ResultadoRenovacion> {
    renovacionEnCurso ??= pedirRenovacion().finally(() => {
      renovacionEnCurso = null
    })
    return renovacionEnCurso
  },
  alExpirar(oyente: () => void) {
    oyenteDeExpiracion = oyente
  },
  expirar() {
    tokens.limpiar()
    oyenteDeExpiracion()
  },
}
