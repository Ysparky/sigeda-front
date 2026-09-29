import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { iniciarComo } from '@/test/render'
import { modificarFase, obtenerFase } from './api'

describe('api de fases', () => {
  it('un PUT rechazado por una subfase en uso no guarda ningún cambio', async () => {
    await iniciarComo('comandante.aguirre')
    const original = await obtenerFase(1)
    await expect(
      modificarFase(1, {
        nombre: 'Adaptación Renombrada',
        descripcion: 'Descripción de fase modificada',
        subfases: [
          { id: 1, nombre: 'Control Básico', descripcion: 'Descripción de Control Básico modificada' },
          { id: 2, nombre: 'Circuitos y Maniobras', descripcion: 'Circuito de tránsito y maniobras normales' },
          { id: 4, nombre: 'Navegación Local', descripcion: 'Navegación en las cercanías de la base' },
          { id: 5, nombre: 'Navegación en Ruta', descripcion: 'Navegación entre puntos con plan de vuelo' },
        ],
      }),
    ).rejects.toBeInstanceOf(ApiError)
    await expect(obtenerFase(1)).resolves.toEqual(original)
  })
})
