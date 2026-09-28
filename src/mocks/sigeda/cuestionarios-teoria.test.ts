import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import {
  entregarExamen,
  guardarRespuestas,
  iniciarExamen,
  listarExamenesPendientes,
  obtenerEstadoTeorico,
  obtenerExamen,
  obtenerMiExamen,
} from '@/features/examenes/api'
import { abrirVentanaDeExamen, relojFalso } from '@/test/tiempo'
import { iniciarComo } from '@/test/render'
import { alternativasDePregunta, cuestionarioDe, datos } from './datos'
import {
  D8_EXAMEN_NO_DISPONIBLE,
  D9_ALUMNO_NO_HABILITADO,
  D10_EXAMEN_ENTREGADO,
  D11_VENTANA_CERRADA,
  D12_EXAMEN_NO_EXISTE,
  D15_SOLO_LO_PROPIO,
} from './cuestionarios-teoria'

function idCorrecta(idPregunta: number): string {
  return String(alternativasDePregunta(idPregunta).find((alternativa) => alternativa.correcto)?.id)
}

function idIncorrecta(idPregunta: number): string {
  return String(alternativasDePregunta(idPregunta).find((alternativa) => !alternativa.correcto)?.id)
}

describe('un único 403 de propiedad', () => {
  it('el texto no nombra ningún recurso, porque sirve a ocho controladores', () => {
    // Eran tres redacciones para el mismo rechazo, y cada una nombraba un recurso: «exámenes» era
    // falso en el legajo y «legajo» era falso en los turnos. Esta prueba fija el texto Y la razón:
    // si vuelve a nombrar un recurso, vuelve a haber tres.
    expect(D15_SOLO_LO_PROPIO).toBe('Solo puede consultar su propia información.')
    for (const recurso of ['examen', 'legajo', 'turno', 'grupo', 'alumno', 'evaluación']) {
      expect(D15_SOLO_LO_PROPIO.toLowerCase()).not.toContain(recurso)
    }
  })

  it('las rutas por persona que un alumno recorre seguidas dicen todas lo mismo', async () => {
    await iniciarComo('alumno.lopez')
    for (const ruta of ['estado-teorico', 'indices']) {
      await expect(sigeda.get(`/api/personas/666666/${ruta}`)).rejects.toThrow(D15_SOLO_LO_PROPIO)
    }
    await expect(sigeda.pagina('/api/cuestionarios', { codAlumno: '666666', page: 0, size: 6 })).rejects.toThrow(
      D15_SOLO_LO_PROPIO,
    )
  })
})

describe('contrato §4.1 y §4.2: el servidor resuelve al alumno (dependencia 51)', () => {
  // Antes el alumno viajaba en la query o en el cuerpo y el mock tenía que comprobar que fuera el
  // propio (403 D15). Con la 51 el servidor lo deduce del token, así que el 403 no se relajó: se
  // volvió inexpresable. Lo que se fija acá es que el campo YA NO SE LEE — no que no se mande —,
  // porque un cliente viejo que lo siga mandando no debe poder apuntar a otra persona.
  it('un codAlumno ajeno en la query de pendientes se ignora y llega lo propio', async () => {
    await iniciarComo('alumno.lopez')
    const pendientes = await sigeda.lista<{ idTurnoTeorico: number }>('/api/examenes/pendientes', {
      codAlumno: '666666',
    })
    expect(pendientes.map((pendiente) => pendiente.idTurnoTeorico)).toEqual([3])
  })

  it('un codAlumno ajeno en el cuerpo de iniciar se ignora y el examen es del llamador', async () => {
    await iniciarComo('alumno.lopez')
    // 666666 no está habilitado en el turno 3: si el mock leyera el cuerpo, esto sería 403 D9.
    const examen = await sigeda.post<{ codAlumno: string; id: number }>('/api/turnos-teoricos/3/iniciar', {
      codAlumno: '666666',
    })
    expect([examen.id, examen.codAlumno]).toEqual([3, '111111'])
  })

  it('un codAlumno ajeno en el cuerpo de respuestas o de entregar no abre el examen de otro', async () => {
    await iniciarComo('alumno.lopez')
    // El id del EXAMEN sí viaja en la URL, así que acá el 403 sobrevive: el 1 es de 555555.
    await expect(
      sigeda.put('/api/cuestionarios/1/respuestas', { codAlumno: '555555', respuestas: [] }),
    ).rejects.toThrow(D15_SOLO_LO_PROPIO)
    await expect(sigeda.post('/api/cuestionarios/1/entregar', { codAlumno: '555555' })).rejects.toThrow(
      D15_SOLO_LO_PROPIO,
    )
  })

  it('un codAlumno ajeno en la query de mi-cuestionario no trae el examen de otro', async () => {
    await iniciarComo('alumno.lopez')
    // El cuestionario 2 del turno 1 es de 666666; lopez no tiene ninguno ahí.
    await expect(sigeda.get('/api/turnos-teoricos/1/mi-cuestionario', { codAlumno: '666666' })).rejects.toThrow(
      D12_EXAMEN_NO_EXISTE,
    )
  })
})

