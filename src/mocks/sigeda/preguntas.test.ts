import { describe, expect, it } from 'vitest'
import { ApiError, MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import {
  crearPregunta,
  eliminarPregunta,
  importarPreguntas,
  listarPreguntas,
  obtenerPregunta,
  modificarPregunta,
  type CuerpoPregunta,
} from '@/features/preguntas/api'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'
import { D2_PREGUNTA_NO_EXISTE, D3_PREGUNTA_EN_USO, D4_MATERIA_NO_EXISTE, D27_PERSONA_NO_EXISTE } from './preguntas'

const PARAMETROS = { page: 0, size: 10, direction: 'ASC' } as const

const NUEVA: CuerpoPregunta = {
  codInstructor: '444444',
  idMateria: 5,
  enunciado: '¿Cuál es el procedimiento normal de encendido del motor?',
  tipoPregunta: 'OPCION_MULTIPLE',
  dificultad: 'MEDIA',
  explicacion: null,
  alternativas: [
    { respuesta: 'El del manual de vuelo', correcto: true },
    { respuesta: 'El que indique el alumno', correcto: false },
    { respuesta: 'Cualquiera', correcto: false },
    { respuesta: 'Ninguno', correcto: false },
  ],
}

async function comoInstructor() {
  await iniciarComo('instructor.perez')
}

describe('contrato §2.1 lista de preguntas', () => {
  it('CA-BAN-01 pagina de 10 en 10 y devuelve la fila plana del contrato', async () => {
    await comoInstructor()
    const pagina = await listarPreguntas(PARAMETROS)
    expect(pagina.total).toBe(24)
    expect(pagina.totalPages).toBe(3)
    expect(pagina.items).toHaveLength(10)
    expect(pagina.items[0]).toEqual({
      id: 1,
      idMateria: 3,
      materia: 'Adoctrinamiento de Vuelo',
      enunciado: '¿Qué documento fija la conducta del alumno piloto durante la instrucción?',
      tipoPregunta: 'OPCION_MULTIPLE',
      dificultad: 'MEDIA',
      origen: 'MANUAL',
      enUso: true,
      cantAlternativas: 4,
    })
  })

  it('CA-BAN-01 el servidor ordena por la propiedad y la dirección pedidas', async () => {
    await comoInstructor()
    const pagina = await listarPreguntas({ ...PARAMETROS, property: 'id', direction: 'DESC' })
    expect(pagina.items.map((fila) => fila.id)).toEqual([24, 23, 22, 21, 20, 19, 18, 17, 16, 15])
  })

  it('CA-BAN-02 combina los filtros con AND e ignora un valor inválido', async () => {
    await comoInstructor()
    expect((await listarPreguntas({ ...PARAMETROS, idMateria: 3 })).total).toBe(10)
    expect((await listarPreguntas({ ...PARAMETROS, idMateria: 3, dificultad: 'MEDIA' })).total).toBe(4)
    expect((await listarPreguntas({ ...PARAMETROS, origen: 'IA' })).items.map((fila) => fila.id)).toEqual([9, 10])
    expect((await listarPreguntas({ ...PARAMETROS, tipo: 'COMPLETAR' })).total).toBe(5)
    expect((await listarPreguntas({ ...PARAMETROS, dificultad: 'URGENTE' as never })).total).toBe(24)
  })

  it('CA-BAN-02 el filtro de texto no distingue mayúsculas ni tildes', async () => {
    await comoInstructor()
    expect((await listarPreguntas({ ...PARAMETROS, texto: 'MANIOBRA' })).items.map((fila) => fila.id)).toEqual([4, 7, 9, 11])
    expect((await listarPreguntas({ ...PARAMETROS, texto: 'AUTORROTACION' })).items.map((fila) => fila.id)).toEqual([14])
  })

  it('CA-BAN-13 una lista vacía llega como 404 D1 y el cliente la ve vacía', async () => {
    await comoInstructor()
    const pagina = await listarPreguntas({ ...PARAMETROS, texto: 'no existe nada así' })
    expect(pagina.items).toEqual([])
    expect(pagina.total).toBe(0)
  })
})

describe('contrato §2.2 y §2.3 detalle y creación', () => {
  it('CA-BAN-09 el detalle anida la materia, ordena las alternativas y admite explicación nula', async () => {
    await comoInstructor()
    const pregunta = await obtenerPregunta(1)
    expect(pregunta.materia).toEqual({ id: 3, nombre: 'Adoctrinamiento de Vuelo', notaMinima: 18 })
    expect(pregunta.alternativas.map((alternativa) => alternativa.id)).toEqual([1, 2, 3, 4])
    expect(pregunta.alternativas.filter((alternativa) => alternativa.correcto)).toHaveLength(1)
    expect(pregunta.explicacion).toBe('El PDI EA-510 es el plan de instrucción vigente del curso.')
    expect((await obtenerPregunta(2)).explicacion).toBeNull()
  })

  it('M4-3 el servidor fija origen MANUAL y devuelve D20', async () => {
    await comoInstructor()
    expect(await crearPregunta(NUEVA)).toBe('Pregunta guardada con éxito.')
    const creada = await obtenerPregunta(25)
    expect(creada.origen).toBe('MANUAL')
    expect(creada.alternativas.map((alternativa) => alternativa.id)).toEqual([101, 102, 103, 104])
  })

  it('CA-BAN-12 devuelve los errores de campo del contrato, con índice en las alternativas', async () => {
    await comoInstructor()
    const error = await crearPregunta({
      ...NUEVA,
      enunciado: 'corto',
      alternativas: [
        { respuesta: '', correcto: true },
        { respuesta: 'b', correcto: false },
        { respuesta: 'c', correcto: false },
        { respuesta: 'd', correcto: false },
      ],
    }).catch((problema: unknown) => problema)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).erroresDeCampo).toEqual({
      enunciado: 'El enunciado debe tener entre 10 y 500 caracteres.',
      'alternativas[0].respuesta': 'La respuesta es obligatoria.',
    })
  })

  it('CA-BAN-05 CA-BAN-06 CA-BAN-07 valida las alternativas de cada tipo', async () => {
    await comoInstructor()
    const tresAlternativas = await crearPregunta({ ...NUEVA, alternativas: NUEVA.alternativas.slice(0, 3) }).catch(
      (problema: unknown) => problema,
    )
    expect((tresAlternativas as ApiError).erroresDeCampo.alternativas).toBe(
      'Una pregunta de opción múltiple debe tener exactamente 4 alternativas.',
    )
    const vfMalo = await crearPregunta({
      ...NUEVA,
      tipoPregunta: 'VERDADERO_FALSO',
      alternativas: [
        { respuesta: 'Sí', correcto: true },
        { respuesta: 'No', correcto: false },
      ],
    }).catch((problema: unknown) => problema)
    expect((vfMalo as ApiError).erroresDeCampo.alternativas).toBe(
      'Una pregunta de verdadero o falso debe tener exactamente las alternativas Verdadero y Falso.',
    )
    const sinMarcador = await crearPregunta({
      ...NUEVA,
      tipoPregunta: 'COMPLETAR',
      alternativas: [{ respuesta: 'autorrotación', correcto: true }],
    }).catch((problema: unknown) => problema)
    expect((sinMarcador as ApiError).erroresDeCampo.enunciado).toBe(
      'El enunciado de una pregunta de completar debe incluir el marcador _____.',
    )
    const dosCorrectas = await crearPregunta({
      ...NUEVA,
      alternativas: NUEVA.alternativas.map((alternativa) => ({ ...alternativa, correcto: true })),
    }).catch((problema: unknown) => problema)
    expect((dosCorrectas as ApiError).erroresDeCampo.alternativas).toBe(
      'Debe marcar exactamente una alternativa como correcta.',
    )
    const repetidas = await crearPregunta({
      ...NUEVA,
      alternativas: [
        { respuesta: 'Igual', correcto: true },
        { respuesta: ' igual ', correcto: false },
        { respuesta: 'c', correcto: false },
        { respuesta: 'd', correcto: false },
      ],
    }).catch((problema: unknown) => problema)
    expect((repetidas as ApiError).erroresDeCampo.alternativas).toBe('Las alternativas no pueden repetirse.')
  })

  it('contrato §2.3 responde 404 D4 y D27 para la materia y el instructor inexistentes', async () => {
    await comoInstructor()
    await expect(crearPregunta({ ...NUEVA, idMateria: 99 })).rejects.toThrow(D4_MATERIA_NO_EXISTE)
    await expect(crearPregunta({ ...NUEVA, codInstructor: '000999' })).rejects.toThrow(D27_PERSONA_NO_EXISTE)
  })
})

