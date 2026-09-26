import { sumarDias } from '@/lib/dominio/calendario'

export type TipoPreguntaMock = 'OPCION_MULTIPLE' | 'VERDADERO_FALSO' | 'COMPLETAR'

export type DificultadMock = 'BAJA' | 'MEDIA' | 'ALTA'

export type OrigenMock = 'MANUAL' | 'IA'

export type TipoExamenMock =
  | 'TEST'
  | 'EXAMEN'
  | 'SEMANAL'
  | 'QUINCENAL'
  | 'MENSUAL'
  | 'SEMESTRAL'
  | 'INOPINADO'
  | 'PRE_SOLO'
  | 'SUBSANACION'
  | 'REZAGADO'
  | 'BALOTAS'

export type EstadoCuestionarioMock = 'EN_CURSO' | 'ENTREGADO'

export type PreguntaMock = {
  id: number
  idMateria: number
  enunciado: string
  tipoPregunta: TipoPreguntaMock
  dificultad: DificultadMock
  explicacion: string | null
  origen: OrigenMock
  codInstructor: string
}

export type AlternativaMock = { id: number; idPregunta: number; respuesta: string; correcto: boolean }

export type TurnoTeoricoMock = {
  id: number
  nombre: string
  idMateria: number
  tipoExamen: TipoExamenMock
  fechaExamen: string
  horaInicio: string
  horaFin: string
  idGrupo: number
  codInstructor: string
  idTurnoOrigen: number | null
}

export type PreguntaTurnoMock = { idTurnoTeorico: number; idPregunta: number; orden: number; puntajeMaximo: number }

export type CalificacionTeoricaMock = {
  idPregunta: number
  orden: number
  enunciado: string
  respuestaCorrecta: string
  respuestaAlumno: string | null
  correcto: boolean
  puntajeMaximo: number
  puntajeObtenido: number
}

export type CuestionarioMock = {
  id: number
  idTurnoTeorico: number
  codAlumno: string
  estado: EstadoCuestionarioMock
  fechaEntrega: string | null
  horaEntrega: string | null
  nota: number | null
  notaMinimaAplicada: number
  aprobado: boolean | null
  orden: number[]
  respuestas: Record<number, string>
  calificaciones: CalificacionTeoricaMock[]
}

export type DatosTeoria = {
  preguntas: PreguntaMock[]
  alternativas: AlternativaMock[]
  turnosTeoricos: TurnoTeoricoMock[]
  preguntasTurno: PreguntaTurnoMock[]
  cuestionarios: CuestionarioMock[]
}

export const PUNTAJE_POR_PREGUNTA = 4

export const ID_TURNO_ABIERTO = 3

export const TEXTOS_VERDADERO_FALSO = ['Verdadero', 'Falso'] as const

export function minimoAplicado(notaMinima: number, tipoExamen: TipoExamenMock): number {
  return Math.max(notaMinima, tipoExamen === 'PRE_SOLO' ? 18 : 0)
}

type FilaPregunta = [
  id: number,
  idMateria: number,
  tipo: TipoPreguntaMock,
  dificultad: DificultadMock,
  origen: OrigenMock,
  enunciado: string,
  correcta: number,
  opciones: string[],
  explicacion: string | null,
]

