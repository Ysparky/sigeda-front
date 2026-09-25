import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import {
  crearTurnoTeorico,
  eliminarTurnoTeorico,
  listarGruposDeExamen,
  listarTurnosTeoricos,
  modificarTurnoTeorico,
  obtenerTurnoTeorico,
  type CuerpoTurnoTeorico,
} from '@/features/turnos-teoricos/api'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'
import { D6_TURNO_NO_EXISTE, D7_VENTANA_COMENZADA, D26_GRUPO_NO_EXISTE, D28_SIN_GRUPOS } from './turnos-teoricos'

const PARAMETROS = { page: 0, size: 10, direction: 'ASC' } as const

function nuevoTurno(): CuerpoTurnoTeorico {
  return {
    codInstructor: '444444',
    nombre: 'Quincenal Procedimientos Normales',
    programa: 'PDI',
    idMateria: 4,
    tipoExamen: 'QUINCENAL',
    fechaExamen: sumarDias(hoyIso(), 5),
    horaInicio: '09:00',
    horaFin: '10:00',
    idGrupo: 3,
    idTurnoOrigen: null,
    preguntas: [17, 18, 19, 20, 21].map((idPregunta) => ({ idPregunta, puntajeMaximo: 4 })),
  }
}

async function comoInstructor() {
  await iniciarComo('instructor.perez')
}

async function errorDe(promesa: Promise<unknown>): Promise<ApiError> {
  return (await promesa.catch((problema: unknown) => problema)) as ApiError
}

describe('contrato §3.0 catálogo de grupos', () => {
  it('CA-TUT-04 devuelve los grupos del instructor con su cantidad de alumnos', async () => {
    await comoInstructor()
    expect(await listarGruposDeExamen('444444', 'PDI')).toEqual([
      { id: 1, nombre: 'Grupo 1', programa: 'PDI', cantAlumnos: 1 },
      { id: 2, nombre: 'Grupo 2', programa: 'PDI', cantAlumnos: 1 },
      { id: 3, nombre: 'Grupo 3', programa: 'PDI', cantAlumnos: 2 },
    ])
    expect((await listarGruposDeExamen('888888', 'PDI')).map((grupo) => grupo.id)).toEqual([4, 6])
  })

  it('M4-6 con Manage Groups y sin instructor devuelve todos los grupos del programa con alumnos', async () => {
    await iniciarComo('admin.sistema')
    expect((await listarGruposDeExamen(null, 'PDI')).map((grupo) => grupo.id)).toEqual([1, 2, 3, 4, 6])
  })

  it('M4-6 sin Manage Groups exige el código del instructor', async () => {
    await comoInstructor()
    const error = await errorDe(listarGruposDeExamen(null, 'PDI'))
    expect(error.erroresDeCampo.codInstructor).toBe('El código del instructor es obligatorio.')
  })

  it('M4-6 el programa es obligatorio y un programa sin grupos responde 404 D28', async () => {
    await iniciarComo('admin.sistema')
    const error = await errorDe(listarGruposDeExamen(null, 'XX' as never))
    expect(error.erroresDeCampo.programa).toBe('Ingresar programa válido.')
    expect(await listarGruposDeExamen(null, 'PDE')).toEqual([])
    expect(D28_SIN_GRUPOS).toBe('No existen grupos disponibles.')
  })
})

