export const PERMISOS = [
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
  ],
  Instructor: ['Read', 'Write', 'Update', 'Create Reports', 'View Disapproved', 'View My Group'],
  'Jefe de Operaciones': ['Read', 'Write', 'Update', 'View My Group', 'Manage Shifts', 'Manage Groups', 'Manage Standards'],
  Alumno: ['Read', 'Update'],
}

export function permisosDeRol(nombreRol: string): ReadonlySet<Permiso> {
  return new Set(PERMISOS_POR_ROL[nombreRol] ?? [])
}

export function puede(permisos: ReadonlySet<Permiso>, requerido: Permiso | undefined): boolean {
  return requerido === undefined || permisos.has(requerido)
}
