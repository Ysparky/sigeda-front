import { expect, type Page } from '@playwright/test'

export type Cuenta = { usuario: string; clave: string }

/** Las cinco cuentas de data_prod.sql. La contraseña sembrada es 123 para todas. */
export const CUENTAS = {
  admin: { usuario: 'admin.sistema', clave: '123' },
  comandante: { usuario: 'comandante.aguirre', clave: '123' },
  operaciones: { usuario: 'jefe.operaciones', clave: '123' },
  instructor: { usuario: 'instructor.perez', clave: '123' },
  alumno: { usuario: 'alumno.lopez', clave: '123' },
} satisfies Record<string, Cuenta>

export async function entrarComo(page: Page, cuenta: Cuenta) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(cuenta.usuario)
  await page.getByLabel('Contraseña').fill(cuenta.clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible({ timeout: 15_000 })
}
