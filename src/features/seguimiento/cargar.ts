import { notFound } from '@tanstack/react-router'
import { SinPermisoError } from '@/lib/auth/guardas'
import { veSoloLoPropio } from '@/lib/auth/pantallas'
import type { Sesion } from '@/lib/auth/sesion'

const PATRON_CODIGO = /^\d{6}$/

export function codigoQueSeConsulta(actual: Sesion | null, codAlumno: string): string {
  if (actual !== null && veSoloLoPropio(actual)) return actual.codPersona ?? ''
  return codAlumno
}

export function cargarLegajoVisible(actual: Sesion | null, codAlumno: string): { codAlumno: string } {
  if (!PATRON_CODIGO.test(codAlumno)) throw notFound()
  if (actual !== null && veSoloLoPropio(actual) && actual.codPersona !== codAlumno) throw new SinPermisoError()
  return { codAlumno }
}