describe('contrato §3.1 lista de turnos teóricos', () => {
  it('CA-TUT-01 devuelve la fila plana con el estado derivado y cuántos rindieron', async () => {
    await comoInstructor()
    const pagina = await listarTurnosTeoricos(PARAMETROS)
    expect(pagina.total).toBe(5)
    expect(pagina.items.map((fila) => [fila.id, fila.estado, fila.rindieron, fila.cantAlumnos])).toEqual([
      [1, 'FINALIZADO', 2, 2],
      [2, 'FINALIZADO', 0, 1],
      [3, 'EN_CURSO', 0, 1],
      [5, 'PROGRAMADO', 0, 1],
      [4, 'PROGRAMADO', 0, 2],
    ])
    expect(pagina.items[0]).toMatchObject({
      nombre: 'Mensual Adoctrinamiento de Vuelo',
      materia: 'Adoctrinamiento de Vuelo',
      tipoExamen: 'MENSUAL',
      grupo: 'Grupo 3',
      programa: 'PDI',
      cantPreguntas: 5,
    })
  })

  it('CA-TUT-02 filtra por grupo, materia, estado, tipo y rango de fechas', async () => {
    await comoInstructor()
    expect((await listarTurnosTeoricos({ ...PARAMETROS, idGrupo: 3 })).total).toBe(3)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, idMateria: 6 })).total).toBe(1)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, estado: 'PROGRAMADO' })).total).toBe(2)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, tipoExamen: 'SUBSANACION' })).total).toBe(1)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, fechaPre: hoyIso() })).total).toBe(3)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, fechaPost: sumarDias(hoyIso(), -6) })).total).toBe(1)
    expect((await listarTurnosTeoricos({ ...PARAMETROS, idGrupo: 5 })).items).toEqual([])
  })
})

describe('contrato §3.2 detalle del turno', () => {
  it('CA-RES-01 CA-RES-03 CA-RES-04 devuelve preguntas, resultados y resumen', async () => {
    await comoInstructor()
    const turno = await obtenerTurnoTeorico(1)
    expect(turno.materia).toEqual({ id: 3, nombre: 'Adoctrinamiento de Vuelo', notaMinima: 18 })
    expect(turno.notaMinimaAplicada).toBe(18)
    expect(turno.instructor).toEqual({ codigo: '444444', nombre: 'Juan Torres Perez' })
    expect(turno.preguntas.map((pregunta) => [pregunta.orden, pregunta.puntajeMaximo])).toEqual([
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
      [5, 4],
    ])
    expect(turno.resultados).toEqual([
      {
        codAlumno: '555555',
        alumno: 'Pedro Rodriguez Garcia',
        estado: 'ENTREGADO',
        idCuestionario: 1,
        nota: 20,
        aprobado: true,
        bloqueadoPorSubsanacion: false,
      },
      {
        codAlumno: '666666',
        alumno: 'Ana Torres Martinez',
        estado: 'ENTREGADO',
        idCuestionario: 2,
        nota: 12,
        aprobado: false,
        bloqueadoPorSubsanacion: true,
      },
    ])
    expect(turno.resumen).toEqual({ habilitados: 2, rindieron: 2, aprobados: 1, notaPromedio: 16 })
  })

  it('CA-RES-02 un turno finalizado sin entregas deriva NO_RINDIO y no promedia', async () => {
    await comoInstructor()
    const turno = await obtenerTurnoTeorico(2)
    expect(turno.resultados).toEqual([
      {
        codAlumno: '222222',
        alumno: 'Juan Falconi Fernandez',
        estado: 'NO_RINDIO',
        idCuestionario: null,
        nota: null,
        aprobado: null,
        bloqueadoPorSubsanacion: false,
      },
    ])
    expect(turno.resumen).toEqual({ habilitados: 1, rindieron: 0, aprobados: 0, notaPromedio: null })
  })

  it('CA-RES-02 la subsanación solo habilita a quien desaprobó el turno de origen', async () => {
    await comoInstructor()
    const turno = await obtenerTurnoTeorico(5)
    expect(turno.turnoOrigen).toMatchObject({ id: 1, nombre: 'Mensual Adoctrinamiento de Vuelo' })
    expect(turno.resultados.map((resultado) => resultado.codAlumno)).toEqual(['666666'])
    expect(await errorDe(obtenerTurnoTeorico(999)).then((error) => error.message)).toBe(D6_TURNO_NO_EXISTE)
  })

  it('CA-RES-02 un alumno sin grupo nunca aparece entre los habilitados', async () => {
    await comoInstructor()
    const codigos = (await obtenerTurnoTeorico(1)).resultados.map((resultado) => resultado.codAlumno)
    expect(codigos).not.toContain('654321')
  })
})

