import { expect, test } from '@playwright/test'

import { admitir, CUENTAS, entrarComo, postular } from './ayudantes'

/**
 * Flujo continuo entrada→desarrollo contra el backend real: una persona se matricula a la convocatoria
 * abierta (Admisión 2026-I) sin crear cuenta; el Coordinador valida, cita, evalúa (la admisión la
 * promueve a Alumno, sin grupo) y registra el pago; después el Coordinador la asigna a la cohorte (Promoción 2026-I) con su instructor
 * responsable. Es la prueba de integración del seam que H2 y los mocks no cubren.
 *
 * REQUIERE el backend en 8080 sobre un `sigeda_demo` migrado hasta la 037 y re-sembrado (grupo 7
 * "Promoción 2026-I" EN_INSCRIPCION, convocatoria 1 → grupo 7).
 */
test.describe('Flujo integrado entrada→desarrollo contra el backend real', () => {
  test('una persona se matricula, el Coordinador la admite y luego la asigna a la cohorte 2026-I', async ({ page }) => {
    // DNI y correo únicos por corrida: el alta crea Persona+Usuario reales y no debe chocar al repetir.
    const sufijo = String(Date.now()).slice(-7)
    const dni = `9${sufijo}`
    const correo = `aspirante.${sufijo}@correo.com`

    await postular(page, { numero: dni, nombres: 'Aspirante', aPaterno: 'Integra', aMaterno: `E${sufijo}`, correo })

    // El Coordinador valida la documentación, cita, registra la evaluación y el pago.
    await entrarComo(page, CUENTAS.coordinador)
    await admitir(page, dni, /Aspirante Integra/)

    // La admisión la vuelve Alumno pero sin grupo: el Coordinador forma el grupo después del ingreso.
    await page.goto('/grupos/7/editar')
    await page.getByRole('checkbox', { name: `Aspirante Integra E${sufijo}` }).check()
    await page.getByLabel('Instructor responsable').selectOption({ label: 'Juan Torres Perez' })
    await page.getByRole('button', { name: 'Guardar grupo' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Promoción 2026-I' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('table', { name: 'Alumnos del grupo' })).toContainText(`Aspirante Integra E${sufijo}`)
  })
})