describe('contrato §2.4 y §2.5 modificar y eliminar', () => {
  it('CA-BAN-10 modificar conserva el origen de una pregunta importada', async () => {
    await comoInstructor()
    const antes = await obtenerPregunta(9)
    expect(antes.origen).toBe('IA')
    await modificarPregunta(9, {
      codInstructor: '444444',
      idMateria: antes.materia.id,
      enunciado: 'Enunciado corregido a mano después de importarlo desde la IA.',
      tipoPregunta: antes.tipoPregunta,
      dificultad: antes.dificultad,
      explicacion: antes.explicacion,
      alternativas: antes.alternativas.map(({ respuesta, correcto }) => ({ respuesta, correcto })),
    })
    const despues = await obtenerPregunta(9)
    expect(despues.origen).toBe('IA')
    expect(despues.enunciado).toBe('Enunciado corregido a mano después de importarlo desde la IA.')
    await expect(modificarPregunta(999, NUEVA)).rejects.toThrow(D2_PREGUNTA_NO_EXISTE)
  })

  it('CA-BAN-11 eliminar responde 409 D3 si está en uso y 200 D18 si no', async () => {
    await comoInstructor()
    await expect(eliminarPregunta(1)).rejects.toThrow(D3_PREGUNTA_EN_USO)
    expect(await eliminarPregunta(16)).toBe('Pregunta eliminado con éxito.')
    expect(datos().preguntas.some((pregunta) => pregunta.id === 16)).toBe(false)
    expect(datos().alternativas.some((alternativa) => alternativa.idPregunta === 16)).toBe(false)
    await expect(eliminarPregunta(16)).rejects.toThrow(D2_PREGUNTA_NO_EXISTE)
  })
})

