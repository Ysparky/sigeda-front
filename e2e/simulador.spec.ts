import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

/**
 * Evaluación práctica asistida por simulador, contra el backend real. Prueba las dos superficies
 * nuevas que el frontend expone al servidor: las tolerancias numéricas por maniobra (PUT/GET
 * /api/maniobras/{id}/parametros) y el medio del turno. El motor y la propuesta los cubren las
 * pruebas de integración del backend; acá importa que la UI hable con el servidor vivo.
 */
test.describe('Simulador contra el backend real', () => {
  test('el Jefe de Operaciones carga una tolerancia y persiste', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/programa/maniobras/1/parametros')
    await expect(page.getByRole('heading', { level: 1, name: 'Tolerancias de la maniobra' })).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Clave 1').fill('ALTITUD')
    await page.getByLabel('Unidad 1').fill('ft')
    await page.getByLabel('Objetivo 1').fill('1000')
    await page.getByLabel('Banda E 1').fill('20')
    await page.getByLabel('Banda B 1').fill('50')
    await page.getByLabel('Banda R 1').fill('100')
    await page.getByRole('button', { name: 'Guardar tolerancias' }).click()

    await expect(page.getByText('Tolerancias guardadas con éxito.')).toBeVisible({ timeout: 15_000 })

    // Persistió: al reabrir la pantalla, la tolerancia vuelve del servidor.
    await page.goto('/programa/maniobras/1/parametros')
    await expect(page.getByLabel('Clave 1')).toHaveValue('ALTITUD', { timeout: 15_000 })
    await expect(page.getByLabel('Objetivo 1')).toHaveValue('1000')
  })

  test('el medio Simulador oculta la aeronave y pide el dispositivo', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos/nuevo')
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar turno' })).toBeVisible({ timeout: 15_000 })

    await expect(page.getByLabel('Aeronave')).toBeVisible()
    await page.getByLabel('Medio').selectOption({ label: 'Simulador' })
    await expect(page.getByLabel('Dispositivo')).toBeVisible()
    await expect(page.getByLabel('Aeronave')).toHaveCount(0)
  })
})
