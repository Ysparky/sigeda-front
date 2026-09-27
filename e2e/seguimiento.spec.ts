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

  // Los índices del PDI no los calcula el servidor todavía (dependencia 62, la tabla de coeficientes
  // que el PDI no publica). La pantalla tiene que DECIRLO, no mostrar un cero. El texto es el que la
  // pantalla renderiza de verdad, leído de una corrida contra el servidor real.
  test('la mitad práctica dice que el servidor no calcula los índices', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/seguimiento/666666')
    await expect(page.getByText('El servidor todavía no calcula los índices del PDI.').first()).toBeVisible({
      timeout: 15_000,
    })
  })

  // 555555 aprobó todo lo teórico (notas 20, 18 y 18 en la semilla), así que la mitad teórica no
  // tiene causales y lo tiene que decir en lugar de quedarse vacía.
  test('el legajo de 555555 dice que no tiene causales', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/seguimiento/555555')
    await expect(page.getByRole('heading', { level: 1, name: 'Legajo del alumno' })).toBeVisible()
    await expect(page.getByText('No tiene causales de bajo rendimiento académico.').first()).toBeVisible({
      timeout: 15_000,
    })
  })

  // La regresión que encontró esta suite: la cabecera mostraba «Pedro undefined undefined» porque
  // /api/personas/{cod}/alumno serializaba `apaterno` en minúscula y el frontend leía `APaterno`.
  test('el nombre del alumno sale completo, sin undefined', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/seguimiento/555555')
    await expect(page.getByText('Pedro Rodriguez Garcia · 555555')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/undefined/)).toHaveCount(0)
  })

  test('un Alumno no puede abrir el legajo de otro', async ({ page }) => {
    await entrarComo(page, CUENTAS.alumno)
    await page.goto('/seguimiento/666666')
    await expect(page.getByText('12.00')).toBeHidden()
  })
})
