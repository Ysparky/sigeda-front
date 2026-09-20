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
          { id: 1, nombre: 'Contacto', descripcion: 'Descripción de Contacto modificada' },
          { id: 2, nombre: 'Navegación', descripcion: 'Técnicas de navegación y orientación' },
          { id: 4, nombre: 'Campos Extraños', descripcion: 'Operaciones en terrenos no preparados' },
          { id: 5, nombre: 'Formación', descripcion: 'Vuelo en formación y coordinación' },
        ],
      }),
    ).rejects.toBeInstanceOf(ApiError)
    await expect(obtenerFase(1)).resolves.toEqual(original)
  })
})
