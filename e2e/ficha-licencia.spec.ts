import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

/**
 * Parte final del curso contra el backend real: el cierre de la cohorte (F1) y la Ficha de Licencia
 * con su motor §16 (F2–F4). El Coordinador Académico tiene Manage Groups y Manage Licensing.
 * Requiere el backend de la rama `feat/ficha-licencia` en 8080 sobre `sigeda_demo` migrado (035 + 036).
 */
test.describe('Ficha de licencia y cierre de cohorte contra el backend real', () => {
  test('el Coordinador captura una ficha y el motor §16 deriva el estado', async ({ page }) => {
    await entrarComo(page, CUENTAS.coordinador)
    // Código libre por corrida: la ficha es autónoma (clave codAlumno, sin FK).
    const cod = `E2E${String(Date.now()).slice(-7)}`

    await page.goto(`/fichas-licencia/${cod}`)
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Ficha de licencia · ${cod}`) }))
      .toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('En preparación')).toBeVisible()

    // Capturar horas insuficientes: la ficha pasa a Observada y el requisito de 40 h falta.
    await page.getByLabel('Total').fill('30')
    await page.getByRole('button', { name: 'Guardar ficha' }).click()
    await expect(page.getByText('Ficha guardada.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Observada')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/40 h en total/)).toContainText('falta')
  })

  test('el Coordinador cierra una cohorte en progreso', async ({ page }) => {
    await entrarComo(page, CUENTAS.coordinador)
    await page.goto('/grupos/1')
    await expect(page.getByRole('heading', { level: 1, name: 'Grupo 1' })).toBeVisible({ timeout: 15_000 })

    // Re-ejecutable: si ya está cerrada (otra corrida), no hay botón y el estado ya es Cerrada.
    const cerrar = page.getByRole('button', { name: 'Cerrar cohorte' })
    if (await cerrar.count()) {
      await cerrar.click()
    }
    await expect(page.getByText('Cerrada')).toBeVisible({ timeout: 15_000 })
    // El consolidado de la cohorte: sus alumnos con su estado académico.
    await expect(page.getByRole('table', { name: 'Alumnos del grupo' })).toContainText('Lopez')
  })
})