const SEMILLA_PREGUNTAS: FilaPregunta[] = [
  [
    1,
    3,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    '¿Qué documento fija la conducta del alumno piloto durante la instrucción?',
    0,
    ['El PDI EA-510', 'El manual de vuelo de la aeronave', 'La orden de vuelo del día', 'El reglamento de tránsito aéreo'],
    'El PDI EA-510 es el plan de instrucción vigente del curso.',
  ],
  [
    2,
    3,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Quién aprueba la programación diaria de los turnos de vuelo?',
    2,
    ['El alumno piloto', 'El mecánico de línea', 'El Jefe de Operaciones', 'El instructor del turno'],
    null,
  ],
  [3, 3, 'VERDADERO_FALSO', 'ALTA', 'MANUAL', 'La última misión de cada subfase es un chequeo.', 0, [], 'El PDI EA-510 exige un chequeo al cerrar cada subfase.'],
  [4, 3, 'COMPLETAR', 'MEDIA', 'MANUAL', 'El instructor explica la maniobra cuando su nota mínima es _____.', 0, ['Regular'], null],
  [
    5,
    3,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Cuál es la calificación DIRBE que corresponde a un desempeño excelente?',
    2,
    ['R', 'B', 'E', 'I'],
    null,
  ],
  [
    6,
    3,
    'OPCION_MULTIPLE',
    'ALTA',
    'MANUAL',
    '¿Cuánto antes del vuelo se realiza el briefing de detalle?',
    0,
    ['Una hora', 'Dos horas', 'Tres horas', 'Media hora'],
    null,
  ],
  [
    7,
    3,
    'VERDADERO_FALSO',
    'MEDIA',
    'MANUAL',
    'El alumno expone la maniobra cuando su nota mínima es Bueno o Excelente.',
    0,
    [],
    null,
  ],
  [8, 3, 'COMPLETAR', 'BAJA', 'MANUAL', 'El debriefing del vuelo se registra como una _____ práctica.', 0, ['evaluación'], null],
  [
    9,
    3,
    'OPCION_MULTIPLE',
    'ALTA',
    'IA',
    '¿Qué se exige cuando una calificación queda bajo el estándar de la maniobra?',
    0,
    ['Observación, causa y recomendación', 'Solo una observación', 'Solo la firma del instructor', 'Nada en particular'],
    'El PDI EA-510 pide justificar toda calificación bajo el estándar.',
  ],
  [
    10,
    3,
    'OPCION_MULTIPLE',
    'MEDIA',
    'IA',
    '¿Qué ocurre si el alumno no aprueba la subsanación de un examen teórico?',
    0,
    ['No puede volar hasta aprobarla', 'Vuela con autorización del instructor', 'Pierde el curso de inmediato', 'Repite la materia completa'],
    null,
  ],
  [
    11,
    6,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Qué maniobra permite un descenso controlado sin potencia del motor?',
    0,
    ['La autorrotación', 'El vuelo estacionario', 'El viraje coordinado', 'El despegue vertical'],
    'En autorrotación el rotor gira por el flujo de aire ascendente.',
  ],
  [
    12,
    6,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    'Ante una falla de motor en crucero, ¿cuál es la primera acción del piloto?',
    0,
    ['Bajar el paso colectivo e ingresar en autorrotación', 'Aumentar el paso colectivo', 'Cerrar la válvula de combustible', 'Soltar los mandos'],
    null,
  ],
  [
    13,
    6,
    'VERDADERO_FALSO',
    'ALTA',
    'MANUAL',
    'Un incendio en vuelo se combate aumentando la potencia del motor.',
    1,
    [],
    'El procedimiento exige cortar el suministro de combustible, no aumentar potencia.',
  ],
  [
    14,
    6,
    'COMPLETAR',
    'BAJA',
    'MANUAL',
    'La velocidad recomendada para la autorrotación se indica en el manual de _____.',
    0,
    ['vuelo'],
    null,
  ],
  [
    15,
    6,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    '¿Qué indica la luz de advertencia de baja presión de aceite?',
    1,
    ['Un exceso de combustible', 'Una posible falla del sistema de lubricación', 'Una falla del sistema eléctrico', 'Un error del altímetro'],
    null,
  ],
  [
    16,
    6,
    'OPCION_MULTIPLE',
    'ALTA',
    'MANUAL',
    '¿Cada cuánto se practica el procedimiento de falla del rotor de cola?',
    0,
    ['En cada fase de instrucción', 'Una vez al año', 'Solo en el chequeo final', 'Nunca'],
    null,
  ],
  [
    17,
    4,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Dónde se encuentran los límites de operación de la aeronave?',
    0,
    ['En el manual de vuelo', 'En la orden de vuelo del día', 'En el PDI EA-510', 'En la hoja de briefing'],
    null,
  ],
  [
    18,
    4,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    '¿Qué instrumento indica las revoluciones del rotor principal?',
    0,
    ['El tacómetro', 'El altímetro', 'El variómetro', 'El horizonte artificial'],
    null,
  ],
  [
    19,
    4,
    'VERDADERO_FALSO',
    'ALTA',
    'MANUAL',
    'Exceder el límite de temperatura de turbina obliga a registrar el evento.',
    0,
    [],
    null,
  ],
  [20, 4, 'COMPLETAR', 'BAJA', 'MANUAL', 'El peso máximo de despegue de la aeronave es un límite de _____.', 0, ['operación'], null],
  [
    21,
    4,
    'OPCION_MULTIPLE',
    'MEDIA',
    'MANUAL',
    '¿Qué ocurre si se excede el límite de viento cruzado en el aterrizaje?',
    0,
    ['Se pierde autoridad de control direccional', 'Aumenta la sustentación', 'Se reduce el consumo', 'No ocurre nada'],
    null,
  ],
  [
    22,
    1,
    'OPCION_MULTIPLE',
    'BAJA',
    'MANUAL',
    '¿Qué componente genera la sustentación en un helicóptero?',
    0,
    ['El rotor principal', 'El rotor de cola', 'El estabilizador vertical', 'El tren de aterrizaje'],
    null,
  ],
  [23, 1, 'VERDADERO_FALSO', 'MEDIA', 'MANUAL', 'El efecto suelo aumenta la sustentación cerca de la superficie.', 0, [], null],
  [
    24,
    1,
    'COMPLETAR',
    'ALTA',
    'MANUAL',
    'La resistencia que aumenta con el ángulo de ataque se llama resistencia _____.',
    0,
    ['inducida'],
    null,
  ],
]

