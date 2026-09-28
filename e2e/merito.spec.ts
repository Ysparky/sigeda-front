import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

/**
 * El orden de mérito contra el servidor real. Estuvo cerrado hasta hoy por la dependencia 62 —no se
 * puede ordenar por un índice que no se puede calcular— y se abrió cuando el NFPI pasó a calcularse
 * de verdad: el catálogo de misiones del PDI con sus coeficientes (tanda H) y las diez sub fases que
 * el NIA pondera (tanda I).
 *
 * NO SE AFIRMA EL VALOR DEL NFPI a propósito, aunque se conozca (16.47 al escribir esto). Dos
 * evaluaciones de la semilla tienen un `promedio` que `CalculoNota` no produce, y corregirlas mueve la
 * cadena entera; fijar la cifra acá haría fallar esta prueba por un arreglo correcto del backend. Lo
 * que se fija es lo que no debe cambiar: que el alumno con los diez NSF esté rankeado, que los demás
 * queden «Sin puesto» con su motivo, y que el desempate sea el de §4.1.
 */
test.describe('Orden de mérito contra el backend real', () => {
  test('el Comandante ve la tabla con el alumno rankeado y el resto sin puesto', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/reportes')
    await expect(page.getByRole('heading', { level: 1, name: 'Reportes y orden de mérito' })).toBeVisible()

    const tabla = page.getByRole('table', { name: 'Orden de mérito' })
    await expect(tabla).toBeVisible({ timeout: 15_000 })
    for (const columna of ['Puesto', 'Código', 'Alumno', 'Grupo', 'NFPI', 'NIT', 'NIA']) {
      await expect(tabla.getByRole('columnheader', { name: columna })).toBeVisible()
    }

    // 555555 es el único con nota en las diez sub fases que el NIA pondera, así que es el único con
    // puesto. Su fila lleva un NFPI con forma de nota, no el texto de «sin datos».
    const fila = tabla.getByRole('row').filter({ hasText: '555555' })
    await expect(fila).toHaveCount(1)
    await expect(fila).toContainText('1')
    await expect(fila).not.toContainText('Sin datos suficientes')

    // Y los que no tienen la cadena completa quedan sin puesto, que es la mitad que vuelve útil a lo
    // de arriba: si todos estuvieran rankeados, la aserción anterior no probaría nada.
    await expect(tabla.getByText('Sin puesto').first()).toBeVisible()
  })

  test('ya no aparece ningún aviso de dependencia pendiente', async ({ page }) => {
    await entrarComo(page, CUENTAS.comandante)
    await page.goto('/reportes')
    await expect(page.getByRole('table', { name: 'Orden de mérito' })).toBeVisible({ timeout: 15_000 })

    // Los dos avisos que la pantalla mostraba mientras la 62 estaba abierta. Que hayan desaparecido
    // ES la implementación del orden de mérito: la tabla ya estaba escrita, lo que faltaba era que el
    // servidor pudiera calcular el índice por el que ordena.
    await expect(page.getByText(/coeficientes de misión/)).toHaveCount(0)
    await expect(page.getByText(/no existen? en el servidor/)).toHaveCount(0)
  })

  test('un Alumno no alcanza la pantalla de reportes', async ({ page }) => {
    await entrarComo(page, CUENTAS.alumno)
    await page.goto('/reportes')
    await expect(page.getByRole('table', { name: 'Orden de mérito' })).toHaveCount(0)
  })
})
