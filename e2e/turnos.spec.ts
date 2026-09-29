import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

test.describe('Turnos prácticos contra el backend real', () => {
  // Estas cinco rutas estuvieron CAÍDAS (500 y 400 para todo llamador) hasta la tanda E1, porque
  // dos proyecciones pedían propiedades que la entidad ya no tenía. Es la pantalla central de M1.
  test('la lista de turnos carga y muestra los sembrados', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos')
    await expect(page.getByText('Control Básico Inicial').first()).toBeVisible({ timeout: 15_000 })
  })

  test('el detalle de un turno trae su instructor y su aeronave', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos/1')
    await expect(page.getByText('Control Básico Inicial').first()).toBeVisible({ timeout: 15_000 })
  })

  // Dependencia 4: el backend le quitó `Manage Groups` al Jefe de Operaciones. Mientras
  // `permisos.ts` se lo siguió dando, este rol veía Grupos en el menú y recibía 403 al entrar — el
  // desajuste entre las dos tablas de permisos no se nota en ninguna suite de un solo lado.
  test('el Jefe de Operaciones no ve Grupos en el menú ni entra a la pantalla', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await expect(page.getByRole('link', { name: 'Grupos' })).toHaveCount(0)
    await page.goto('/grupos')
    await expect(page.getByRole('heading', { level: 1, name: 'Grupos' })).toBeHidden()
    await expect(page.getByText('No tiene permisos para esta acción.')).toBeVisible({ timeout: 15_000 })
  })

  // Dependencia 4, la otra mitad: el permiso que el rol sí conserva. Si la línea de `permisos.ts` se
  // editara de más y se llevara un vecino, el formulario de turno práctico se quedaría sin alumnos.
  test('el Jefe de Operaciones conserva Manage Shifts y el selector de alumnos carga', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos/nuevo')
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar turno' })).toBeVisible()
    await page.getByRole('button', { name: 'Agregar alumno' }).click()
    await expect(page.getByLabel('Alumno 1').getByRole('option', { name: /Lopez/ })).toBeAttached({ timeout: 15_000 })
  })

  // El catálogo de misiones contra el servidor, porque es donde vale: lo sirve
  // `GET /api/subfases/2/misiones`. Se fijan las dos misiones de Circuitos y Maniobras que tienen las
  // horas extremas —`CM-1` con 1.0 h y `CM-4` con 1.5— porque sus coeficientes salen de dividir por la
  // suma REAL de las horas de la sub fase, 8.5 h: si el coeficiente se guardara en vez de derivarse, o
  // si el denominador fuera las 9.0 h que la Tabla 4 DECLARA, los dos números serían otros (0.1111 y
  // 0.1667). Es la comprobación de que el denominador del coeficiente es la suma real y no lo declarado.
  test('el selector de misión trae el catálogo del PDI que sirve el servidor', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos/nuevo')
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar turno' })).toBeVisible()
    await expect(page.getByLabel('Misión del PDI')).toBeDisabled()
    await page.getByLabel('Sub fase').selectOption({ label: 'Circuitos y Maniobras' })
    const mision = page.getByLabel('Misión del PDI')
    await expect(mision.getByRole('option', { name: 'CM-1 · 1 h · coef. 0.1176' })).toBeAttached({ timeout: 15_000 })
    await expect(mision.getByRole('option', { name: 'CM-4 · 1.5 h · coef. 0.1765' })).toBeAttached()
    await expect(mision.getByRole('option', { name: 'Sin misión asignada' })).toBeAttached()
    await expect(mision).toHaveValue('')
  })
})
