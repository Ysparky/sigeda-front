import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo, postular } from './ayudantes'

test.describe('Tramo de entrada contra el backend real', () => {
  test('el landing público muestra el catálogo sin sesión', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Piloto de Helicóptero').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/94 horas/)).toBeVisible()
    // Desde el módulo de postulación cada curso enlaza a su convocatoria abierta.
    await page.getByRole('link', { name: 'Postular' }).first().click()
    await expect(page).toHaveURL(/\/matricula\?convocatoria=\d+/)
    await expect(page.getByLabel('Número de documento')).toBeVisible({ timeout: 15_000 })
  })

  test('una persona postula sin cuenta, consulta con su código y el Coordinador valida', async ({ page }) => {
    const sufijo = String(Date.now()).slice(-7)
    const numero = `8${sufijo}`
    const codigo = await postular(page, {
      numero,
      nombres: 'Test',
      aPaterno: 'Postulante',
      aMaterno: 'E2E',
      correo: `postulante.${sufijo}@correo.com`,
    })

    await page.goto('/postulacion')
    await page.getByLabel('Número de documento').fill(numero)
    await page.getByLabel('Código de postulación').fill(codigo)
    await page.getByRole('button', { name: 'Consultar' }).click()
    await expect(page.getByTestId('estado-postulacion')).toHaveText('En revisión documental', { timeout: 15_000 })

    await entrarComo(page, CUENTAS.coordinador)
    await page.goto('/matriculas')
    await page.getByRole('link', { name: numero }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Test Postulante/ })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Validar documentación' }).click()
    await expect(page.getByRole('link', { name: numero })).toHaveCount(0, { timeout: 15_000 })
  })

  test('el instructor registra la asistencia de un turno práctico', async ({ page }) => {
    await entrarComo(page, CUENTAS.instructor)
    await page.goto('/turnos/1/asistencia')
    await expect(page.getByRole('heading', { level: 1, name: 'Asistencia del turno' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('combobox').first().selectOption('PRESENTE')
    await page.getByRole('button', { name: 'Guardar asistencia' }).click()
    await expect(page.getByText('Asistencia guardada')).toBeVisible({ timeout: 15_000 })
  })

  test('el instructor ve el reporte de asistencia del grupo', async ({ page }) => {
    await entrarComo(page, CUENTAS.instructor)
    await page.goto('/asistencias')
    await expect(page.getByRole('heading', { level: 1, name: 'Asistencia' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Lopez Chaparro, Oscar')).toBeVisible({ timeout: 15_000 })
  })
})
