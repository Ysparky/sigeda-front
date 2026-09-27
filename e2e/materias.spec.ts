import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

test.describe('Materias contra el backend real', () => {
  test('el Comandante ve las 11 materias sembradas', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/programa/materias')
    await expect(page.getByRole('heading', { level: 1, name: 'Materias' })).toBeVisible()
    await expect(page.getByText('Adoctrinamiento de Vuelo').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Fraseología Aeronáutica en Inglés').first()).toBeVisible()
  })

  test('un nombre repetido lo rechaza el servidor y se muestra bajo el campo', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/programa/materias')
    await page.getByRole('button', { name: 'Registrar materia' }).click()
    const dialogo = page.getByRole('dialog')
    await dialogo.getByLabel('Nombre').fill('Meteorología')
    await dialogo.getByLabel('Nota mínima').fill('16')
    await dialogo.getByLabel('Coeficiente').fill('0.04')
    await dialogo.getByRole('button', { name: 'Guardar materia' }).click()
    await expect(page.getByText('Ya existe una materia con ese nombre.')).toBeVisible({ timeout: 15_000 })
  })
})