function respuestasDe(fila: FilaPregunta): string[] {
  return fila[2] === 'VERDADERO_FALSO' ? [...TEXTOS_VERDADERO_FALSO] : fila[7]
}

const SEMILLA_TURNOS: [
  id: number,
  nombre: string,
  idMateria: number,
  tipo: TipoExamenMock,
  dias: number,
  horaInicio: string,
  horaFin: string,
  idGrupo: number,
  preguntas: number[],
  idTurnoOrigen: number | null,
  puntajes?: number[],
][] = [
  [1, 'Mensual Adoctrinamiento de Vuelo', 3, 'MENSUAL', -7, '08:00', '09:00', 3, [1, 2, 3, 4, 5], null],
  [2, 'Test Procedimientos de Emergencias', 6, 'TEST', -5, '10:00', '10:30', 2, [11, 12, 13, 14, 15], null],
  [3, 'Semanal Adoctrinamiento de Vuelo', 3, 'SEMANAL', 0, '00:00', '23:59', 1, [1, 2, 3, 4, 5], null],
  [4, 'Quincenal Límites de Operación', 4, 'QUINCENAL', 3, '09:00', '10:00', 3, [17, 18, 19, 20, 21], null],
  [5, 'Subsanación Adoctrinamiento de Vuelo', 3, 'SUBSANACION', 1, '08:00', '09:00', 3, [6, 7, 8, 9, 10], 1],
  [6, 'Test Aerodinámica Aplicada a Helicópteros', 1, 'TEST', -12, '08:00', '09:00', 6, [22, 23, 24], null, [10, 7, 3]],
  [7, 'Subsanación Aerodinámica Aplicada a Helicópteros', 1, 'SUBSANACION', -11, '08:00', '09:00', 6, [22, 23, 24], 6, [10, 7, 3]],
]

