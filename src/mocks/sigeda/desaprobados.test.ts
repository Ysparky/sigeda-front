import { describe, expect, it } from 'vitest'
import { ApiError, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'
import { replayDeResultados } from './desaprobados'

describe('contadores, grupos y evaluaciones de las fijaciones', () => {
  it('contrato §9.1 cada alumno lleva los cuatro contadores de la semilla', async () => {
    await iniciarComo('admin.sistema')
    const respuesta = await sigeda.put<{ persona: { contChequeo: number; contEval: number; contMalo: number; contRegular: number } }>(
      '/api/personas/777777',
      { rango: 'Mayor', tipo: 'Alumno' },
    )
    expect(respuesta.persona).toMatchObject({ contChequeo: 4, contEval: 10, contMalo: 3, contRegular: 2 })
    const grupo = await sigeda.get<{ personas: { codigo: string; contMalo: number; contRegular: number }[] }>('/api/grupos/6')
    expect(grupo.personas.find((alumno) => alumno.codigo === '999999')).toMatchObject({ contMalo: 2, contRegular: 2 })
  })

  it('contrato §9.1 el grupo 6 tiene nombre propio, así que la etiqueta S4 es falsable', async () => {
    await iniciarComo('admin.sistema')
    const grupo = await sigeda.get<{ nombre: string }>('/api/grupos/6')
    expect(grupo.nombre).toBe('Promoción 2026-A')
  })

  it('contrato §9.2 las doce evaluaciones están en las subfases que el contrato fija', () => {
    const codigos = datos().evaluaciones.map((evaluacion) => evaluacion.codigo)
    expect(codigos).toHaveLength(12)
    expect(codigos).toContain('666666-1')
    expect(codigos).toContain('999999-2')
    const de777777 = datos().evaluaciones.filter((evaluacion) => evaluacion.codPersona === '777777')
    expect(de777777).toHaveLength(5)
    expect(de777777.every((evaluacion) => evaluacion.idSubFase === 3)).toBe(true)
    expect(de777777.map((evaluacion) => evaluacion.codEvalPrevia)).toEqual([
      null,
      '777777-1',
      '777777-2',
      '777777-3',
      '777777-4',
    ])
    expect(datos().evaluaciones.find((evaluacion) => evaluacion.codigo === '999999-2')?.categoria).toBe('Chequeo Sub Fase')
  })
})

describe('el replay de ResultadoController', () => {
  it('contrato §9.3 deriva seis desaprobados en cuatro alumnos y tres grupos', () => {
    const { desaprobados } = replayDeResultados()
    expect(desaprobados.map((fila) => fila.codigo)).toEqual([
      '555555-1',
      '666666-1',
      '777777-1',
      '777777-2',
      '999999-1',
      '777777-3',
    ])
    expect(new Set(desaprobados.map((fila) => fila.codPersona)).size).toBe(4)
    expect(new Set(desaprobados.map((fila) => datos().personas.find((p) => p.codigo === fila.codPersona)?.idGrupo))).toEqual(
      new Set([3, 4, 6]),
    )
  })

  it('contrato §9.3 una Ponderada Mala de un alumno que ya no está Apto no abre nada', () => {
    const { desaprobados } = replayDeResultados()
    expect(desaprobados.map((fila) => fila.codigo)).not.toContain('777777-4')
    expect(desaprobados.filter((fila) => fila.codPersona === '777777')).toHaveLength(3)
  })

  it('contrato §9.3 un Regular con contRegular impar no abre desaprobado', () => {
    const { desaprobados } = replayDeResultados()
    expect(desaprobados.map((fila) => fila.codigo)).toContain('555555-1')
    expect(desaprobados.map((fila) => fila.codigo)).not.toContain('555555-3')
  })

  it('contrato §9.4 el Chequeo Sub Fase de 999999 deriva una sola fila de chequeo aprobado', () => {
    const { chequeos } = replayDeResultados()
    expect(chequeos).toHaveLength(1)
    expect(chequeos[0]).toMatchObject({
      codigo: '999999-2',
      tipo: 'SUBFASE',
      resultado: 'Aprobado',
      contadores: { chequeo: 0, evaluaciones: 7, malos: 0, regulares: 1 },
    })
  })
})

describe('los cinco endpoints de desaprobados', () => {
  it('contrato §2.2 lista los desaprobados de un alumno con su subfase y su programa', async () => {
    await iniciarComo('instructor.perez')
    const filas = await sigeda.lista<{ codigo: string; clasificacion: string; subfase: string; idSubfase: number }>(
      '/api/desaprobados/persona/777777',
    )
    expect(filas).toHaveLength(3)
    expect(filas[0]).toMatchObject({ codigo: '777777-1', clasificacion: 'Malo', subfase: 'Instrumentos', idSubfase: 3 })
    expect(filas[0]).toHaveProperty('programa', 'PDI')
    expect(filas[0]).not.toHaveProperty('persona')
  })

  it('contrato §2.2 un alumno sin desaprobados responde 404 D3 y la capa lo deja en lista vacía', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/desaprobados/persona/654321')).rejects.toMatchObject({
      status: 404,
      message: 'No existen desaprobados disponibles.',
    })
    await expect(sigeda.lista('/api/desaprobados/persona/654321')).resolves.toEqual([])
  })

  it('contrato §2.2 pide View Disapproved, que el alumno no tiene', async () => {
    await iniciarComo('alumno.ramirez')
    await expect(sigeda.lista('/api/desaprobados/persona/777777')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })

  it('contrato §2.3 y §2.4 los dos lectores por subfase piden el permiso que el contrato exige', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/desaprobados/alumno/777777/subfase/3')).resolves.toMatchObject({ codigo: '777777-3' })
    await expect(sigeda.get('/api/desaprobados/regular/alumno/999999/subfase/1')).resolves.toMatchObject({
      codigo: '999999-1',
    })
    await expect(sigeda.get('/api/desaprobados/alumno/111111/subfase/1')).rejects.toMatchObject({
      status: 404,
      message: 'Desaprobado especificada no existe.',
    })
    await iniciarComo('alumno.ramirez')
    await expect(sigeda.get('/api/desaprobados/alumno/777777/subfase/3')).rejects.toBeInstanceOf(ApiError)
  })

  // §2.5 SE RETIRÓ DEL SERVIDOR. Borrar un `Desaprobado` por su cuenta desincronizaba los contadores
  // del alumno, porque la contabilidad completa vive en `revertAll` y sólo es correcta para la ÚLTIMA
  // evaluación. El mock no la sirve más, y esto lo fija: si alguien la reintroduce, esta prueba falla.
  it('contrato §2.5 el DELETE ya no existe: el servidor retiró la ruta', async () => {
    await iniciarComo('comandante.aguirre')
    await expect(sigeda.eliminar('/api/desaprobados/777777-1')).rejects.toBeInstanceOf(ApiError)
  })

  it('contrato §2.6 exist responde true o false crudos', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/desaprobados/exist/777777-1')).resolves.toBe(true)
    await expect(sigeda.get('/api/desaprobados/exist/111111-1')).resolves.toBe(false)
  })
})
