export const PERMISOS_BACKEND = [
  'Read',
  'Write',
  'Update',
  'Delete',
  'View Disapproved',
  'Create Reports',
  'View My Group',
  'View All Groups',
  'Approve Evaluations',
  'Modify Evaluations',
  'Manage Standards',
  'Manage Groups',
  'Manage Shifts',
  'Manage Maneuvers',
  'Manage Subphases',
  'Manage Phases',
  'Manage Users',
  'Manage Roles',
] as const

export const PERMISOS_CONTRATO = ['Manage Subjects', 'Manage Questions', 'Manage Exams', 'Take Exams'] as const

export const PERMISOS = [...PERMISOS_BACKEND, ...PERMISOS_CONTRATO] as const

export type Permiso = (typeof PERMISOS)[number]

const PERMISOS_POR_ROL: Record<string, readonly Permiso[]> = {
  'Administrador Web': [
    'Read',
    'Write',
    'Update',
    'Delete',
    'Manage Shifts',
    'Manage Groups',
    'Manage Standards',
    'Create Reports',
    'View Disapproved',
    'View My Group',
    'View All Groups',
    'Modify Evaluations',
    'Manage Phases',
    'Manage Subphases',
    'Manage Maneuvers',
    'Manage Users',
    'Manage Roles',
    'Manage Subjects',
    'Manage Questions',
    'Manage Exams',
  ],
  'Comandante de Escuadrón': [
    'Read',
    'Write',
    'Update',
    'Create Reports',
    'View Disapproved',
    'View My Group',
    'View All Groups',
    'Modify Evaluations',
    'Manage Phases',
    'Manage Subphases',
    'Manage Maneuvers',
    'Manage Subjects',
  ],
  Instructor: [
    'Read',
    'Write',
    'Update',
    'Create Reports',
    'View Disapproved',
    'View My Group',
    'Manage Questions',
    'Manage Exams',
  ],
  // Sin `Manage Groups`: la dependencia 4 lo dejó solo en el Administrador Web, porque gestionar
  // grupos es matrícula y no operaciones de vuelo. `contrato-api-turnos.md` lo documentaba al revés
  // como desvío deliberado; la 4 lo revirtió y esa línea es la que cedió. No rompe el formulario de
  // turno práctico: `fuenteDeAlumnos` manda al Jefe de Operaciones por `Manage Shifts`.
  'Jefe de Operaciones': ['Read', 'Write', 'Update', 'View My Group', 'Manage Shifts', 'Manage Standards'],
  Alumno: ['Read', 'Update', 'Take Exams'],
}

export function permisosDeRol(nombreRol: string): ReadonlySet<Permiso> {
  return new Set(Object.hasOwn(PERMISOS_POR_ROL, nombreRol) ? PERMISOS_POR_ROL[nombreRol] : [])
}

export function puede(permisos: ReadonlySet<Permiso>, requerido: Permiso | undefined): boolean {
  return requerido === undefined || permisos.has(requerido)
}
