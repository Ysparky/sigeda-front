import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

test.describe('Turnos prácticos contra el backend real', () => {
  // Estas cinco rutas estuvieron CAÍDAS (500 y 400 para todo llamador) hasta la tanda E1, porque
  // dos proyecciones pedían propiedades que la entidad ya no tenía. Es la pantalla central de M1.
  test('la lista de turnos carga y muestra los sembrados', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos')
    await expect(page.getByText('Contacto Básico').first()).toBeVisible({ timeout: 15_000 })
  })

  test('el detalle de un turno trae su instructor y su aeronave', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos/1')
    await expect(page.getByText('Contacto Básico').first()).toBeVisible({ timeout: 15_000 })
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

  // Dependencia 62, y contra el servidor porque es donde vale: el catálogo lo sirve
  // `GET /api/subfases/2/misiones`, y `N/I-7` es la única misión del bloque que vale 1 h contra 1.5.
  // Si el coeficiente se guardara en vez de derivarse de las horas, o si la respuesta llegara con otra
  // forma, es la opción que no aparecería. El servidor manda el número como `0.1`: los cuatro
  // decimales los pone la pantalla, así que esto también fija que no se muestre el crudo.
  test('el selector de misión trae el catálogo del PDI que sirve el servidor', async ({ page }) => {
    await entrarComo(page, CUENTAS.operaciones)
    await page.goto('/turnos/nuevo')
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar turno' })).toBeVisible()
    await expect(page.getByLabel('Misión del PDI')).toBeDisabled()
    await page.getByLabel('Sub fase').selectOption({ label: 'Navegación' })
    const mision = page.getByLabel('Misión del PDI')
    await expect(mision.getByRole('option', { name: 'N/I-7 · 1 h · coef. 0.1000' })).toBeAttached({ timeout: 15_000 })
    await expect(mision.getByRole('option', { name: 'N/I-1 · 1.5 h · coef. 0.1500' })).toBeAttached()
    await expect(mision.getByRole('option', { name: 'Sin misión asignada' })).toBeAttached()
    await expect(mision).toHaveValue('')
  })
})