export function crearTeoria(hoy: string): DatosTeoria {
  const ordenadas = [...SEMILLA_PREGUNTAS].sort((a, b) => a[0] - b[0])
  const preguntas = ordenadas.map<PreguntaMock>((fila) => ({
    id: fila[0],
    idMateria: fila[1],
    enunciado: fila[5],
    tipoPregunta: fila[2],
    dificultad: fila[3],
    explicacion: fila[8],
    origen: fila[4],
    codInstructor: '444444',
  }))
  const alternativas: AlternativaMock[] = []
  let idAlternativa = 1
  for (const fila of ordenadas) {
    respuestasDe(fila).forEach((respuesta, indice) => {
      alternativas.push({ id: idAlternativa, idPregunta: fila[0], respuesta, correcto: indice === fila[6] })
      idAlternativa += 1
    })
  }
  const turnosTeoricos = SEMILLA_TURNOS.map<TurnoTeoricoMock>((fila) => ({
    id: fila[0],
    nombre: fila[1],
    idMateria: fila[2],
    tipoExamen: fila[3],
    fechaExamen: sumarDias(hoy, fila[4]),
    horaInicio: fila[5],
    horaFin: fila[6],
    idGrupo: fila[7],
    codInstructor: '444444',
    idTurnoOrigen: fila[9],
  }))
  const preguntasTurno = SEMILLA_TURNOS.flatMap((fila) =>
    fila[8].map<PreguntaTurnoMock>((idPregunta, indice) => ({
      idTurnoTeorico: fila[0],
      idPregunta,
      orden: indice + 1,
      puntajeMaximo: fila[10]?.[indice] ?? PUNTAJE_POR_PREGUNTA,
    })),
  )

  function correcta(idPregunta: number): string {
    return alternativas.find((alternativa) => alternativa.idPregunta === idPregunta && alternativa.correcto)?.respuesta ?? ''
  }

  function equivocada(idPregunta: number): string {
    return alternativas.find((alternativa) => alternativa.idPregunta === idPregunta && !alternativa.correcto)?.respuesta ?? ''
  }

  function calificar(idTurno: number, aciertos: readonly number[]): CalificacionTeoricaMock[] {
    return preguntasTurno
      .filter((fila) => fila.idTurnoTeorico === idTurno)
      .map((fila) => {
        const acertada = aciertos.includes(fila.idPregunta)
        const enunciado = preguntas.find((pregunta) => pregunta.id === fila.idPregunta)?.enunciado ?? ''
        return {
          idPregunta: fila.idPregunta,
          orden: fila.orden,
          enunciado,
          respuestaCorrecta: correcta(fila.idPregunta),
          respuestaAlumno: acertada ? correcta(fila.idPregunta) : equivocada(fila.idPregunta),
          correcto: acertada,
          puntajeMaximo: fila.puntajeMaximo,
          puntajeObtenido: acertada ? fila.puntajeMaximo : 0,
        }
      })
  }

  function idsDeAlternativa(idPregunta: number, respuesta: string): string {
    return String(alternativas.find((alternativa) => alternativa.idPregunta === idPregunta && alternativa.respuesta === respuesta)?.id ?? '')
  }

  const ordenTurno1 = preguntasTurno.filter((fila) => fila.idTurnoTeorico === 1).map((fila) => fila.idPregunta)
  const cuestionarios: CuestionarioMock[] = [
    {
      id: 1,
      idTurnoTeorico: 1,
      codAlumno: '555555',
      estado: 'ENTREGADO',
      fechaEntrega: sumarDias(hoy, -7),
      horaEntrega: '08:41',
      nota: 20,
      notaMinimaAplicada: 18,
      aprobado: true,
      orden: ordenTurno1,
      respuestas: {},
      calificaciones: calificar(1, [1, 2, 3, 4, 5]),
    },
    {
      id: 2,
      idTurnoTeorico: 1,
      codAlumno: '666666',
      estado: 'ENTREGADO',
      fechaEntrega: sumarDias(hoy, -7),
      horaEntrega: '08:52',
      nota: 12,
      notaMinimaAplicada: 18,
      aprobado: false,
      orden: ordenTurno1,
      respuestas: {},
      calificaciones: calificar(1, [1, 2, 4]),
    },
    {
      id: 3,
      idTurnoTeorico: ID_TURNO_ABIERTO,
      codAlumno: '111111',
      estado: 'EN_CURSO',
      fechaEntrega: null,
      horaEntrega: null,
      nota: null,
      notaMinimaAplicada: 18,
      aprobado: null,
      orden: preguntasTurno.filter((fila) => fila.idTurnoTeorico === ID_TURNO_ABIERTO).map((fila) => fila.idPregunta),
      respuestas: { 1: idsDeAlternativa(1, correcta(1)), 3: idsDeAlternativa(3, 'Falso') },
      calificaciones: [],
    },
    {
      id: 4,
      idTurnoTeorico: 6,
      codAlumno: '999999',
      estado: 'ENTREGADO',
      fechaEntrega: sumarDias(hoy, -12),
      horaEntrega: '08:35',
      nota: 10,
      notaMinimaAplicada: minimoAplicado(16, 'TEST'),
      aprobado: false,
      orden: preguntasTurno.filter((fila) => fila.idTurnoTeorico === 6).map((fila) => fila.idPregunta),
      respuestas: {},
      calificaciones: calificar(6, [22]),
    },
    {
      id: 5,
      idTurnoTeorico: 7,
      codAlumno: '999999',
      estado: 'ENTREGADO',
      fechaEntrega: sumarDias(hoy, -11),
      horaEntrega: '08:28',
      nota: 17,
      notaMinimaAplicada: minimoAplicado(16, 'SUBSANACION'),
      aprobado: true,
      orden: preguntasTurno.filter((fila) => fila.idTurnoTeorico === 7).map((fila) => fila.idPregunta),
      respuestas: {},
      calificaciones: calificar(7, [22, 23]),
    },
  ]

  return { preguntas, alternativas, turnosTeoricos, preguntasTurno, cuestionarios }
}
