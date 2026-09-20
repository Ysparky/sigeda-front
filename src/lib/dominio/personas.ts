export const TIPOS_PERSONA = ['Alumno', 'Instructor PDI', 'Instructor PDE'] as const

export type TipoPersona = (typeof TIPOS_PERSONA)[number]

export const SIN_TIPO = 'Sin tipo'

const ROLES_POR_TIPO: Record<string, readonly string[]> = {
  Alumno: ['Alumno'],
  'Instructor PDI': ['Instructor', 'Jefe de Operaciones', 'Comandante de Escuadrón'],
  'Instructor PDE': ['Instructor', 'Jefe de Operaciones', 'Comandante de Escuadrón'],
  '': ['Jefe de Operaciones', 'Comandante de Escuadrón', 'Administrador Web'],
}

export function esTipoPersona(valor: unknown): valor is TipoPersona {
  return typeof valor === 'string' && TIPOS_PERSONA.some((tipo) => tipo === valor)
}

export function rolesCompatibles(tipo: string | null): readonly string[] {
  return ROLES_POR_TIPO[tipo ?? ''] ?? []
}

export function tiposCompatibles(rol: string | null): readonly (TipoPersona | null)[] {
  const tipos: (TipoPersona | null)[] = [...TIPOS_PERSONA, null]
  if (!rol) return tipos
  return tipos.filter((tipo) => rolesCompatibles(tipo).includes(rol))
}

export function rolPorDefecto(tipo: string | null): string | null {
  if (tipo === 'Alumno') return 'Alumno'
  if (tipo === 'Instructor PDI' || tipo === 'Instructor PDE') return 'Instructor'
  return null
}

export function rolCompatible(tipo: string | null, rol: string | null): boolean {
  return rol !== null && rolesCompatibles(tipo).includes(rol)
}

export function etiquetaDeTipo(tipo: string | null): string {
  return tipo ?? '—'
}
