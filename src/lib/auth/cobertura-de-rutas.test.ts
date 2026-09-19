import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { crearRouter } from '@/router'
import { PANTALLAS, pantallaPorRuta } from './pantallas'

const fuentes = import.meta.glob<string>('/src/routes/_app/**/*.tsx', { query: '?raw', import: 'default', eager: true })

function rutaDeArchivo(archivo: string) {
  const ruta = archivo.replace('/src/routes/_app', '').replace(/\.tsx$/, '').replace(/\/?index$/, '')
  return ruta === '' ? '/' : ruta
}

function rutaDeCoincidencia(fullPath: string) {
  return fullPath.length > 1 ? fullPath.replace(/\/$/, '') : fullPath
}

describe('cobertura de guardas', () => {
  it('cada ruta dentro de /_app tiene su pantalla registrada', () => {
    const router = crearRouter(new QueryClient())
    const rutas = Object.values(router.routesById)
      .filter((ruta) => ruta.id.startsWith('/_app/'))
      .map((ruta) => rutaDeCoincidencia(ruta.fullPath))
    expect(rutas.length).toBeGreaterThan(10)
    expect(rutas.filter((ruta) => pantallaPorRuta(ruta) === undefined)).toEqual([])
  })

  it('cada archivo de ruta exige la pantalla que le corresponde', () => {
    const archivos = Object.entries(fuentes)
    expect(archivos.length).toBeGreaterThan(10)
    const sinGuarda = archivos.flatMap(([archivo, fuente]) => {
      const clave = /exigirPantalla\(PANTALLAS\.(\w+)/.exec(fuente)?.[1]
      const pantalla = clave ? (PANTALLAS as Record<string, { ruta: string }>)[clave] : undefined
      return pantalla?.ruta === rutaDeArchivo(archivo) ? [] : [archivo]
    })
    expect(sinGuarda).toEqual([])
  })
})
