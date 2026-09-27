import { z } from 'zod'

import { ApiError } from './errors'

export type Pagina<T> = { items: T[]; page: number; size: number; total: number; totalPages: number }

export type PaginaSpring<T> = {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

/**
 * MEDICIÓN, NO ADORNO: `sigeda.get<T>` es un genérico sin validación en tiempo de ejecución —el
 * cliente hace `return datos as T`—, así que si el servidor manda otra forma nadie se entera y el
 * valor llega `undefined`. Esa clase de defecto ya golpeó tres veces en este proyecto, y las tres
 * cayeron en rutas sin validar.
 *
 * Éste es el envoltorio de página, y se valida UNA vez acá porque cubre las 20 llamadas que pasan por
 * `sigeda.pagina` de un solo tiro. Se exige que `content` sea un arreglo, que es el fallo que
 * realmente rompe la pantalla (`items` `undefined` y un `.map()` que estalla), y los cinco números se
 * toleran ausentes porque varios overrides de prueba arman el envoltorio a mano y sólo les importa el
 * contenido. Los ITEMS no se validan acá a propósito: su forma es distinta en cada ruta, y un esquema
 * ingenuo rompería hoy mismo —por ejemplo `promedio` se declara `number` y el servidor manda `"14.0"`
 * como texto—.
 */
const esquemaEnvoltorio = z.object({
  content: z.array(z.unknown()),
  number: z.coerce.number().catch(0),
  size: z.coerce.number().catch(0),
  totalElements: z.coerce.number().catch(0),
  totalPages: z.coerce.number().catch(0),
})

export function validarEnvoltorio<T>(ruta: string, datos: unknown): PaginaSpring<T> {
  const resultado = esquemaEnvoltorio.safeParse(datos)
  if (!resultado.success) {
    throw new ApiError(
      0,
      `El servidor devolvió algo que no es una página en ${ruta}: ${resultado.error.issues.map((i) => `${i.path.join('.') || '(raíz)'} ${i.message}`).join('; ')}`,
    )
  }
  return { ...resultado.data, content: resultado.data.content as T[] }
}

export function aPagina<T>(pagina: PaginaSpring<T>): Pagina<T> {
  return {
    items: pagina.content,
    page: pagina.number,
    size: pagina.size,
    total: pagina.totalElements,
    totalPages: pagina.totalPages,
  }
}

export function paginaVacia<T>(page = 0, size = 0): Pagina<T> {
  return { items: [], page, size, total: 0, totalPages: 0 }
}

export type DireccionOrden = 'ASC' | 'DESC'

export type ParametrosPagina = { page: number; size: number; property?: string; direction: DireccionOrden }

export async function todasLasPaginas<T>(
  traer: (parametros: { page: number; size: number }) => Promise<Pagina<T>>,
  size: number,
): Promise<T[]> {
  const primera = await traer({ page: 0, size })
  const restantes = await Promise.all(
    Array.from({ length: Math.max(primera.totalPages - 1, 0) }, (_, indice) => traer({ page: indice + 1, size })),
  )
  return [primera, ...restantes].flatMap((pagina) => pagina.items)
}
