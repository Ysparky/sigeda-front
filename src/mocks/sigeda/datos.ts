import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import {
  crearTeoria,
  type AlternativaMock,
  type CuestionarioMock,
  type PreguntaMock,
  type PreguntaTurnoMock,
  type TurnoTeoricoMock,
} from './semilla-teoria'
import { crearUsuarios, ROLES_MOCK, type RolMock, type UsuarioMock } from './usuarios'

export type ProgramaMock = 'PDI' | 'PDE'

export type PersonaMock = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  dni: string
  rango: string | null
  tipo: string | null
  estado: string
  idGrupo: number | null
  contChequeo: number
  contEval: number
  contMalo: number
  contRegular: number
  codEvalRealizada: string | null
}

export type GrupoMock = { id: number; nombre: string; descripcion: string; programa: ProgramaMock }

export type FaseMock = { id: number; nombre: string; descripcion: string | null }

export type SubfaseMock = { id: number; nombre: string; descripcion: string | null; idFase: number }

export type ManiobraMock = { id: number; nombre: string; descripcion: string | null }

/**
 * El catálogo de misiones del PDI. **El coeficiente NO se guarda**, igual que en el servidor: se
 * derivan `horas / Σ horas de la sub fase` en la respuesta, para que las dos fuentes no se separen.
 * `codigo` sólo es único DENTRO de la sub fase: el bloque `N/I` del PDI es una sub fase combinada que
 * SIGEDA tiene partida en dos, y está completo en las dos, así que `N/I-3` existe dos veces.
 */
export type MisionMock = { id: number; codigo: string; horas: number; idSubfase: number }

export type EnlaceManiobraSubfase = { idSubfase: number; idManiobra: number }

export type EstandarMock = { id: number; nombre: string; descripcion: string | null; idManiobra: number }

export type ParteMock = 'PRIMERA_PARTE' | 'SEGUNDA_PARTE' | 'CULTURA_AERONAUTICA'

export type MateriaMock = { id: number; nombre: string; notaMinima: number; coeficiente: number; parte: ParteMock }

export type AeronaveMock = { id: number; nombre: string; descripcion: string; imagen: string | null; estado: string }

export type AlumnoTurnoMock = { codAlumno: string; horaInicio: string; horaFin: string }

export type ManiobraTurnoMock = { idManiobra: number; notaMin: string }

export type TurnoMock = {
  id: number
  nombre: string
  fechaEval: string
  programa: ProgramaMock
  idSubfase: number
  subfase: string
  fase: string
  codInstructor: string | null
  idAeronave: number | null
  idMision: number | null
  alumnos: AlumnoTurnoMock[]
  maniobras: ManiobraTurnoMock[]
}

export type CalificacionMock = {
  codEvaluacion: string
  idManiobra: number
  notaMin: string
  nota: string
  causa: string | null
  observacion: string | null
  recomendacion: string | null
  maniobra: { id: number; nombre: string; descripcion: string | null }
}

export type EvaluacionMock = {
  codigo: string
  nombre: string
  fecha: string
  programa: ProgramaMock
  categoria: string
  clasificacion: string | null
  promedio: string | null
  recomendacion: string | null
  archivoUrl: string | null
  idSubFase: number
  fase: string
  subFase: string
  estadoAlumno: string
  codEvalPrevia: string | null
  codEvaluador: string | null
  evaluador: string
  codPersona: string
  alumno: string
  calificaciones: CalificacionMock[]
}

export type Secuencias = {
  turno: number
  usuario: number
  grupo: number
  fase: number
  subfase: number
  maniobra: number
  estandar: number
  materia: number
  pregunta: number
  alternativa: number
  turnoTeorico: number
  cuestionario: number
}

export type DatosMock = {
  personas: PersonaMock[]
  usuarios: UsuarioMock[]
  grupos: GrupoMock[]
  fases: FaseMock[]
  subfases: SubfaseMock[]
  maniobras: ManiobraMock[]
  maniobrasSubfase: EnlaceManiobraSubfase[]
  misiones: MisionMock[]
  estandares: EstandarMock[]
  materias: MateriaMock[]
  aeronaves: AeronaveMock[]
  turnos: TurnoMock[]
  evaluaciones: EvaluacionMock[]
  preguntas: PreguntaMock[]
  alternativas: AlternativaMock[]
  turnosTeoricos: TurnoTeoricoMock[]
  preguntasTurno: PreguntaTurnoMock[]
  cuestionarios: CuestionarioMock[]
  secuencias: Secuencias
}

