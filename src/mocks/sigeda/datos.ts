import { hoyIso, sumarDias } from '@/lib/dominio/calendario'

export type ProgramaMock = 'PDI' | 'PDE'

export type PersonaMock = {
  codigo: string
  nombre: string
  aPaterno: string
  aMaterno: string
  tipo: string | null
  estado: string
  idGrupo: number | null
  contEval: number
  codEvalRealizada: string | null
}

export type GrupoMock = { id: number; nombre: string; programa: ProgramaMock }

export type SubfaseMock = { id: number; nombre: string; descripcion: string; fase: string }

export type ManiobraMock = { id: number; nombre: string; descripcion: string }

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
  maniobra: ManiobraMock
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

export type DatosMock = {
  personas: PersonaMock[]
  grupos: GrupoMock[]
  subfases: SubfaseMock[]
  maniobras: ManiobraMock[]
  maniobrasPorSubfase: Record<number, number[]>
  aeronaves: AeronaveMock[]
  turnos: TurnoMock[]
  evaluaciones: EvaluacionMock[]
  siguienteIdTurno: number
}

function persona(
  codigo: string,
  nombre: string,
  aPaterno: string,
  aMaterno: string,
  tipo: string | null,
  idGrupo: number | null,
  estado = 'Apto',
): PersonaMock {
  return { codigo, nombre, aPaterno, aMaterno, tipo, estado, idGrupo, contEval: 0, codEvalRealizada: null }
}

const MANIOBRAS: ManiobraMock[] = Array.from({ length: 10 }, (_, indice) => ({
  id: indice + 1,
  nombre: `Maniobra ${indice + 1}`,
  descripcion: `Descripcion de Maniobra ${indice + 1}`,
}))

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
    alumnos: [{ codAlumno, horaInicio: '13:00', horaFin: '14:30' }],
    maniobras: maniobras.map((idManiobra) => ({ idManiobra, notaMin: 'B' })),
  }
}

export function crearDatos(hoy: string = hoyIso()): DatosMock {
  const enUnaSemana = sumarDias(hoy, 7)
  const personas = [
    persona('111111', 'Oscar', 'Lopez', 'Chaparro', 'Alumno', 1),
    persona('222222', 'Juan', 'Falconi', 'Fernandez', 'Alumno', 2),
    persona('333333', 'Carlos', 'Vargas', 'Rodriguez', null, null),
    persona('444444', 'Juan', 'Torres', 'Perez', 'Instructor PDI', null),
    persona('555555', 'Pedro', 'Rodriguez', 'Garcia', 'Alumno', 3),
    persona('666666', 'Ana', 'Torres', 'Martinez', 'Alumno', 3),
    persona('777777', 'Carlos', 'Ramirez', 'Sanchez', 'Alumno', 4, 'En Chequeo'),
    persona('888888', 'Maria', 'Flores', 'Mendoza', 'Instructor PDI', null),
    persona('999999', 'Luis', 'Diaz', 'Castro', 'Alumno', 6),
    persona('000001', 'Admin', 'Sistema', 'Web', null, null),
    persona('222444', 'Jorge', 'Aguirre', 'Salas', null, null),
  ]
  const alumno111 = personas.find((candidata) => candidata.codigo === '111111')
  const alumno555 = personas.find((candidata) => candidata.codigo === '555555')
  if (alumno111) Object.assign(alumno111, { contEval: 1, codEvalRealizada: '111111-1' })
  if (alumno555) Object.assign(alumno555, { contEval: 3, codEvalRealizada: '555555-3' })

  return {
    personas,
    grupos: [
      { id: 1, nombre: 'Grupo 1', programa: 'PDI' },
      { id: 2, nombre: 'Grupo 2', programa: 'PDI' },
      { id: 3, nombre: 'Grupo 3', programa: 'PDI' },
      { id: 4, nombre: 'Grupo 4', programa: 'PDI' },
      { id: 5, nombre: 'Grupo 5', programa: 'PDI' },
      { id: 6, nombre: 'Grupo 6', programa: 'PDI' },
    ],
    subfases: [
      { id: 1, nombre: 'Contacto', descripcion: 'Familiarización con controles y procedimientos básicos', fase: 'Adaptación' },
      { id: 2, nombre: 'Navegación', descripcion: 'Técnicas de navegación y orientación', fase: 'Adaptación' },
      { id: 3, nombre: 'Instrumentos', descripcion: 'Manejo de instrumentos de vuelo', fase: 'Adaptación' },
      { id: 4, nombre: 'Campos Extraños', descripcion: 'Operaciones en terrenos no preparados', fase: 'Adaptación' },
      { id: 5, nombre: 'Formación', descripcion: 'Vuelo en formación y coordinación', fase: 'Adaptación' },
    ],
    maniobras: MANIOBRAS.map((item) => ({ ...item })),
    maniobrasPorSubfase: { 1: [], 2: [1, 2, 3, 4, 5, 6], 3: [9, 10], 4: [7, 8], 5: [] },
    aeronaves: [
      { id: 1, nombre: 'Robinson R22', descripcion: 'Helicóptero de entrenamiento básico', imagen: null, estado: 'Disponible' },
      { id: 2, nombre: 'Enstrom 280FX', descripcion: 'Helicóptero de instrucción intermedia', imagen: null, estado: 'En_Mantenimiento' },
      { id: 3, nombre: 'Schweizer S-300C', descripcion: 'Helicóptero de instrucción avanzada', imagen: null, estado: 'No_Disponible' },
    ],
    turnos: [
      turnoSemilla(1, '2024-03-01', 'Contacto Básico', 1, 'Adaptación', 'Contacto', '444444', '111111', [1, 2, 3, 4, 5, 6]),
      turnoSemilla(2, '2024-03-08', 'Contacto Intermedio', 1, 'Adaptación', 'Contacto', '444444', '222222', [1, 2, 3, 4, 5, 6]),
      turnoSemilla(3, '2024-03-15', 'Contacto Avanzado', 1, 'Adaptación', 'Contacto', '444444', '555555', [1, 2, 3, 4, 5, 6]),
      turnoSemilla(4, '2024-03-22', 'Navegación Inicial', 2, 'Adaptación', 'Navegación', '444444', '666666', [1, 2, 3, 4, 5, 6]),
      turnoSemilla(5, '2024-03-29', 'Instrumentos Avanzados', 3, 'Adaptación', 'Instrumentos', '888888', '777777', [9, 10]),
      turnoSemilla(6, '2024-04-05', 'Campos Tácticos', 4, 'Operaciones HeliTransportadas', 'Campos Extraños', '888888', '999999', [7, 8]),
      turnoSemilla(7, '2024-04-12', 'Navegación Avanzada', 5, 'Operaciones AeroTácticas', 'Formación', '888888', '999999', [1, 2, 3, 4, 5, 6]),
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
    ],
    siguienteIdTurno: 10,
  }
}

let datosActuales = crearDatos()

export function datos(): DatosMock {
  return datosActuales
}

export function reiniciarDatosMock() {
  datosActuales = crearDatos()
}

export function buscarPersona(codigo: string): PersonaMock | undefined {
  return datosActuales.personas.find((persona) => persona.codigo === codigo)
}

export function nombreCorto(persona: PersonaMock): string {
  return `${persona.nombre} ${persona.aPaterno}`
}
