import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

/**
 * Flujo continuo entrada→desarrollo contra el backend real: una persona se matricula a la convocatoria
 * abierta (Admisión 2026-I), el Coordinador valida y admite, y con la admisión el backend la promueve a
 * Alumno y la matricula a la cohorte en inscripción (Promoción 2026-I). Es la prueba de integración del
 * seam que H2 y los mocks no cubren.
 *
 * REQUIERE el stack de esta rama: el backend de `feat/integracion-demo` en 8080 sobre un `sigeda_demo`
 * migrado (035) y re-sembrado (grupo 7 "Promoción 2026-I" EN_INSCRIPCION, convocatoria 1 → grupo 7).
 * Con el backend del demo previo (sin estos cambios) la admisión no matricula a la cohorte. Ver el
 * ledger del plan: la ejecución quedó DIFERIDA hasta reconstruir ese stack.
 */
test.describe('Flujo integrado entrada→desarrollo contra el backend real', () => {
  test('una persona se matricula, el Coordinador la admite y queda en la cohorte 2026-I', async ({ page }) => {
    // DNI y correo únicos por corrida: el alta crea Persona+Usuario reales y no debe chocar al repetir.
    const sufijo = String(Date.now()).slice(-7)
    const dni = `9${sufijo}`
    const correo = `aspirante.${sufijo}@correo.com`

    await page.goto('/matricula?convocatoria=1')
    await page.getByLabel('DNI').fill(dni)
    await page.getByLabel('Nombres').fill('Aspirante')
    await page.getByLabel('Apellido paterno').fill('Integra')
    await page.getByLabel('Apellido materno').fill('E2E')
    await page.getByLabel('Correo').fill(correo)
    await page.getByLabel('Teléfono de contacto').fill('999000222')
    await page.getByLabel('Contraseña').fill('Cambio2026')
    await page
      .getByLabel(/Archivo/)
      .setInputFiles({ name: 'pago.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 e2e') })
    await page.getByRole('button', { name: 'Enviar matrícula' }).click()
    await expect(page.getByText('Matrícula enviada')).toBeVisible({ timeout: 15_000 })

    // El Coordinador valida la documentación y luego admite.
    await entrarComo(page, CUENTAS.coordinador)
    await page.goto('/matriculas')
    await expect(page.getByRole('heading', { level: 1, name: 'Matrículas' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: dni }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Aspirante Integra/ })).toBeVisible({ timeout: 15_000 })
    // Validar la documentación redirige a la bandeja; la matrícula, ya VALIDADA, se reabre para admitir.
    await page.getByRole('button', { name: 'Validar documentación' }).click()
    await page.goto('/matriculas?estado=VALIDADA')
    await page.getByRole('link', { name: dni }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Aspirante Integra/ })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Admitir', exact: true }).click() // 'Admitir' sin casar 'No admitir'
    await expect(page).toHaveURL(/\/matriculas/, { timeout: 15_000 }) // admisión registrada: vuelve a la bandeja

    // Con la admisión, la persona es Alumno de la cohorte 2026-I (grupo 7): figura en sus alumnos.
    await page.goto('/grupos/7')
    await expect(page.getByRole('heading', { level: 1, name: 'Promoción 2026-I' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('table', { name: 'Alumnos del grupo' })).toContainText('Aspirante Integra')
  })
})
