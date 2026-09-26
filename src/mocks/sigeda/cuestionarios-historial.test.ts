import { describe, expect, it } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { iniciarComo } from '@/test/render'
import { D14_SIN_EXAMENES } from './cuestionarios-historial'

type Fila = {
  id: number
  idTurnoTeorico: number
  materia: string
  tipoExamen: string
  fechaExamen: string
  estado: string
  nota: number | null
  notaMinimaAplicada: number
  aprobado: boolean | null
  idTurnoOrigen: number | null
  subsanadoPor: { idTurnoTeorico: number; nota: number | null; estado: string } | null
}

async function historial(codAlumno: string, extra = '') {
  return sigeda.get<{ content: Fila[]; totalElements: number }>(
    `/api/cuestionarios?codAlumno=${codAlumno}&page=0&size=10&direction=DESC${extra}`,
  )
}

describe('GET /api/cuestionarios', () => {
  it('contrato §9.8 999999 tiene la cadena de subsanación completa, con las dos notas', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await historial('999999')
    expect(pagina.content.map((fila) => [fila.idTurnoTeorico, fila.nota, fila.aprobado])).toEqual([
      [7, 17, true],
      [6, 10, false],
    ])
    const origen = pagina.content.find((fila) => fila.idTurnoTeorico === 6)
    expect(origen).toMatchObject({ notaMinimaAplicada: 16, materia: 'Aerodinámica Aplicada a Helicópteros' })
    expect(origen?.subsanadoPor).toMatchObject({ idTurnoTeorico: 7, nota: 17, estado: 'FINALIZADO' })
    expect(pagina.content.find((fila) => fila.idTurnoTeorico === 7)?.idTurnoOrigen).toBe(6)
  })

  it('contrato §9.8 666666 tiene su desaprobado con la subsanación pendiente y sin segunda nota', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await historial('666666')
    expect(pagina.content).toHaveLength(1)
    expect(pagina.content[0]).toMatchObject({ idTurnoTeorico: 1, nota: 12, aprobado: false, notaMinimaAplicada: 18 })
    expect(pagina.content[0]?.subsanadoPor).toMatchObject({ idTurnoTeorico: 5, nota: null, estado: 'PROGRAMADO' })
  })

  it('contrato §5.2 una fila EN_CURSO llega sin nota, sin aprobado y sin entrega', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await historial('111111')
    expect(pagina.content).toHaveLength(1)
    expect(pagina.content[0]).toMatchObject({ estado: 'EN_CURSO', nota: null, aprobado: null })
    expect(pagina.content[0]).toHaveProperty('fechaEntrega', null)
    expect(pagina.content[0]).toHaveProperty('horaEntrega', null)
  })

  it('contrato §9.8 un alumno sin exámenes responde 404 D14', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/cuestionarios?codAlumno=222222&page=0&size=10')).rejects.toMatchObject({
      status: 404,
      message: D14_SIN_EXAMENES,
    })
  })

  it('contrato §5.2 filtra por materia y estado, ordena por fechaExamen descendente y el alumno solo ve lo propio', async () => {
    await iniciarComo('instructor.perez')
    expect((await historial('999999', '&idMateria=1')).totalElements).toBe(2)
    expect((await historial('999999', '&idMateria=3')).totalElements).toBe(0)
    expect((await historial('555555', '&estado=ENTREGADO')).totalElements).toBe(1)
    await iniciarComo('alumno.castro')
    expect((await historial('999999')).totalElements).toBe(2)
    await expect(historial('555555')).rejects.toMatchObject({ status: 403 })
  })
})
