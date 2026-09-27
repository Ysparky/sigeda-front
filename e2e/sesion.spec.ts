import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

test.describe('Iniciar sesión contra el backend real', () => {
  test('cada cuenta sembrada entra y llega a Inicio', async ({ page }) => {
    for (const cuenta of Object.values(CUENTAS)) {
      await entrarComo(page, cuenta)
      await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible()
      await page.context().clearCookies()
      await page.evaluate(() => window.localStorage.clear())
    }
  })

  test('una contraseña incorrecta no entra y lo dice', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Usuario').fill('admin.sistema')
    await page.getByLabel('Contraseña').fill('incorrecta')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Usuario o contraseña incorrectos.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  // Esto estaba roto: el primer login de cada usuario funcionaba y todos los siguientes devolvían
  // un 403 de cuerpo vacío, porque faltaba un flush() antes de insertar el refresh token. Ninguna
  // prueba lo veía porque cada clase se autenticaba una sola vez. Acá se fija desde la interfaz.
  test('el mismo usuario puede entrar, salir y volver a entrar', async ({ page }) => {
    for (let intento = 1; intento <= 3; intento += 1) {
      await entrarComo(page, CUENTAS.comandante)
      await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible()
      await page.evaluate(() => window.localStorage.clear())
    }
  })
})