function persona(
  codigo: string,
  nombre: string,
  aPaterno: string,
  aMaterno: string,
  dni: string,
  rango: string | null,
  tipo: string | null,
  idGrupo: number | null,
  estado = 'Apto',
  contadores: [chequeo: number, evaluaciones: number, malos: number, regulares: number] = [0, 0, 0, 0],
): PersonaMock {
  return {
    codigo,
    nombre,
    aPaterno,
    aMaterno,
    dni,
    rango,
    tipo,
    estado,
    idGrupo,
    contChequeo: contadores[0],
    contEval: contadores[1],
    contMalo: contadores[2],
    contRegular: contadores[3],
    codEvalRealizada: null,
  }
}

const MANIOBRAS: ManiobraMock[] = [
  ...Array.from({ length: 10 }, (_, indice) => ({
    id: indice + 1,
    nombre: `Maniobra ${indice + 1}`,
    descripcion: `Descripcion de Maniobra ${indice + 1}`,
  })),
  { id: 11, nombre: 'Autorrotación', descripcion: 'Aterrizaje sin potencia' },
]

const ESTANDARES: [number, string, number][] = [
  [1, 'Estandar 11', 1],
  [2, 'Estandar 22', 2],
  [3, 'Estandar 23', 2],
  [4, 'Estandar 34', 3],
  [5, 'Estandar 45', 4],
  [6, 'Estandar 46', 4],
  [7, 'Estandar 47', 4],
  [8, 'Estandar 48', 4],
  [9, 'Estandar 59', 5],
  [10, 'Estandar 60', 9],
  [11, 'Estandar 61', 9],
  [12, 'Estandar 62', 10],
]

const MATERIAS: [string, number, number][] = [
  ['Aerodinámica Aplicada a Helicópteros', 16, 0.13],
  ['Ingeniería del Helicóptero', 16, 0.16],
  ['Adoctrinamiento de Vuelo', 18, 0.22],
  ['Límites de Operación', 20, 0.1],
  ['Procedimientos Normales', 16, 0.1],
  ['Procedimientos de Emergencias', 20, 0.1],
  ['Meteorología', 16, 0.04],
  ['Prevención de Accidentes', 16, 0.04],
  ['Normatividad FAP', 16, 0.04],
  ['Regulaciones Aeronáuticas del Perú', 16, 0.04],
  ['Fraseología Aeronáutica en Inglés', 16, 0.03],
]

function maniobra(id: number): ManiobraMock {
  const encontrada = MANIOBRAS.find((candidata) => candidata.id === id)
  if (!encontrada) throw new Error(`Maniobra ${id} inexistente en los datos de prueba`)
  return { ...encontrada }
}

function calificaciones(codigo: string, filas: [number, string, string, string?, string?, string?][]): CalificacionMock[] {
  return filas.map(([idManiobra, notaMin, nota, causa, observacion, recomendacion]) => ({
    codEvaluacion: codigo,
    idManiobra,
    notaMin,
    nota,
    causa: causa ?? null,
    observacion: observacion ?? null,
    recomendacion: recomendacion ?? null,
    maniobra: maniobra(idManiobra),
  }))
}

function turnoSemilla(
  id: number,
  fechaEval: string,
  nombre: string,
  idSubfase: number,
  fase: string,
  subfase: string,
  codInstructor: string,
  codAlumno: string,
  maniobras: number[],
  idMision: number | null,
): TurnoMock {
  return {
    id,
    nombre,
    fechaEval,
    programa: 'PDI',
    idSubfase,
    subfase,
    fase,
    codInstructor,
    idAeronave: 1,
    idMision,
    alumnos: [{ codAlumno, horaInicio: '13:00', horaFin: '14:30' }],
    maniobras: maniobras.map((idManiobra) => ({ idManiobra, notaMin: 'B' })),
  }
}

// Las horas son las de la hoja `ESTRUCTURA (2024)` del libro que acompaña al PDI, y el reparto es el
// de la migración 016 del servidor: las cinco sub fases de SIGEDA con los bloques `C`, `N/I` (entero
// en Navegación y entero en Instrumentos), `CX` y `FT`. Los ids 1..34 son los mismos que la semilla.
const MISIONES_SEMBRADAS: [idSubfase: number, prefijo: string, horas: number[]][] = [
  [1, 'C', [1, 1, 1, 1, 1, 1, 1]],
  [2, 'N/I', [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1]],
  [3, 'N/I', [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1]],
  [4, 'CX', [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5]],
  [5, 'FT', [1, 1, 1, 1, 1]],
]

