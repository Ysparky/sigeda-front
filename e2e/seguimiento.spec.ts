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

  // La cadena del PDI, completa: el NSF de Contacto es un número real ponderado por el PDI sobre una
  // sub fase a medio volar, y desde la tanda I el NIA y el NFPI también salen, porque la semilla ya
  // tiene las diez sub fases que el NIA pondera. La frase que culpaba a la tabla de coeficientes de
  // misión ya no existe: la tabla está implementada, así que si volviera a aparecer estaría mintiendo.
  test('el legajo muestra el NIT y el NSF reales y ya no culpa a los coeficientes de misión', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/seguimiento/555555')
    await expect(page.getByRole('heading', { level: 1, name: 'Legajo del alumno' })).toBeVisible()
    // 18.40 es el NIT que el servidor calcula para 555555 a partir de sus notas 20, 18 y 18.
    await expect(page.getByText('18.40').first()).toBeVisible({ timeout: 15_000 })
    // 14.625 = (13 + 15.5 + 15 + 15) / 4, renormalizado sobre las 4 de las 7 misiones de Contacto que
    // tienen nota: el servidor manda cobertura 0.5714 y la pantalla la traduce a su porcentaje. El 13 y
    // el 15.5 son los que `CalculoNota` produce de sus calificaciones; la semilla declaraba 14.0 y 15.0
    // y se corrigió, de ahí que esta cifra bajara de 14.75.
    await expect(page.getByText('14.63').first()).toBeVisible()
    await expect(page.getByText('Ponderada por el PDI').first()).toBeVisible()
    await expect(page.getByText('Calculada sobre el 57 % de la sub fase, que está incompleta.')).toBeVisible()
    await expect(page.getByText(/coeficientes de misión/)).toHaveCount(0)
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
