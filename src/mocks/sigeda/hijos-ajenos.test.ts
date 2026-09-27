import { describe, expect, it } from 'vitest'

import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'

import { datos } from './datos'

/**
 * Las dos rutas que reemplazan una colección de hijos aceptando hijos CON `id`. El servidor rechaza
 * con 410 el `id` que existe pero pertenece a otro padre, en vez de mudarlo; el `id` que no existe se
 * sigue creando, que es lo que las pantallas usan.
 *
 * POR QUÉ SE PRUEBA ACÁ Y NO EN LA INTERFAZ: ninguna pantalla manda ids ajenos, así que una prueba de
 * interfaz no puede ejercer esta regla. Y el mock tiene que emitir exactamente lo que emite el
 * servidor: la última vez que el mock y el servidor se separaron —el contrato decía `APaterno`, el
 * servidor mandaba `apaterno`— las dos suites quedaron verdes con el legajo mostrando «undefined».
 */
describe('un hijo que es de otro padre no se muda', () => {
  it('PUT /api/fases/{id} rechaza con 410 la subfase de otra fase', async () => {
    await iniciarComo('comandante.aguirre')
    const ajena = datos().subfases[0]
    const otra = datos().fases.find((fase) => fase.id !== ajena.idFase)
    expect(otra).toBeDefined()

    await expect(
      sigeda.put(`/api/fases/${otra!.id}`, {
        nombre: otra!.nombre,
        descripcion: otra!.descripcion,
        subfases: [{ id: ajena.id, nombre: ajena.nombre, descripcion: 'robada' }],
      }),
    ).rejects.toMatchObject({ status: 410, message: `La subfase ${ajena.nombre} es de otra fase y no se puede mover.` })

    expect(datos().subfases.find((subfase) => subfase.id === ajena.id)?.idFase).toBe(ajena.idFase)
  })

  it('PUT /api/maniobras/{id}/estandar rechaza con 410 el estándar de otra maniobra', async () => {
    await iniciarComo('jefe.operaciones')
    const ajeno = datos().estandares[0]
    const otra = datos().maniobras.find((maniobra) => maniobra.id !== ajeno.idManiobra)
    expect(otra).toBeDefined()

    await expect(
      sigeda.put(`/api/maniobras/${otra!.id}/estandar`, {
        estandares: [{ id: ajeno.id, nombre: ajeno.nombre, descripcion: 'robado' }],
      }),
    ).rejects.toMatchObject({
      status: 410,
      message: `El estándar ${ajeno.nombre} es de otra maniobra y no se puede mover.`,
    })

    expect(datos().estandares.find((estandar) => estandar.id === ajeno.id)?.idManiobra).toBe(ajeno.idManiobra)
  })
})