describe('contrato §2.6 lote', () => {
  it('CA-IMP-10 guarda todas con origen IA y en el orden recibido', async () => {
    await comoInstructor()
    const mensaje = await importarPreguntas({
      codInstructor: '444444',
      preguntas: [
        { ...NUEVA, codInstructor: undefined } as never,
        { ...NUEVA, enunciado: 'Otro enunciado generado por la IA para el banco.' } as never,
      ],
    })
    expect(mensaje).toBe('Preguntas guardadas con éxito.')
    expect((await obtenerPregunta(25)).origen).toBe('IA')
    expect((await obtenerPregunta(26)).enunciado).toBe('Otro enunciado generado por la IA para el banco.')
  })

  it('contrato §2.6 el lote responde con la forma de detalle de §2.2, no la fila plana de §2.1', async () => {
    await comoInstructor()
    const respuesta = await sigeda.post<{ mensaje: string; preguntas: unknown[] }>('/api/preguntas/lote', {
      codInstructor: '444444',
      preguntas: [NUEVA],
    })
    const primera = respuesta.preguntas[0] as Record<string, unknown>
    expect(primera.materia).toEqual({ id: 5, nombre: 'Procedimientos Normales', notaMinima: 16 })
    expect(primera.alternativas).toHaveLength(4)
    expect(primera.idMateria).toBeUndefined()
    expect(primera.cantAlternativas).toBeUndefined()
  })

  it('CA-IMP-09 rechaza el lote completo señalando la fila', async () => {
    await comoInstructor()
    const error = await importarPreguntas({
      codInstructor: '444444',
      preguntas: [NUEVA, { ...NUEVA, enunciado: 'corto' }],
    }).catch((problema: unknown) => problema)
    expect((error as ApiError).erroresDeCampo['preguntas[1].enunciado']).toBe(
      'El enunciado debe tener entre 10 y 500 caracteres.',
    )
    expect(datos().preguntas).toHaveLength(24)
  })

  it('contrato §2.6 rechaza un lote vacío, uno de más de 20 y los enunciados repetidos dentro del lote', async () => {
    await comoInstructor()
    const vacio = await importarPreguntas({ codInstructor: '444444', preguntas: [] }).catch((p: unknown) => p)
    expect((vacio as ApiError).erroresDeCampo.preguntas).toBe('Debe enviar al menos una pregunta.')
    const muchas = await importarPreguntas({
      codInstructor: '444444',
      preguntas: Array.from({ length: 21 }, (_, indice) => ({ ...NUEVA, enunciado: `Enunciado generado numero ${indice}.` })),
    }).catch((p: unknown) => p)
    expect((muchas as ApiError).erroresDeCampo.preguntas).toBe('No se pueden importar más de 20 preguntas a la vez.')
    const repetida = await importarPreguntas({ codInstructor: '444444', preguntas: [NUEVA, { ...NUEVA }] }).catch(
      (p: unknown) => p,
    )
    expect((repetida as ApiError).erroresDeCampo['preguntas[1].enunciado']).toBe('La pregunta está repetida en este lote.')
  })
})

describe('permisos del banco', () => {
  it('CA-BAN-14 un alumno no alcanza el banco de preguntas', async () => {
    await iniciarComo('alumno.lopez')
    await expect(listarPreguntas(PARAMETROS)).rejects.toThrow(MENSAJE_SIN_PERMISO)
  })
})
