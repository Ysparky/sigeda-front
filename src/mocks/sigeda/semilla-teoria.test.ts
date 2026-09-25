import { describe, expect, it } from 'vitest'
import { estadoDeVentana } from '@/lib/dominio/teoria'
import {
  alternativasDePregunta,
  cuestionarioDe,
  datos,
  materiaEnUso,
  preguntaEnUso,
  preguntasDelTurno,
} from './datos'
import { minimoAplicado, PUNTAJE_POR_PREGUNTA } from './semilla-teoria'

describe('contrato §9.1 preguntas de la semilla', () => {
  it('siembra 24 preguntas con ids de 1 a 24 y 71 alternativas', () => {
    expect(datos().preguntas.map((pregunta) => pregunta.id)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
    expect(datos().alternativas).toHaveLength(71)
    expect(datos().alternativas.at(-1)?.id).toBe(71)
    expect(datos().secuencias.alternativa).toBe(101)
    expect(datos().secuencias.pregunta).toBe(25)
  })

  it('la materia 3 tiene diez preguntas y cada dificultad devuelve al menos dos filas', () => {
    const materia3 = datos().preguntas.filter((pregunta) => pregunta.idMateria === 3)
    expect(materia3).toHaveLength(10)
    for (const dificultad of ['BAJA', 'MEDIA', 'ALTA']) {
      expect(materia3.filter((pregunta) => pregunta.dificultad === dificultad).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('cada materia sembrada tiene los tres tipos de pregunta y las ids 9 y 10 son de IA', () => {
    for (const idMateria of [3, 6, 4, 1]) {
      const tipos = new Set(datos().preguntas.filter((p) => p.idMateria === idMateria).map((p) => p.tipoPregunta))
      expect([...tipos].sort()).toEqual(['COMPLETAR', 'OPCION_MULTIPLE', 'VERDADERO_FALSO'])
    }
    expect(datos().preguntas.filter((pregunta) => pregunta.origen === 'IA').map((pregunta) => pregunta.id)).toEqual([9, 10])
  })

  it('cada tipo respeta sus alternativas y su marcador', () => {
    for (const pregunta of datos().preguntas) {
      const alternativas = alternativasDePregunta(pregunta.id)
      expect(alternativas.filter((alternativa) => alternativa.correcto)).toHaveLength(1)
      if (pregunta.tipoPregunta === 'OPCION_MULTIPLE') expect(alternativas).toHaveLength(4)
      if (pregunta.tipoPregunta === 'VERDADERO_FALSO') {
        expect(alternativas.map((alternativa) => alternativa.respuesta)).toEqual(['Verdadero', 'Falso'])
      }
      if (pregunta.tipoPregunta === 'COMPLETAR') {
        expect(alternativas).toHaveLength(1)
        expect(pregunta.enunciado).toContain('_____')
      }
    }
  })

  it('CA-BAN-11 solo las preguntas 16, 22, 23 y 24 se pueden eliminar', () => {
    const borrables = datos().preguntas.filter((pregunta) => !preguntaEnUso(pregunta.id)).map((pregunta) => pregunta.id)
    expect(borrables).toEqual([16, 22, 23, 24])
  })

  it('M4-18 el 409 de materias queda derivado de las preguntas y los turnos', () => {
    expect(datos().materias.filter((materia) => materiaEnUso(materia.id)).map((materia) => materia.id)).toEqual([1, 3, 4, 6])
    expect(Object.keys(datos().materias[0] ?? {})).not.toContain('conPreguntas')
  })
})

describe('contrato §9.2 turnos teóricos de la semilla', () => {
  it('siembra cinco turnos del instructor 444444 con 20 puntos cada uno', () => {
    expect(datos().turnosTeoricos.map((turno) => turno.id)).toEqual([1, 2, 3, 4, 5])
    expect(datos().secuencias.turnoTeorico).toBe(6)
    for (const turno of datos().turnosTeoricos) {
      expect(turno.codInstructor).toBe('444444')
      const preguntas = preguntasDelTurno(turno.id)
      expect(preguntas).toHaveLength(5)
      expect(preguntas.map((fila) => fila.orden)).toEqual([1, 2, 3, 4, 5])
      expect(preguntas.reduce((total, fila) => total + fila.puntajeMaximo, 0)).toBe(20)
      expect(PUNTAJE_POR_PREGUNTA).toBe(4)
    }
  })

  it('M4-19 el turno 3 abre todo el día con 00:00–23:59 y los demás quedan en su estado', () => {
    const turno3 = datos().turnosTeoricos[2]
    expect([turno3?.horaInicio, turno3?.horaFin]).toEqual(['00:00', '23:59'])
    expect(estadoDeVentana(turno3?.fechaExamen ?? '', '00:00', '23:59')).toBe('EN_CURSO')
    const estados = datos().turnosTeoricos.map((turno) => estadoDeVentana(turno.fechaExamen, turno.horaInicio, turno.horaFin))
    expect(estados).toEqual(['FINALIZADO', 'FINALIZADO', 'EN_CURSO', 'PROGRAMADO', 'PROGRAMADO'])
  })

  it('el turno 5 es una subsanación del turno 1 sobre la misma materia y grupo', () => {
    const subsanacion = datos().turnosTeoricos[4]
    expect(subsanacion?.tipoExamen).toBe('SUBSANACION')
    expect(subsanacion?.idTurnoOrigen).toBe(1)
    expect(subsanacion?.idMateria).toBe(3)
    expect(subsanacion?.idGrupo).toBe(3)
  })
})

describe('contrato §9.3 exámenes de la semilla', () => {
  it('siembra tres exámenes con las notas exactas 20.00, 12.00 y ninguna', () => {
    expect(datos().cuestionarios.map((cuestionario) => [cuestionario.id, cuestionario.codAlumno, cuestionario.nota])).toEqual([
      [1, '555555', 20],
      [2, '666666', 12],
      [3, '111111', null],
    ])
    expect(datos().secuencias.cuestionario).toBe(4)
  })

  it('CA-RES-13 el mínimo aplicado es el de la materia salvo en un Pre-Solo', () => {
    expect(minimoAplicado(16, 'MENSUAL')).toBe(16)
    expect(minimoAplicado(16, 'PRE_SOLO')).toBe(18)
    expect(minimoAplicado(20, 'PRE_SOLO')).toBe(20)
    expect(cuestionarioDe(1, '666666')?.notaMinimaAplicada).toBe(18)
    expect(cuestionarioDe(1, '666666')?.aprobado).toBe(false)
    expect(cuestionarioDe(1, '555555')?.aprobado).toBe(true)
  })

  it('el examen 2 acierta las preguntas 1, 2 y 4 y suma 12 puntos', () => {
    const examen = cuestionarioDe(1, '666666')
    expect(examen?.calificaciones.filter((fila) => fila.correcto).map((fila) => fila.idPregunta)).toEqual([1, 2, 4])
    expect(examen?.calificaciones.reduce((total, fila) => total + fila.puntajeObtenido, 0)).toBe(12)
    expect(examen?.calificaciones.every((fila) => fila.enunciado !== '' && fila.respuestaCorrecta !== '')).toBe(true)
  })

  it('el examen 3 está en curso con dos respuestas guardadas y sin calificaciones', () => {
    const examen = cuestionarioDe(3, '111111')
    expect(examen?.estado).toBe('EN_CURSO')
    expect(Object.keys(examen?.respuestas ?? {})).toEqual(['1', '3'])
    expect(examen?.calificaciones).toEqual([])
    expect(cuestionarioDe(2, '222222')).toBeUndefined()
  })
})