describe('contrato §4.4 califica por id, no por texto', () => {
  // §2.3 permite dos alternativas que difieran solo en tildes: su regla de unicidad ignora
  // mayúsculas y espacios extremos, no acentos. El mock comparaba texto normalizado para todos
  // los tipos, así que marcaba correcta cualquiera de las dos. El contrato §4.4 punto 1 compara
  // el id. Sin el arreglo esta prueba falla con correcto: true.
  it('dos alternativas que solo difieren en la tilde no se confunden', async () => {
    await iniciarComo('alumno.lopez')
    const examen = await iniciarExamen(3)
    const idPregunta = examen.preguntas[0].idPregunta
    const alternativas = alternativasDePregunta(idPregunta)
    const correcta = alternativas.find((alternativa) => alternativa.correcto)!
    const gemela = alternativas.find((alternativa) => !alternativa.correcto)!
    gemela.respuesta = correcta.respuesta.replace(/a/i, 'á')
    expect(gemela.respuesta).not.toBe(correcta.respuesta)

    // Se afirma sobre la nota y no sobre calificaciones[] porque §4.6 devuelve el arreglo vacío
    // al propio alumno mientras su turno no está FINALIZADO, y el turno 3 es el abierto. Con solo
    // esa pregunta respondida, la nota es 0 si el id no coincide y el puntaje de la pregunta si
    // se la marcara correcta por texto.
    await guardarRespuestas(examen.id, [{ idPregunta, respuesta: String(gemela.id) }])
    const entregado = await entregarExamen(examen.id)
    expect(entregado.nota).toBe(0)
    expect(entregado.aprobado).toBe(false)
  })
})

describe('contrato §4.1 exámenes pendientes', () => {
  it('CA-EXA-01 lista los turnos habilitados sin entregar, ordenados por fecha y hora', async () => {
    await iniciarComo('alumno.torres')
    const pendientes = await listarExamenesPendientes()
    expect(pendientes.map((pendiente) => [pendiente.idTurnoTeorico, pendiente.estadoRendicion])).toEqual([
      [5, 'NO_RINDIO'],
      [4, 'NO_RINDIO'],
    ])
    expect(pendientes[0]).toMatchObject({
      nombre: 'Subsanación Adoctrinamiento de Vuelo',
      materia: 'Adoctrinamiento de Vuelo',
      tipoExamen: 'SUBSANACION',
      notaMinimaAplicada: 18,
      cantPreguntas: 5,
      idCuestionario: null,
    })
  })

  it('CA-EXA-01 el examen en curso llega con su id y su estado', async () => {
    await iniciarComo('alumno.lopez')
    const pendientes = await listarExamenesPendientes()
    expect(pendientes.map((pendiente) => [pendiente.idTurnoTeorico, pendiente.idCuestionario, pendiente.estadoRendicion])).toEqual([
      [3, 3, 'EN_CURSO'],
    ])
  })

  it('CA-EXA-01 sin pendientes el 404 D17 llega como lista vacía', async () => {
    await iniciarComo('alumno.falconi')
    expect(await listarExamenesPendientes()).toEqual([])
  })
})

