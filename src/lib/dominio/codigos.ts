/**
 * Código de persona: 6 caracteres del alfabeto que asigna la matrícula (A–Z y 0–9,
 * ver MatriculaServiceImpl.ALFABETO en el backend). La semilla histórica usa sólo
 * dígitos, pero toda alta nueva es alfanumérica, así que validar «6 dígitos» deja
 * fuera a los alumnos matriculados.
 */
export const COD_PERSONA = '[A-Z0-9]{6}'

export const PATRON_COD_PERSONA = new RegExp(`^${COD_PERSONA}$`)

export function esCodPersona(valor: string): boolean {
  return PATRON_COD_PERSONA.test(valor)
}