function crearMisiones(): MisionMock[] {
  let id = 0
  return MISIONES_SEMBRADAS.flatMap(([idSubfase, prefijo, horas]) =>
    horas.map((hora, indice) => {
      id += 1
      return { id, codigo: `${prefijo}-${indice + 1}`, horas: hora, idSubfase }
    }),
  )
}

export function crearDatos(hoy: string = hoyIso()): DatosMock {
  const enUnaSemana = sumarDias(hoy, 7)
  const personas = [
    persona('111111', 'Oscar', 'Lopez', 'Chaparro', '12345678', 'Cadete', 'Alumno', 1, 'Apto', [2, 5, 1, 2]),
    persona('222222', 'Juan', 'Falconi', 'Fernandez', '23456789', 'Alférez', 'Alumno', 2, 'Apto', [3, 8, 2, 3]),
    persona('333333', 'Carlos', 'Vargas', 'Rodriguez', '34567890', 'Mayor', null, null),
    persona('444444', 'Juan', 'Torres', 'Perez', '45678901', 'Capitán', 'Instructor PDI', null),
    persona('555555', 'Pedro', 'Rodriguez', 'Garcia', '56789012', 'Teniente', 'Alumno', 3, 'Apto', [2, 5, 1, 2]),
    persona('666666', 'Ana', 'Torres', 'Martinez', '67890123', 'Capitán', 'Alumno', 3, 'Apto', [1, 4, 0, 1]),
    persona('777777', 'Carlos', 'Ramirez', 'Sanchez', '78901234', 'Mayor', 'Alumno', 4, 'En Chequeo', [4, 10, 3, 2]),
    persona('888888', 'Maria', 'Flores', 'Mendoza', '89012345', 'Teniente', 'Instructor PDI', null),
    persona('999999', 'Luis', 'Diaz', 'Castro', '90123456', 'Alférez', 'Alumno', 6, 'Apto', [3, 7, 2, 2]),
    persona('000001', 'Admin', 'Sistema', 'Web', '01234567', 'Admin', null, null),
    persona('222444', 'Jorge', 'Aguirre', 'Salas', '22244411', 'Mayor', null, null),
    persona('654321', 'Lucía', 'Mendoza', 'Ríos', '76543210', 'Cadete', 'Alumno', null),
    persona('765432', 'Raúl', 'Paredes', 'Soto', '75432109', 'Teniente', null, null),
  ]
  for (const [codigo, ultima] of [
    ['111111', '111111-1'],
    ['555555', '555555-3'],
    ['666666', '666666-1'],
    ['777777', '777777-6'],
    ['999999', '999999-2'],
  ] as const) {
    const alumno = personas.find((candidata) => candidata.codigo === codigo)
    if (alumno) alumno.codEvalRealizada = ultima
  }

  return {
    personas,
    usuarios: crearUsuarios(),
    grupos: [
      { id: 1, nombre: 'Grupo 1', descripcion: 'Instrucción básica - Nuevos ingresantes', programa: 'PDI' },
      { id: 2, nombre: 'Grupo 2', descripcion: 'Instrucción avanzada - Fase final', programa: 'PDI' },
      { id: 3, nombre: 'Grupo 3', descripcion: 'Entrenamiento especializado - Nivel 1', programa: 'PDI' },
      { id: 4, nombre: 'Grupo 4', descripcion: 'Entrenamiento avanzado - Nivel 2', programa: 'PDI' },
      { id: 5, nombre: 'Grupo 5', descripcion: 'Instrucción intermedia - Fase media', programa: 'PDI' },
      { id: 6, nombre: 'Promoción 2026-A', descripcion: 'Entrenamiento especializado - Nivel 2', programa: 'PDI' },
    ],
    fases: [
      { id: 1, nombre: 'Adaptación', descripcion: 'Fase inicial de familiarización con procedimientos básicos' },
      { id: 2, nombre: 'Operaciones HeliTransportadas', descripcion: 'Entrenamiento en operaciones con helicópteros' },
      { id: 3, nombre: 'Operaciones AeroTácticas', descripcion: 'Operaciones avanzadas y tácticas especiales' },
    ],
    // LAS CINCO CUELGAN DE LA FASE 1 A PROPÓSITO, y no coincide con la semilla del servidor, donde
    // «Campos Extraños» y «Formación» se movieron a las fases 2 y 3 (migración 014). Acá se dejan
    // juntas porque las fases 2 y 3 vacías son el único dato que ejercita CA-FAS-05 —eliminar una fase
    // SIN subfases— y CA-DEP-01. Alinear esta lista con la semilla rompe esas dos pruebas y no arregla
    // nada: la divergencia que causa defectos es la de FORMA (claves, tipos, nulabilidad), no la de
    // qué filas trae cada fixture.
    subfases: [
      { id: 1, nombre: 'Contacto', descripcion: 'Familiarización con controles y procedimientos básicos', idFase: 1 },
      { id: 2, nombre: 'Navegación', descripcion: 'Técnicas de navegación y orientación', idFase: 1 },
      { id: 3, nombre: 'Instrumentos', descripcion: 'Manejo de instrumentos de vuelo', idFase: 1 },
      { id: 4, nombre: 'Campos Extraños', descripcion: 'Operaciones en terrenos no preparados', idFase: 1 },
      { id: 5, nombre: 'Formación', descripcion: 'Vuelo en formación y coordinación', idFase: 1 },
    ],
    maniobras: MANIOBRAS.map((item) => ({ ...item })),
    misiones: crearMisiones(),
    maniobrasSubfase: [
      ...[1, 2, 3, 4, 5, 6].map((idManiobra) => ({ idSubfase: 2, idManiobra })),
      ...[9, 10].map((idManiobra) => ({ idSubfase: 3, idManiobra })),
      ...[7, 8].map((idManiobra) => ({ idSubfase: 4, idManiobra })),
    ],
    estandares: ESTANDARES.map(([id, nombre, idManiobra]) => ({ id, nombre, descripcion: null, idManiobra })),
    materias: MATERIAS.map(([nombre, notaMinima, coeficiente], indice) => ({
      id: indice + 1,
      nombre,
      notaMinima,
      coeficiente,
      parte: 'PRIMERA_PARTE' as ParteMock,
    })),
    aeronaves: [
      { id: 1, nombre: 'Robinson R22', descripcion: 'Helicóptero de entrenamiento básico', imagen: null, estado: 'Disponible' },
      { id: 2, nombre: 'Enstrom 280FX', descripcion: 'Helicóptero de instrucción intermedia', imagen: null, estado: 'En_Mantenimiento' },
      { id: 3, nombre: 'Schweizer S-300C', descripcion: 'Helicóptero de instrucción avanzada', imagen: null, estado: 'No_Disponible' },
    ],
    turnos: [
      // El último argumento es la misión del PDI asignada al turno, como la dejó la migración 016.
      turnoSemilla(1, '2024-03-01', 'Contacto Básico', 1, 'Adaptación', 'Contacto', '444444', '111111', [1, 2, 3, 4, 5, 6], 1),
      turnoSemilla(2, '2024-03-08', 'Contacto Intermedio', 1, 'Adaptación', 'Contacto', '444444', '222222', [1, 2, 3, 4, 5, 6], 2),
      turnoSemilla(3, '2024-03-15', 'Contacto Avanzado', 1, 'Adaptación', 'Contacto', '444444', '555555', [1, 2, 3, 4, 5, 6], 3),
      turnoSemilla(4, '2024-03-22', 'Navegación Inicial', 2, 'Adaptación', 'Navegación', '444444', '666666', [1, 2, 3, 4, 5, 6], 8),
      turnoSemilla(5, '2024-03-29', 'Instrumentos Avanzados', 3, 'Adaptación', 'Instrumentos', '888888', '777777', [9, 10], 15),
      turnoSemilla(6, '2024-04-05', 'Campos Tácticos', 4, 'Operaciones HeliTransportadas', 'Campos Extraños', '888888', '999999', [7, 8], 22),
      turnoSemilla(7, '2024-04-12', 'Navegación Avanzada', 5, 'Operaciones AeroTácticas', 'Formación', '888888', '999999', [1, 2, 3, 4, 5, 6], 30),
      {
        id: 8,
        nombre: 'Navegación Nocturna',
        fechaEval: enUnaSemana,
        programa: 'PDI',
        idSubfase: 2,
        subfase: 'Navegación',
        fase: 'Adaptación',
        codInstructor: '444444',
        idAeronave: 1,
        idMision: null,
        alumnos: [
          { codAlumno: '111111', horaInicio: '09:00', horaFin: '10:30' },
          { codAlumno: '666666', horaInicio: '11:00', horaFin: '12:30' },
        ],
        maniobras: [
          { idManiobra: 1, notaMin: 'R' },
          { idManiobra: 2, notaMin: 'B' },
          { idManiobra: 3, notaMin: 'E' },
          { idManiobra: 4, notaMin: 'I' },
        ],
      },
      {
        id: 9,
        nombre: 'Instrumentos Básicos',
        fechaEval: enUnaSemana,
        programa: 'PDI',
        idSubfase: 3,
        subfase: 'Instrumentos',
        fase: 'Adaptación',
        codInstructor: '888888',
        idAeronave: 1,
        idMision: null,
        alumnos: [{ codAlumno: '777777', horaInicio: '07:30', horaFin: '08:30' }],
        maniobras: [
          { idManiobra: 9, notaMin: 'B' },
          { idManiobra: 10, notaMin: 'R' },
        ],
      },
    ],
    evaluaciones: [
      {
        codigo: '111111-1',
        nombre: 'Ponderada Contacto Básico',
        fecha: '2024-03-01',
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Bueno',
        promedio: '16.5',
        recomendacion: 'Mantener la coordinación en los virajes',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: null,
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '111111',
        alumno: 'Oscar Lopez',
        calificaciones: calificaciones('111111-1', [
          [1, 'B', 'B'],
          [2, 'B', 'B'],
          [3, 'B', 'R', 'Falta de coordinación en pedales', 'Pierde altura en el viraje', 'Practicar virajes coordinados'],
          [4, 'B', 'B'],
          [5, 'B', 'E'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '555555-1',
        nombre: 'Ponderada Contacto Básico',
        fecha: '2024-03-01',
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Regular',
        promedio: '14.0',
        recomendacion: 'Mejorar técnicas básicas',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: null,
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '555555',
        alumno: 'Pedro Rodriguez',
        calificaciones: calificaciones('555555-1', [
          [1, 'B', 'R'],
          [2, 'B', 'R'],
          [3, 'B', 'R'],
          [4, 'B', 'R'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '555555-2',
        nombre: 'Chequeo Contacto Intermedio',
        fecha: '2024-03-08',
        programa: 'PDI',
        categoria: 'Chequeo',
        clasificacion: 'Bueno',
        promedio: null,
        recomendacion: 'Continuar con el entrenamiento',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'En Chequeo',
        codEvalPrevia: '555555-1',
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '555555',
        alumno: 'Pedro Rodriguez',
        calificaciones: calificaciones('555555-2', [
          [1, 'B', 'B'],
          [2, 'B', 'B'],
          [3, 'B', 'B'],
          [4, 'B', 'B'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '555555-3',
        nombre: 'Ponderada Contacto Avanzado',
        fecha: '2024-03-15',
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Regular',
        promedio: '15.0',
        recomendacion: 'Reforzar procedimientos',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: '555555-2',
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '555555',
        alumno: 'Pedro Rodriguez',
        calificaciones: calificaciones('555555-3', [
          [1, 'B', 'R'],
          [2, 'B', 'R'],
          [3, 'B', 'R'],
          [4, 'B', 'R'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '666666-1',
        nombre: 'Ponderada Contacto Básico',
        fecha: sumarDias(hoy, -30),
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Malo',
        promedio: '12.0',
        recomendacion: 'Repetir el patrón de aterrizaje',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: null,
        codEvaluador: null,
        evaluador: 'Juan Torres',
        codPersona: '666666',
        alumno: 'Ana Torres',
        calificaciones: calificaciones('666666-1', [
          [1, 'B', 'I', 'Pérdida de referencia visual', 'No mantiene el eje de pista', 'Practicar aproximaciones'],
          [2, 'B', 'B'],
          [3, 'B', 'B'],
          [4, 'B', 'B'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '777777-1',
        nombre: 'Ponderada Instrumentos',
        fecha: sumarDias(hoy, -28),
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Malo',
        promedio: '12.0',
        recomendacion: 'Repetir el procedimiento de aproximación por instrumentos',
        archivoUrl: null,
        idSubFase: 3,
        fase: 'Adaptación',
        subFase: 'Instrumentos',
        estadoAlumno: 'Apto',
        codEvalPrevia: null,
        codEvaluador: null,
        evaluador: 'Maria Flores',
        codPersona: '777777',
        alumno: 'Carlos Ramirez',
        calificaciones: calificaciones('777777-1', [
          [9, 'B', 'I', 'Pérdida de referencia de instrumentos', 'No mantiene el rumbo asignado', 'Repetir el procedimiento de instrumentos'],
          [10, 'B', 'R', 'Corrección tardía de altitud', 'Se aparta de la senda de planeo', 'Practicar mantenimiento de altitud'],
        ]),
      },
      {
        codigo: '777777-2',
        nombre: 'Ponderada Instrumentos',
        fecha: sumarDias(hoy, -21),
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Malo',
        promedio: '12.0',
        recomendacion: 'Repetir el procedimiento de aproximación por instrumentos',
        archivoUrl: null,
        idSubFase: 3,
        fase: 'Adaptación',
        subFase: 'Instrumentos',
        estadoAlumno: 'Apto',
        codEvalPrevia: '777777-1',
        codEvaluador: null,
        evaluador: 'Maria Flores',
        codPersona: '777777',
        alumno: 'Carlos Ramirez',
        calificaciones: calificaciones('777777-2', [
          [9, 'B', 'I', 'Pérdida de referencia de instrumentos', 'No mantiene el rumbo asignado', 'Repetir el procedimiento de instrumentos'],
          [10, 'B', 'R', 'Corrección tardía de altitud', 'Se aparta de la senda de planeo', 'Practicar mantenimiento de altitud'],
        ]),
      },
      {
        codigo: '777777-3',
        nombre: 'Ponderada Instrumentos',
        fecha: sumarDias(hoy, -14),
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Malo',
        promedio: '12.0',
        recomendacion: 'Repetir el procedimiento de aproximación por instrumentos',
        archivoUrl: null,
        idSubFase: 3,
        fase: 'Adaptación',
        subFase: 'Instrumentos',
        estadoAlumno: 'Apto',
        codEvalPrevia: '777777-2',
        codEvaluador: null,
        evaluador: 'Maria Flores',
        codPersona: '777777',
        alumno: 'Carlos Ramirez',
        calificaciones: calificaciones('777777-3', [
          [9, 'B', 'I', 'Pérdida de referencia de instrumentos', 'No mantiene el rumbo asignado', 'Repetir el procedimiento de instrumentos'],
          [10, 'B', 'R', 'Corrección tardía de altitud', 'Se aparta de la senda de planeo', 'Practicar mantenimiento de altitud'],
        ]),
      },
      {
        codigo: '777777-4',
        nombre: 'Ponderada Instrumentos',
        fecha: sumarDias(hoy, -7),
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Malo',
        promedio: '12.0',
        recomendacion: 'Repetir el procedimiento de aproximación por instrumentos',
        archivoUrl: null,
        idSubFase: 3,
        fase: 'Adaptación',
        subFase: 'Instrumentos',
        estadoAlumno: 'En Chequeo',
        codEvalPrevia: '777777-3',
        codEvaluador: null,
        evaluador: 'Maria Flores',
        codPersona: '777777',
        alumno: 'Carlos Ramirez',
        calificaciones: calificaciones('777777-4', [
          [9, 'B', 'I', 'Pérdida de referencia de instrumentos', 'No mantiene el rumbo asignado', 'Repetir el procedimiento de instrumentos'],
          [10, 'B', 'R', 'Corrección tardía de altitud', 'Se aparta de la senda de planeo', 'Practicar mantenimiento de altitud'],
        ]),
      },
      {
        codigo: '777777-6',
        nombre: 'Ponderada Instrumentos',
        fecha: sumarDias(hoy, -3),
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Bueno',
        promedio: '17.0',
        recomendacion: 'Continuar con el entrenamiento',
        archivoUrl: null,
        idSubFase: 3,
        fase: 'Adaptación',
        subFase: 'Instrumentos',
        estadoAlumno: 'En Chequeo',
        codEvalPrevia: '777777-4',
        codEvaluador: null,
        evaluador: 'Maria Flores',
        codPersona: '777777',
        alumno: 'Carlos Ramirez',
        calificaciones: calificaciones('777777-6', [
          [9, 'B', 'B'],
          [10, 'B', 'B'],
        ]),
      },
      {
        codigo: '999999-1',
        nombre: 'Ponderada Contacto Básico',
        fecha: sumarDias(hoy, -20),
        programa: 'PDI',
        categoria: 'Ponderada',
        clasificacion: 'Regular',
        promedio: '15.0',
        recomendacion: 'Reforzar procedimientos básicos',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: null,
        codEvaluador: null,
        evaluador: 'Maria Flores',
        codPersona: '999999',
        alumno: 'Luis Diaz',
        calificaciones: calificaciones('999999-1', [
          [1, 'B', 'R', 'Falta de coordinación en pedales', 'Pierde altura en el viraje', 'Practicar virajes coordinados'],
          [2, 'B', 'R', 'Falta de coordinación en pedales', 'Pierde altura en el viraje', 'Practicar virajes coordinados'],
          [3, 'B', 'R', 'Falta de coordinación en pedales', 'Pierde altura en el viraje', 'Practicar virajes coordinados'],
          [4, 'B', 'R', 'Falta de coordinación en pedales', 'Pierde altura en el viraje', 'Practicar virajes coordinados'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
      {
        codigo: '999999-2',
        nombre: 'Chequeo Sub Fase Contacto',
        fecha: sumarDias(hoy, -10),
        programa: 'PDI',
        categoria: 'Chequeo Sub Fase',
        clasificacion: 'Bueno',
        promedio: '17.0',
        recomendacion: 'Continuar con el entrenamiento',
        archivoUrl: null,
        idSubFase: 1,
        fase: 'Adaptación',
        subFase: 'Contacto',
        estadoAlumno: 'Apto',
        codEvalPrevia: '999999-1',
        codEvaluador: null,
        evaluador: 'Maria Flores',
        codPersona: '999999',
        alumno: 'Luis Diaz',
        calificaciones: calificaciones('999999-2', [
          [1, 'B', 'B'],
          [2, 'B', 'B'],
          [3, 'B', 'B'],
          [4, 'B', 'B'],
          [5, 'B', 'B'],
          [6, 'B', 'B'],
        ]),
      },
    ],
    ...crearTeoria(hoy),
    secuencias: {
      turno: 10,
      usuario: 13,
      grupo: 7,
      fase: 4,
      subfase: 6,
      maniobra: 12,
      estandar: 13,
      materia: 12,
      pregunta: 25,
      alternativa: 101,
      turnoTeorico: 8,
      cuestionario: 6,
    },
  }
}

let datosActuales = crearDatos()

export function datos(): DatosMock {
  return datosActuales
}

export function reiniciarDatosMock() {
  datosActuales = crearDatos()
}

export function siguienteId(clave: keyof Secuencias): number {
  const valor = datosActuales.secuencias[clave]
  datosActuales.secuencias[clave] += 1
  return valor
}

export function buscarPersona(codigo: string): PersonaMock | undefined {
  return datosActuales.personas.find((persona) => persona.codigo === codigo)
}

export function buscarUsuarioPorNombre(username: string): UsuarioMock | undefined {
  return datosActuales.usuarios.find((usuario) => usuario.username === username)
}

export function buscarUsuarioPorId(id: number): UsuarioMock | undefined {
  return datosActuales.usuarios.find((usuario) => usuario.id === id)
}

export function usuarioDePersona(codigo: string): UsuarioMock | undefined {
  return datosActuales.usuarios.find((usuario) => usuario.codPersona === codigo)
}

export function rolPorId(idRol: number | null): RolMock | null {
  return ROLES_MOCK.find((rol) => rol.id === idRol) ?? null
}

export function nombreCorto(persona: PersonaMock): string {
  return `${persona.nombre} ${persona.aPaterno}`
}

export function nombreCompleto(persona: PersonaMock): string {
  return [persona.nombre, persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ')
}

export function buscarSubfase(id: number): SubfaseMock | undefined {
  return datosActuales.subfases.find((subfase) => subfase.id === id)
}

export function nombreDeFase(idFase: number): string {
  return datosActuales.fases.find((fase) => fase.id === idFase)?.nombre ?? ''
}

export function maniobrasDeSubfase(idSubfase: number): ManiobraMock[] {
  const ids = datosActuales.maniobrasSubfase
    .filter((enlace) => enlace.idSubfase === idSubfase)
    .map((enlace) => enlace.idManiobra)
  return datosActuales.maniobras.filter((maniobra) => ids.includes(maniobra.id))
}

/** Ordenadas por id, que es el orden que el servidor fija con un `order by` explícito. */
export function misionesDeSubfase(idSubfase: number): MisionMock[] {
  return datosActuales.misiones.filter((mision) => mision.idSubfase === idSubfase).sort((a, b) => a.id - b.id)
}

export function buscarMision(id: number): MisionMock | undefined {
  return datosActuales.misiones.find((mision) => mision.id === id)
}

export function subfasesDeManiobra(idManiobra: number): SubfaseMock[] {
  const ids = datosActuales.maniobrasSubfase
    .filter((enlace) => enlace.idManiobra === idManiobra)
    .map((enlace) => enlace.idSubfase)
  return datosActuales.subfases.filter((subfase) => ids.includes(subfase.id))
}

export function estandaresDeManiobra(idManiobra: number): EstandarMock[] {
  return datosActuales.estandares.filter((estandar) => estandar.idManiobra === idManiobra)
}

export function buscarMateria(id: number): MateriaMock | undefined {
  return datosActuales.materias.find((materia) => materia.id === id)
}

export function buscarTurnoTeorico(id: number): TurnoTeoricoMock | undefined {
  return datosActuales.turnosTeoricos.find((turno) => turno.id === id)
}

export function buscarPregunta(id: number): PreguntaMock | undefined {
  return datosActuales.preguntas.find((pregunta) => pregunta.id === id)
}

export function alternativasDePregunta(idPregunta: number): AlternativaMock[] {
  return datosActuales.alternativas.filter((alternativa) => alternativa.idPregunta === idPregunta).sort((a, b) => a.id - b.id)
}

export function preguntasDelTurno(idTurnoTeorico: number): PreguntaTurnoMock[] {
  return datosActuales.preguntasTurno
    .filter((fila) => fila.idTurnoTeorico === idTurnoTeorico)
    .sort((a, b) => a.orden - b.orden)
}

export function preguntaEnUso(idPregunta: number): boolean {
  return datosActuales.preguntasTurno.some((fila) => fila.idPregunta === idPregunta)
}

export function materiaEnUso(idMateria: number): boolean {
  return (
    datosActuales.preguntas.some((pregunta) => pregunta.idMateria === idMateria) ||
    datosActuales.turnosTeoricos.some((turno) => turno.idMateria === idMateria)
  )
}

export function alumnosDeGrupo(idGrupo: number): PersonaMock[] {
  return datosActuales.personas
    .filter((persona) => persona.tipo === 'Alumno' && persona.idGrupo === idGrupo)
    .sort((a, b) => a.aPaterno.localeCompare(b.aPaterno, 'es'))
}

export function gruposDeInstructor(codInstructor: string, programa: string): Set<number> {
  const ids = datosActuales.turnos
    .filter((turno) => turno.codInstructor === codInstructor && turno.programa === programa)
    .flatMap((turno) => turno.alumnos.map((alumno) => alumno.codAlumno))
    .flatMap((codigo) => {
      const idGrupo = datosActuales.personas.find((persona) => persona.codigo === codigo)?.idGrupo
      return idGrupo === null || idGrupo === undefined ? [] : [idGrupo]
    })
  return new Set(ids)
}

export function cuestionarioDe(idTurnoTeorico: number, codAlumno: string): CuestionarioMock | undefined {
  return datosActuales.cuestionarios.find(
    (cuestionario) => cuestionario.idTurnoTeorico === idTurnoTeorico && cuestionario.codAlumno === codAlumno,
  )
}

export function alumnosHabilitados(turno: TurnoTeoricoMock): PersonaMock[] {
  const delGrupo = alumnosDeGrupo(turno.idGrupo)
  const origen = turno.idTurnoOrigen === null ? undefined : buscarTurnoTeorico(turno.idTurnoOrigen)
  if (!origen) return delGrupo
  if (turno.tipoExamen === 'SUBSANACION') {
    return delGrupo.filter((alumno) => cuestionarioDe(origen.id, alumno.codigo)?.aprobado === false)
  }
  if (turno.tipoExamen === 'REZAGADO') {
    return delGrupo.filter((alumno) => cuestionarioDe(origen.id, alumno.codigo) === undefined)
  }
  return delGrupo
}

export function desaprobadosSinSubsanar(codAlumno: string): CuestionarioMock[] {
  return datosActuales.cuestionarios.filter((cuestionario) => {
    if (cuestionario.codAlumno !== codAlumno || cuestionario.aprobado !== false) return false
    const turno = buscarTurnoTeorico(cuestionario.idTurnoTeorico)
    if (!turno) return false
    return !datosActuales.cuestionarios.some((otro) => {
      if (otro.codAlumno !== codAlumno || otro.aprobado !== true) return false
      const suTurno = buscarTurnoTeorico(otro.idTurnoTeorico)
      return (
        suTurno !== undefined &&
        suTurno.tipoExamen === 'SUBSANACION' &&
        suTurno.idMateria === turno.idMateria &&
        suTurno.fechaExamen >= turno.fechaExamen
      )
    })
  })
}

export function bloqueadoPorSubsanacion(codAlumno: string): boolean {
  return desaprobadosSinSubsanar(codAlumno).length > 0
}