describe('contrato §4.2 iniciar el examen', () => {
  it('CA-EXA-03 no expone la alternativa correcta, la respuesta esperada ni la explicación', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    const examen = await iniciarExamen(3)
    expect(examen.id).toBe(3)
    expect(examen.puntajeTotal).toBe(20)
    expect(examen.preguntas.map((pregunta) => pregunta.orden)).toEqual([1, 2, 3, 4, 5])
    expect(JSON.stringify(examen)).not.toContain('correcto')
    expect(JSON.stringify(examen)).not.toContain('explicacion')
    const completar = examen.preguntas.find((pregunta) => pregunta.tipoPregunta === 'COMPLETAR')
    expect(completar?.alternativas).toEqual([])
  })

  it('CA-EXA-08 es idempotente: devuelve el mismo examen con las respuestas guardadas', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    const primero = await iniciarExamen(3)
    const segundo = await iniciarExamen(3)
    expect(segundo.id).toBe(primero.id)
    expect(segundo.preguntas.map((pregunta) => pregunta.idPregunta)).toEqual(
      primero.preguntas.map((pregunta) => pregunta.idPregunta),
    )
    expect(segundo.preguntas[0]?.respuestaAlumno).toBe(idCorrecta(1))
    expect(datos().cuestionarios.filter((cuestionario) => cuestionario.idTurnoTeorico === 3)).toHaveLength(1)
  })

  it('CA-EXA-02 CA-EXA-11 CA-EXA-12 responde D8, D10 y D9 en sus casos', async () => {
    await iniciarComo('alumno.torres')
    await expect(iniciarExamen(4)).rejects.toThrow(D8_EXAMEN_NO_DISPONIBLE)
    await iniciarComo('alumno.garcia')
    await expect(iniciarExamen(1)).rejects.toThrow(D10_EXAMEN_ENTREGADO)
    await expect(iniciarExamen(5)).rejects.toThrow(D9_ALUMNO_NO_HABILITADO)
  })
})

describe('contrato §4.3 autoguardado', () => {
  it('CA-EXA-05 reemplaza el conjunto completo de respuestas', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    await guardarRespuestas(3, [{ idPregunta: 2, respuesta: idCorrecta(2) }])
    expect(Object.keys(cuestionarioDe(3, '111111')?.respuestas ?? {})).toEqual(['2'])
    await guardarRespuestas(3, [])
    expect(cuestionarioDe(3, '111111')?.respuestas).toEqual({})
  })

  it('CA-EXA-05 valida la pregunta, la alternativa y el largo de una respuesta de completar', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    const ajena = (await guardarRespuestas(3, [{ idPregunta: 17, respuesta: '1' }]).catch(
      (problema: unknown) => problema,
    )) as ApiError
    expect(ajena.erroresDeCampo['respuestas[0].idPregunta']).toBe('La pregunta no pertenece a este examen.')
    const mala = (await guardarRespuestas(3, [{ idPregunta: 1, respuesta: '999' }]).catch(
      (problema: unknown) => problema,
    )) as ApiError
    expect(mala.erroresDeCampo['respuestas[0].respuesta']).toBe('La alternativa no pertenece a esta pregunta.')
    const larga = (await guardarRespuestas(3, [{ idPregunta: 4, respuesta: 'x'.repeat(201) }]).catch(
      (problema: unknown) => problema,
    )) as ApiError
    expect(larga.erroresDeCampo['respuestas[0].respuesta']).toBe('La respuesta no puede superar los 200 caracteres.')
  })

  it('CA-EXA-11 un examen ajeno o inexistente responde D15 y D12', async () => {
    await iniciarComo('alumno.lopez')
    await expect(guardarRespuestas(1, [])).rejects.toThrow(D15_SOLO_LO_PROPIO)
    await expect(guardarRespuestas(99, [])).rejects.toThrow(D12_EXAMEN_NO_EXISTE)
  })
})

describe('contrato §4.4 entregar y calificar', () => {
  it('CA-RES-03 califica sobre 20 con la nota mínima aplicada del servidor', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    await guardarRespuestas(3, [
      { idPregunta: 1, respuesta: idCorrecta(1) },
      { idPregunta: 2, respuesta: idIncorrecta(2) },
      { idPregunta: 3, respuesta: idCorrecta(3) },
      { idPregunta: 4, respuesta: '  REGULAR  ' },
      { idPregunta: 5, respuesta: idCorrecta(5) },
    ])
    const resultado = await entregarExamen(3)
    expect(resultado.nota).toBe(16)
    expect(resultado.notaMinimaAplicada).toBe(18)
    expect(resultado.aprobado).toBe(false)
    expect(resultado.estado).toBe('ENTREGADO')
    expect(resultado.calificaciones).toEqual([])
    const guardado = cuestionarioDe(3, '111111')
    expect(guardado?.calificaciones.filter((fila) => fila.correcto).map((fila) => fila.idPregunta)).toEqual([1, 3, 4, 5])
    await expect(entregarExamen(3)).rejects.toThrow(D10_EXAMEN_ENTREGADO)
  })

  it('CA-EXA-09 CA-EXA-10 tras cerrar la ventana el servidor entrega y responde D11', async () => {
    const { avanzar } = relojFalso()
    abrirVentanaDeExamen({ restantes: 10 })
    await iniciarComo('alumno.lopez')
    await avanzar(11 * 60_000)
    await expect(guardarRespuestas(3, [])).rejects.toThrow(D11_VENTANA_CERRADA)
    const cerrado = cuestionarioDe(3, '111111')
    expect(cerrado?.estado).toBe('ENTREGADO')
    expect(cerrado?.nota).toBe(4)
    expect(cerrado?.horaEntrega).toBe('09:10')
    await expect(entregarExamen(3)).rejects.toThrow(D11_VENTANA_CERRADA)
  })
})