describe('contrato §3.3 registrar turno teórico', () => {
  it('CA-TUT-06 CA-TUT-07 guarda el turno con el orden de las preguntas y devuelve D22', async () => {
    await comoInstructor()
    expect(await crearTurnoTeorico(nuevoTurno())).toEqual({ mensaje: 'Turno teórico guardado con éxito.', id: 6 })
    const turno = await obtenerTurnoTeorico(6)
    expect(turno.preguntas.map((pregunta) => pregunta.idPregunta)).toEqual([17, 18, 19, 20, 21])
    expect(turno.estado).toBe('PROGRAMADO')
    expect(datos().secuencias.turnoTeorico).toBe(7)
  })

  it('CA-TUT-03 valida nombre, fecha futura y ventana mínima de 10 minutos', async () => {
    await comoInstructor()
    const corto = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), nombre: 'Corto' }))
    expect(corto.erroresDeCampo.nombre).toBe('El nombre debe tener entre 10 y 60 caracteres.')
    const pasado = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), fechaExamen: sumarDias(hoyIso(), -1) }))
    expect(pasado.erroresDeCampo.fechaExamen).toBe('El examen debe comenzar en el futuro.')
    const ventana = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), horaFin: '09:05' }))
    expect(ventana.erroresDeCampo.horaFin).toBe('La ventana del examen debe durar al menos 10 minutos.')
  })

  it('CA-TUT-07 exige que los puntajes sumen exactamente 20 y sean enteros de 1 a 20', async () => {
    await comoInstructor()
    const suma = await errorDe(
      crearTurnoTeorico({ ...nuevoTurno(), preguntas: [{ idPregunta: 17, puntajeMaximo: 4 }] }),
    )
    expect(suma.erroresDeCampo.preguntas).toBe('Los puntajes de las preguntas deben sumar 20.')
    const puntaje = await errorDe(
      crearTurnoTeorico({ ...nuevoTurno(), preguntas: [{ idPregunta: 17, puntajeMaximo: 0 }] }),
    )
    expect(puntaje.erroresDeCampo['preguntas[0].puntajeMaximo']).toBe('El puntaje debe ser un entero entre 1 y 20.')
    const vacio = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), preguntas: [] }))
    expect(vacio.erroresDeCampo.preguntas).toBe('Debe elegir al menos una pregunta.')
  })

  it('CA-TUT-06 rechaza preguntas repetidas y de otra materia', async () => {
    await comoInstructor()
    const repetida = await errorDe(
      crearTurnoTeorico({
        ...nuevoTurno(),
        preguntas: [
          { idPregunta: 17, puntajeMaximo: 10 },
          { idPregunta: 17, puntajeMaximo: 10 },
        ],
      }),
    )
    expect(repetida.erroresDeCampo.preguntas).toBe('No se puede repetir una pregunta.')
    const ajena = await errorDe(
      crearTurnoTeorico({
        ...nuevoTurno(),
        preguntas: [
          { idPregunta: 1, puntajeMaximo: 10 },
          { idPregunta: 2, puntajeMaximo: 10 },
        ],
      }),
    )
    expect(ajena.erroresDeCampo.preguntas).toBe('Todas las preguntas deben ser de la materia del turno.')
  })

  it('CA-TUT-04 valida el programa del grupo, los alumnos del grupo y el instructor', async () => {
    await comoInstructor()
    const programa = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), programa: 'PDE' }))
    expect(programa.erroresDeCampo.programa).toBe('El programa no corresponde al grupo.')
    const sinAlumnos = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), idGrupo: 5 }))
    expect(sinAlumnos.erroresDeCampo.idGrupo).toBe('El grupo no tiene alumnos.')
    const ajeno = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), idGrupo: 4 }))
    expect(ajeno.erroresDeCampo.codInstructor).toBe('El grupo no corresponde al instructor.')
    expect(await errorDe(crearTurnoTeorico({ ...nuevoTurno(), idGrupo: 99 })).then((e) => e.message)).toBe(
      D26_GRUPO_NO_EXISTE,
    )
  })

  it('CA-TUT-04 con Manage Groups basta que el grupo pertenezca al programa', async () => {
    await iniciarComo('admin.sistema')
    const cuerpo = { ...nuevoTurno(), codInstructor: '000001', idGrupo: 4 }
    expect(await crearTurnoTeorico(cuerpo)).toEqual({ mensaje: 'Turno teórico guardado con éxito.', id: 6 })
    expect((await obtenerTurnoTeorico(6)).grupo).toEqual({ id: 4, nombre: 'Grupo 4', programa: 'PDI' })
    const sinAlumnos = await errorDe(crearTurnoTeorico({ ...cuerpo, idGrupo: 5 }))
    expect(sinAlumnos.erroresDeCampo.idGrupo).toBe('El grupo no tiene alumnos.')
  })

  it('CA-TUT-08 exige el turno de origen solo en subsanación o rezagado', async () => {
    await comoInstructor()
    const sinOrigen = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), tipoExamen: 'SUBSANACION' }))
    expect(sinOrigen.erroresDeCampo.idTurnoOrigen).toBe(
      'El turno de origen es obligatorio para una subsanación o un rezagado.',
    )
    const conOrigenDeMas = await errorDe(crearTurnoTeorico({ ...nuevoTurno(), idTurnoOrigen: 1 }))
    expect(conOrigenDeMas.erroresDeCampo.idTurnoOrigen).toBe(
      'El turno de origen solo se indica en una subsanación o un rezagado.',
    )
    const origenAjeno = await errorDe(
      crearTurnoTeorico({ ...nuevoTurno(), tipoExamen: 'SUBSANACION', idTurnoOrigen: 2 }),
    )
    expect(origenAjeno.erroresDeCampo.idTurnoOrigen).toBe(
      'El turno de origen debe ser un turno finalizado de la misma materia y grupo.',
    )
  })

  it('CA-TUT-08 rechaza un rezagado cuyo turno de origen no dejó a nadie sin rendir', async () => {
    await comoInstructor()
    const error = await errorDe(
      crearTurnoTeorico({
        ...nuevoTurno(),
        nombre: 'Rezagado Adoctrinamiento de Vuelo',
        idMateria: 3,
        tipoExamen: 'REZAGADO',
        idTurnoOrigen: 1,
        preguntas: [1, 2, 3, 4, 5].map((idPregunta) => ({ idPregunta, puntajeMaximo: 4 })),
      }),
    )
    expect(error.erroresDeCampo.idTurnoOrigen).toBe('Ningún alumno del turno de origen corresponde a este tipo de examen.')
  })
})

