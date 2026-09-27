import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

test.describe('Módulo de teoría contra el backend real', () => {
  test('el Instructor ve las 24 preguntas sembradas y las puede filtrar', async ({ page }) => {
    await entrarComo(page, CUENTAS.instructor)
    await page.goto('/banco')
    await expect(page.getByRole('heading', { level: 1, name: 'Banco de preguntas' })).toBeVisible()

    // 24 es el conteo de la semilla. Esta vista, sin filtro de texto, devolvía 500 contra
    // PostgreSQL hasta que se agregó el cast del parámetro nulo: si vuelve a romperse, acá se ve.
    await expect(page.getByText(/24 registros?/)).toBeVisible({ timeout: 15_000 })
  })

  test('el Instructor ve los turnos teóricos sembrados', async ({ page }) => {
    await entrarComo(page, CUENTAS.instructor)
    await page.goto('/teoria/turnos')
    await expect(page.getByRole('heading', { level: 1, name: 'Turnos teóricos' })).toBeVisible()
    await expect(page.getByText('Mensual Adoctrinamiento de Vuelo').first()).toBeVisible({ timeout: 15_000 })
  })

  test('el Alumno ve su examen pendiente y puede abrirlo', async ({ page }) => {
    await entrarComo(page, CUENTAS.alumno)
    await page.goto('/examenes')
    await expect(page.getByRole('heading', { level: 1, name: 'Mis exámenes' })).toBeVisible()
    await expect(page.getByText('Semanal Adoctrinamiento de Vuelo').first()).toBeVisible({ timeout: 15_000 })
  })

  test('un Alumno no alcanza el banco de preguntas', async ({ page }) => {
    await entrarComo(page, CUENTAS.alumno)
    await page.goto('/banco')
    await expect(page.getByRole('heading', { level: 1, name: 'Banco de preguntas' })).toBeHidden()
  })
})
