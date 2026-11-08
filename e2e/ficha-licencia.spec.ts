import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

/**
 * Finalización del curso contra el backend real. La semilla trae la Promoción 2026-II (grupo 8) cerrada:
 * Rosa Quispe (121212, alumno.quispe) egresó y Mario Ccori se retiró. El Grupo 1 sigue en curso.
 */
test.describe('Finalización del curso contra el backend real', () => {
  test('una cohorte con alumnos en curso no cierra y el tablero dice por qué', async ({ page }) => {
    await entrarComo(page, CUENTAS.coordinador)
    await page.goto('/grupos/1')
    const tablero = page.getByRole('region', { name: 'Cierre de la cohorte' })
    await expect(tablero).toBeVisible({ timeout: 15_000 })
    await expect(tablero.getByRole('button', { name: 'Cerrar cohorte' })).toBeDisabled()
    await expect(tablero.getByRole('alert')).toContainText('Sin concluir')
  })

  test('el acta de la cohorte cerrada lleva a la constancia y a la ficha del egresado', async ({ page }) => {
    await entrarComo(page, CUENTAS.coordinador)
    await page.goto('/grupos/8')
    const acta = page.getByRole('table', { name: 'Acta de cierre' })
    await expect(acta).toBeVisible({ timeout: 15_000 })
    await expect(acta.getByRole('row', { name: /Rosa Quispe/ })).toContainText('Egresado')
    await expect(acta.getByRole('row', { name: /Mario Ccori/ })).toContainText('Retirado')

    await acta.getByRole('link', { name: 'Ficha de licencia de Rosa Quispe' }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Ficha de licencia · 121212/ })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Curso del CIAC aprobado/)).toContainText('cumple')
    for (const requisito of [/vuelo solo diurno/, /travesía solo/, /100 NM/, /vuelo nocturno/, /Certificado médico/, /Inglés vigente/, /Declaración del instructor/])
      await expect(page.getByText(requisito).first()).toContainText('cumple')
    await expect(page.getByText(/Examen teórico DGAC/)).toContainText('falta')
    await page.getByLabel('Total').fill('30')
    await page.getByRole('button', { name: 'Guardar ficha' }).click()
    await expect(page.getByText('Ficha guardada.')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('span[data-estado]')).toHaveText('Observada', { timeout: 15_000 })
  })

  test('la ficha de quien no egresó no se guarda', async ({ page }) => {
    await entrarComo(page, CUENTAS.coordinador)
    await page.goto('/fichas-licencia/111111')
    await expect(page.getByRole('alert')).toContainText('La ficha de licencia se abre al egresar del curso.', { timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Guardar ficha' })).toBeDisabled()
  })

  test('la egresada ve su pase de egreso e imprime su constancia', async ({ page }) => {
    await entrarComo(page, CUENTAS.egresada)
    const pase = page.getByRole('region', { name: 'Egresaste' })
    await expect(pase).toContainText(/CE-\d{4}-008-01/)
    await pase.getByRole('link', { name: 'Ver constancia' }).click()
    const constancia = page.getByRole('article', { name: /Constancia CE-\d{4}-008-01/ })
    await expect(constancia).toContainText('Rosa Quispe Mamani', { timeout: 15_000 })
    await expect(constancia).toContainText('16.76')
  })
})
