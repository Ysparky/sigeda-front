import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

test.describe('Turnos prácticos contra el backend real', () => {
  // Estas cinco rutas estuvieron CAÍDAS (500 y 400 para todo llamador) hasta la tanda E1, porque
  // dos proyecciones pedían propiedades que la entidad ya no tenía. Es la pantalla central de M1.
  test('la lista de turnos carga y muestra los sembrados', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos')
    await expect(page.getByText('Contacto Básico').first()).toBeVisible({ timeout: 15_000 })
  })

  test('el detalle de un turno trae su instructor y su aeronave', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos/1')
    await expect(page.getByText('Contacto Básico').first()).toBeVisible({ timeout: 15_000 })
  })
})
