import { config } from '@/lib/config'

export const CLAVE_REFRESH = 'sigeda.refresh'

let tokenDeAcceso: string | null = null
let renovacionEnCurso: Promise<string | null> | null = null
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

async function pedirRenovacion(): Promise<string | null> {
  const refresh = leerRefresh()
  if (!refresh) return null
  try {
    const respuesta = await fetch(`${config.sigedaApiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!respuesta.ok) return null
    const datos = (await respuesta.json()) as { accessToken?: unknown }
    if (typeof datos.accessToken !== 'string') return null
    tokenDeAcceso = datos.accessToken
    return tokenDeAcceso
  } catch {
    return null
  }
}

export function usernameDelToken(token: string): string | null {
  const carga = token.split('.')[1]
  if (!carga) return null
  try {
    const base64 = carga.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(carga.length / 4) * 4, '=')
    const datos = JSON.parse(atob(base64)) as { sub?: unknown }
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
  renovar(): Promise<string | null> {
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
