import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

/**
 * Evaluación por simulador contra el backend real: el módulo es autónomo de la nota académica
 * (no toca DIRBE/NFPI/Tabla 4). Lo que prueba aquí y no en H2 ni en los mocks: el ciclo completo
 * de una sesión contra PostgreSQL vivo —planificar, iniciar, calificar por indicador— y que el
 * resumen Competente/No competente se DERIVA de los grados (un indicador en 1 ⇒ No competente),
 * nunca se persiste. El escenario sembrado es "Emergencia en vuelo - falla de motor" con 5
 * indicadores (data_prod.sql).
 */
test.describe('Simulador contra el backend real', () => {
  test('el Jefe de Operaciones ve el simulador sembrado', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/simuladores')
    await expect(page.getByText('FNPT II - Bell 206').first()).toBeVisible({ timeout: 15_000 })
  })

  test('ciclo completo: planificar, iniciar, calificar con un 1 ⇒ No competente', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)

    // Planificar sobre el simulador y el escenario sembrados (únicos, así que el formulario ya los trae).
    await page.goto('/sesiones-simulador/nueva')
    await expect(page.getByRole('heading', { level: 1, name: 'Planificar sesión' })).toBeVisible({ timeout: 15_000 })
    await page.getByLabel('Código del alumno').fill('111111') // alumno.lopez
    await page.getByLabel('Código del instructor').fill('444444') // instructor.perez
    await page.getByLabel('Fecha planificada').fill('2026-12-01')
    await page.getByRole('button', { name: 'Planificar' }).click()

    // Queda en el detalle de la sesión recién creada, en estado Planificada.
    await expect(page.getByRole('heading', { level: 1, name: /Emergencia en vuelo/ })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Planificada', { exact: true })).toBeVisible()

    // Iniciar: pasa a En curso y aparece la acción de calificar.
    await page.getByRole('button', { name: 'Iniciar' }).click()
    const calificar = page.getByRole('link', { name: 'Calificar' })
    await expect(calificar).toBeVisible({ timeout: 15_000 })
    await calificar.click()

    // Calificar: el primer indicador en 1 (no competente), el resto en su valor por defecto (3).
    await expect(page.getByRole('heading', { level: 1, name: 'Calificar sesión' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('combobox').first().selectOption('1')
    await page.getByRole('button', { name: 'Guardar calificación' }).click()

    // Vuelve al detalle: completada y el resumen derivado debe ser No competente.
    await expect(page.getByRole('heading', { level: 2, name: 'Resultado de la sesión' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Completada', { exact: true })).toBeVisible()
    await expect(page.getByText('No competente', { exact: true })).toBeVisible()
  })

  // Depende del ciclo anterior (serial, workers:1): esa corrida dejó una sesión completada del
  // alumno 111111. Prueba que /sesiones-simulador/mias filtra por el código del que llama, contra PG.
  test('el alumno ve su sesión completada en "Mis sesiones"', async ({ page }) => {
    await entrarComo(page, CUENTAS.alumno)
    await page.goto('/mis-sesiones')
    await expect(page.getByRole('heading', { level: 1, name: 'Mis sesiones de simulador' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Emergencia en vuelo - falla de motor').first()).toBeVisible({ timeout: 15_000 })
  })

  test('el alumno no accede a la gestión de sesiones de simulador', async ({ page }) => {
    await entrarComo(page, CUENTAS.alumno)
    await page.goto('/sesiones-simulador')
    await expect(page.getByText('No tiene permisos para esta acción.')).toBeVisible({ timeout: 15_000 })
  })
})
