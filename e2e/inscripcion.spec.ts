import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

test.describe('Tramo de entrada contra el backend real', () => {
  test('el landing público muestra el catálogo sin sesión', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Piloto de Helicóptero').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/220 horas/)).toBeVisible()
    await page.getByRole('link', { name: 'Inscribirme' }).first().click()
    await expect(page.getByLabel('DNI')).toBeVisible({ timeout: 15_000 })
  })

  test('una persona se matricula y el Coordinador la valida', async ({ page }) => {
    // DNI y correo únicos por corrida: el alta crea Persona+Usuario reales y no debe chocar al repetir.
    const sufijo = String(Date.now()).slice(-7)
    const dni = `8${sufijo}`
    const correo = `postulante.${sufijo}@correo.com`

    await page.goto('/matricula?curso=1')
    await page.getByLabel('DNI').fill(dni)
    await page.getByLabel('Nombres').fill('Test')
    await page.getByLabel('Apellido paterno').fill('Postulante')
    await page.getByLabel('Apellido materno').fill('E2E')
    await page.getByLabel('Correo').fill(correo)
    await page.getByLabel('Teléfono de contacto').fill('999000111')
    await page.getByLabel('Contraseña').fill('Cambio2026')
    await page
      .getByLabel(/Archivo/)
      .setInputFiles({ name: 'pago.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 e2e') })
    await page.getByRole('button', { name: 'Enviar matrícula' }).click()
    await expect(page.getByText('Matrícula enviada')).toBeVisible({ timeout: 15_000 })

    await entrarComo(page, CUENTAS.coordinador)
    await page.goto('/matriculas')
    await expect(page.getByRole('heading', { level: 1, name: 'Matrículas' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: dni }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Test Postulante/ })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Validar matrícula' }).click()
    // Al validar vuelve a la bandeja de pendientes y la matrícula ya no está ahí.
    await expect(page.getByRole('link', { name: dni })).toHaveCount(0, { timeout: 15_000 })
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
