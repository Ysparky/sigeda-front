import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import {
  aTurnoDetalle,
  aTurnoResumen,
  crearTurno,
  eliminarTurno,
  listarOcupacionAeronave,
  listarTurnos,
  listarTurnosDelAlumno,
  modificarTurno,
  obtenerTurno,
  type CuerpoTurno,
} from './api'

const API = config.sigedaApiUrl
const EN_UNA_SEMANA = sumarDias(hoyIso(), 7)
const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }

function cuerpoValido(cambios: Partial<CuerpoTurno> = {}): CuerpoTurno {
  return {
    nombre: 'Navegación Diurna',
    fechaEval: sumarDias(hoyIso(), 10),
    programa: 'PDI',
    idSubfase: 2,
    codInstructor: '444444',
    aeronave: { id: 1 },
    alumnosTurno: [{ codAlumno: '222222', horaInicio: '08:00', horaFin: '09:30' }],
    maniobrasTurno: [{ idManiobra: 1, nota_min: 'B' }],
    ...cambios,
  }
}

describe('api de turnos', () => {
  it('CA-TUR-01 filtra por programa, sub fase y rango de fechas', async () => {
    await iniciarComo('jefe.operaciones')
    const porSubfase = await listarTurnos({ ...PAGINA, programa: 'PDI', idSubfase: 4 })
    expect(porSubfase.items).toEqual([
      {
        id: 6,
        nombre: 'Campos Tácticos',
        subfase: 'Campos Extraños',
        fechaEval: '2024-04-05',
        programa: 'PDI',
        cantAlumno: 1,
        cantManiobra: 2,
      },
    ])
    const porFechas = await listarTurnos({ ...PAGINA, programa: 'PDI', desde: '2024-03-01', hasta: '2024-03-15' })
    expect(porFechas.items.map((turno) => turno.id)).toEqual([1, 2, 3])
    await expect(listarTurnos({ ...PAGINA, programa: 'PDE' })).resolves.toMatchObject({ items: [], total: 0 })
  })

  it('pagina y ordena en el servidor', async () => {
    await iniciarComo('jefe.operaciones')
    const pagina = await listarTurnos({ page: 1, size: 6, direction: 'DESC', property: 'id', programa: 'PDI' })
    expect(pagina).toMatchObject({ page: 1, size: 6, total: 9, totalPages: 2 })
    expect(pagina.items.map((turno) => turno.id)).toEqual([3, 2, 1])
  })

  it('CA-TUR-14 lista solo los turnos del alumno', async () => {
    await iniciarComo('alumno.lopez')
    const pagina = await listarTurnosDelAlumno('111111', PAGINA)
    expect(pagina.items.map((turno) => turno.id)).toEqual([1, 8])
  })

  it('CA-TUR-10 trae el detalle con instructor, aeronave, horarios y notas mínimas', async () => {
    await iniciarComo('jefe.operaciones')
    const turno = await obtenerTurno(8)
    expect(turno).toMatchObject({
      nombre: 'Navegación Nocturna',
      fase: 'Adaptación',
      codInstructor: '444444',
      instructor: 'Juan Torres',
      aeronave: { id: 1, nombre: 'Robinson R22', estado: 'Disponible' },
      alumnos: [
        { codAlumno: '111111', alumno: 'Oscar Lopez', horaInicio: '09:00', horaFin: '10:30' },
        { codAlumno: '666666', alumno: 'Ana Torres', horaInicio: '11:00', horaFin: '12:30' },
      ],
    })
    expect(turno.maniobras.map((item) => [item.maniobra.nombre, item.notaMin])).toEqual([
      ['Maniobra 1', 'R'],
      ['Maniobra 2', 'B'],
      ['Maniobra 3', 'E'],
      ['Maniobra 4', 'I'],
    ])
  })

  it('dependencia 21 lee el idSubfase del detalle y lo deja indefinido si el backend no lo envía', async () => {
    await iniciarComo('jefe.operaciones')
    expect((await obtenerTurno(8)).idSubfase).toBe(2)
    expect(
      aTurnoDetalle({ id: 1, nombre: 'Contacto Básico', subfase: 'Contacto', fechaEval: '2024-03-01', programa: 'PDI' })
        .idSubfase,
    ).toBeUndefined()
  })

  it('tolera la forma actual del backend en la lista y en el detalle', () => {
    expect(
      aTurnoResumen({ id: 1, nombre: 'Contacto Básico', subfase: 'Contacto', fechaEval: '2024-03-01', programa: 'PDI', cantGrupo: 2, cantManiobra: 6 })
        .cantAlumno,
    ).toBe(2)
    expect(
      aTurnoDetalle({ id: 1, nombre: 'Contacto Básico', subfase: 'Contacto', fechaEval: '2024-03-01', programa: 'PDI' }),
    ).toMatchObject({ alumnos: [], maniobras: [], aeronave: null, codInstructor: null })
  })

  it('CA-TUR-07 informa los horarios ocupados de la aeronave ese día', async () => {
    await iniciarComo('jefe.operaciones')
    expect(await listarOcupacionAeronave(EN_UNA_SEMANA, 1)).toEqual([
      { idTurno: 8, nombre: 'Navegación Nocturna', horaInicio: '09:00', horaFin: '12:30' },
      { idTurno: 9, nombre: 'Instrumentos Básicos', horaInicio: '07:30', horaFin: '08:30' },
    ])
    await expect(listarOcupacionAeronave(EN_UNA_SEMANA, 2)).resolves.toEqual([])
  })

  it('M1-1 registra un turno y entiende la respuesta 201 del contrato', async () => {
    await iniciarComo('jefe.operaciones')
    await expect(crearTurno(cuerpoValido())).resolves.toEqual({ mensaje: 'Turno guardado con éxito.', id: 10 })
    await expect(obtenerTurno(10)).resolves.toMatchObject({ nombre: 'Navegación Diurna', subfase: 'Navegación' })
  })

  it('M1-1 tolera la respuesta 200 con la entidad cruda del backend actual', async () => {
    server.use(http.post(`${API}/api/turnos`, () => HttpResponse.json({ id: 42, nombre: 'Navegación Diurna', cantAlumno: 1 })))
    await iniciarComo('jefe.operaciones')
    await expect(crearTurno(cuerpoValido())).resolves.toEqual({ mensaje: 'Turno guardado con éxito.', id: 42 })
  })

  it('modificar no envía programa ni sub fase', async () => {
    let recibido: unknown = null
    server.use(
      http.put(`${API}/api/turnos/:id`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ mensaje: 'Turno guardado con éxito.', turno: { id: 8 } }, { status: 201 })
      }),
    )
    await iniciarComo('jefe.operaciones')
    await modificarTurno(8, cuerpoValido())
    expect(recibido).not.toHaveProperty('programa')
    expect(recibido).not.toHaveProperty('idSubfase')
    expect(recibido).toMatchObject({ nombre: 'Navegación Diurna', aeronave: { id: 1 } })
  })

  it('CA-TUR-11 el backend rechaza eliminar un turno cuya fecha pasó', async () => {
    await iniciarComo('jefe.operaciones')
    await expect(eliminarTurno(1)).rejects.toMatchObject({
      status: 410,
      message: 'No se puede modificar. El turno ya ha sido evaluado.',
    })
    await expect(eliminarTurno(8)).resolves.toBe('Turno eliminado con éxito.')
  })

  it('rechaza nota_min faltante con el mensaje de campo requerido, no el de patrón', async () => {
    await iniciarComo('jefe.operaciones')
    const cuerpo = cuerpoValido({
      maniobrasTurno: [{ idManiobra: 1 } as unknown as CuerpoTurno['maniobrasTurno'][number]],
    })
    await expect(crearTurno(cuerpo)).rejects.toMatchObject({
      status: 400,
      erroresDeCampo: { 'maniobrasTurno[0].nota_min': 'Ingresar nota mínima de maniobra.' },
    })
  })

  it('devuelve el error de nombre y el de solape de horario en el mismo 400', async () => {
    await iniciarComo('jefe.operaciones')
    const cuerpo = cuerpoValido({
      nombre: 'Corto',
      fechaEval: EN_UNA_SEMANA,
      alumnosTurno: [{ codAlumno: '111111', horaInicio: '09:30', horaFin: '10:00' }],
    })
    await expect(crearTurno(cuerpo)).rejects.toMatchObject({
      status: 400,
      erroresDeCampo: {
        nombre: 'Nombre debe tener de 10 a 30 caracteres.',
        'alumnosTurno[0].codAlumno': 'El alumno 111111 tiene un horario que se cruza con otro turno de la aeronave.',
      },
    })
  })
})