describe('contrato §4.5 y §4.6 leer el resultado', () => {
  it('CA-RES-08 con el turno finalizado el detalle incluye enunciado, respuestas y explicación', async () => {
    await iniciarComo('alumno.torres')
    const examen = await obtenerMiExamen(1)
    expect(examen.nota).toBe(12)
    expect(examen.aprobado).toBe(false)
    expect(examen.turnoTeorico).toEqual({ id: 1, nombre: 'Mensual Adoctrinamiento de Vuelo', estado: 'FINALIZADO' })
    expect(examen.calificaciones).toHaveLength(5)
    expect(examen.calificaciones[0]).toMatchObject({
      respuestaAlumno: 'El PDI EA-510',
      respuestaCorrecta: 'El PDI EA-510',
      explicacion: 'El PDI EA-510 es el plan de instrucción vigente del curso.',
      correcto: true,
      puntajeObtenido: 4,
    })
  })

  it('CA-RES-07 mientras el turno no termina el alumno recibe la nota sin las calificaciones', async () => {
    relojFalso()
    abrirVentanaDeExamen()
    await iniciarComo('alumno.lopez')
    await entregarExamen(3)
    const examen = await obtenerMiExamen(3)
    expect(examen.estado).toBe('ENTREGADO')
    expect(examen.nota).toBe(4)
    expect(examen.notaMinimaAplicada).toBe(18)
    expect(examen.calificaciones).toEqual([])
  })

  it('CA-RES-09 mi-cuestionario responde D12 en un turno sin examen propio', async () => {
    await iniciarComo('alumno.lopez')
    await expect(obtenerMiExamen(1)).rejects.toThrow(D12_EXAMEN_NO_EXISTE)
    await expect(obtenerMiExamen(4)).rejects.toThrow(D12_EXAMEN_NO_EXISTE)
  })

  it('con Manage Exams el detalle de cualquier examen llega completo', async () => {
    await iniciarComo('instructor.perez')
    const examen = await obtenerExamen(2)
    expect(examen.alumno).toBe('Ana Torres Martinez')
    expect(examen.calificaciones).toHaveLength(5)
  })
})

describe('contrato §5.1 estado teórico', () => {
  it('CA-RES-06 el alumno 666666 queda bloqueado con su motivo, su desaprobado y su pendiente', async () => {
    await iniciarComo('jefe.operaciones')
    const estado = await obtenerEstadoTeorico('666666')
    expect(estado.bloqueadoPorSubsanacion).toBe(true)
    expect(estado.motivo).toBe(
      'Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.',
    )
    expect(estado.desaprobados.map((fila) => fila.idCuestionario)).toEqual([2])
    expect(estado.pendientes.map((fila) => fila.idTurnoTeorico)).toEqual([5])
  })

  it('CA-RES-10 el resto de las personas responde sin bloqueo y un código inexistente da 404', async () => {
    await iniciarComo('jefe.operaciones')
    for (const codigo of ['111111', '222222', '555555', '777777', '999999', '654321', '333333']) {
      const estado = await obtenerEstadoTeorico(codigo)
      expect([estado.bloqueadoPorSubsanacion, estado.motivo, estado.desaprobados, estado.pendientes]).toEqual([
        false,
        null,
        [],
        [],
      ])
    }
    await expect(obtenerEstadoTeorico('000999')).rejects.toThrow('Persona especificada no existe.')
  })

  it('M4-2 un alumno no consulta el estado teórico de otro', async () => {
    await iniciarComo('alumno.lopez')
    expect((await obtenerEstadoTeorico('111111')).codAlumno).toBe('111111')
    await expect(obtenerEstadoTeorico('666666')).rejects.toThrow(D15_SOLO_LO_PROPIO)
  })
})
