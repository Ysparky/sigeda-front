import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

test.describe('Seguimiento contra el backend real', () => {
  // Las cifras vienen del backend calculando sobre la semilla, no de una fijación del frontend:
  // 666666 tiene NA 12.00 en Adoctrinamiento de Vuelo, que está bajo el 13 de la causal.
  test('el legajo de 666666 muestra su NIT calculado y su causal', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/seguimiento/666666')
    await expect(page.getByRole('heading', { level: 1, name: 'Legajo del alumno' })).toBeVisible()
    await expect(page.getByText('12.00').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Promedio de asignatura bajo 13').first()).toBeVisible()
  })

  // El NIA y el NFPI son null porque falta la tabla de coeficientes de misión del PDI
  // (dependencia 62). La pantalla tiene que DECIR qué falta, no mostrar un cero.
  test('la mitad práctica explica por qué no se puede calcular', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/seguimiento/666666')
    await expect(page.getByText(/coeficientes de misión/).first()).toBeVisible({ timeout: 15_000 })
  })

  test('el legajo de 555555 muestra la mitad teórica completa', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/seguimiento/555555')
    await expect(page.getByRole('heading', { level: 1, name: 'Legajo del alumno' })).toBeVisible()
    await expect(page.getByText('18.40').first()).toBeVisible({ timeout: 15_000 })
  })

  test('un Alumno no puede abrir el legajo de otro', async ({ page }) => {
    await entrarComo(page, CUENTAS.alumno)
    await page.goto('/seguimiento/666666')
    await expect(page.getByText('12.00')).toBeHidden()
  })
})