describe('contrato §3.4 y §3.5 modificar y eliminar', () => {
  it('CA-TUT-10 modificar aplica las mismas reglas y responde 409 D7 si la ventana comenzó', async () => {
    await comoInstructor()
    expect(await modificarTurnoTeorico(4, { ...nuevoTurno(), nombre: 'Quincenal Limites corregido' })).toEqual({
      mensaje: 'Turno teórico guardado con éxito.',
      id: 4,
    })
    const corto = await errorDe(modificarTurnoTeorico(4, { ...nuevoTurno(), nombre: 'Corto' }))
    expect(corto.erroresDeCampo.nombre).toBe('El nombre debe tener entre 10 y 60 caracteres.')
    await expect(modificarTurnoTeorico(1, nuevoTurno())).rejects.toThrow(D7_VENTANA_COMENZADA)
    await expect(modificarTurnoTeorico(3, nuevoTurno())).rejects.toThrow(D7_VENTANA_COMENZADA)
  })

  it('CA-TUT-11 eliminar solo funciona con el turno programado', async () => {
    await comoInstructor()
    expect(await eliminarTurnoTeorico(4)).toBe('Turno teórico eliminado con éxito.')
    expect(datos().turnosTeoricos.some((turno) => turno.id === 4)).toBe(false)
    expect(datos().preguntasTurno.some((fila) => fila.idTurnoTeorico === 4)).toBe(false)
    await expect(eliminarTurnoTeorico(1)).rejects.toThrow(D7_VENTANA_COMENZADA)
    await expect(eliminarTurnoTeorico(4)).rejects.toThrow(D6_TURNO_NO_EXISTE)
  })
})
