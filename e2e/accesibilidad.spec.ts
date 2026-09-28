import { expect, test } from '@playwright/test'

import { CUENTAS, entrarComo } from './ayudantes'

/**
 * §8 del spec pide «contraste AA en ambos temas». Esta es la única prueba que lo MIDE en vez de
 * afirmarlo: lee los colores computados del control DIRBE en el navegador real, los convierte a sRGB
 * pintándolos en un canvas —porque `getComputedStyle` devuelve `oklab(...)` y una conversión a ojo se
 * equivoca— y calcula la razón de contraste de la WCAG.
 *
 * Nació de un defecto medido: el estado seleccionado era `bg-muted`, L 0.955 contra un fondo L 0.985,
 * y **el mismo color que `hover:bg-muted`**. En una captura del control, con `B` elegida y el puntero
 * sobre `R`, las dos se veían idénticas: el instructor no podía ver qué nota había puesto.
 *
 * Se afirman las DOS cosas, porque la primera sola no alcanza: que el texto contra su fondo pase AA, y
 * que el fondo de la nota elegida **no sea igual** al de la nota bajo el puntero. Hay que esperar a que
 * termine `transition-all` antes de medir, o se lee un color a mitad de la animación (con alfa 0.46).
 */

function ratio(a: number[], b: number[]) {
  const lum = ([r, g, b]: number[]) => {
    const f = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
  }
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

for (const tema of ['claro', 'oscuro'] as const) {
  test(`contraste del DIRBE elegido · tema ${tema}`, async ({ page }) => {
    await entrarComo(page, CUENTAS.instructor)
    await page.goto('/turnos/2/evaluar/222222')
    const grupo = page.getByRole('radiogroup').first()
    await grupo.waitFor({ timeout: 15_000 })
    if (tema === 'oscuro') {
      await page.evaluate(() => document.documentElement.classList.add('dark'))
    }
    const elegida = grupo.getByRole('radio', { name: /^B \(/ })
    await elegida.click()
    await grupo.getByRole('radio', { name: /^R \(/ }).hover()
    await page.waitForTimeout(800) // que termine `transition-all` antes de medir

    const medida = await elegida.evaluate((n) => {
      const e = getComputedStyle(n)
      return { fondo: e.backgroundColor, texto: e.color }
    })
    const fondoHover = await grupo
      .getByRole('radio', { name: /^R \(/ })
      .evaluate((n) => getComputedStyle(n).backgroundColor)

    const aRgb = (css: string) =>
      page.evaluate((valor) => {
        const lienzo = document.createElement('canvas')
        lienzo.width = 1
        lienzo.height = 1
        const ctx = lienzo.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 1, 1)
        ctx.fillStyle = valor
        ctx.fillRect(0, 0, 1, 1)
        const d = ctx.getImageData(0, 0, 1, 1).data
        return [d[0]!, d[1]!, d[2]!]
      }, css)
    const rgbFondo = await aRgb(medida.fondo)
    const rgbTexto = await aRgb(medida.texto)
    const rgbHover = await aRgb(fondoHover)
    const r = ratio(rgbFondo as number[], rgbTexto as number[])
    console.log(`[${tema}] elegida fondo=${JSON.stringify(rgbFondo)} texto=${JSON.stringify(rgbTexto)} ratio=${r.toFixed(2)}`)
    console.log(`[${tema}] hover fondo=${JSON.stringify(rgbHover)} distinguible=${JSON.stringify(rgbHover) !== JSON.stringify(rgbFondo)}`)
    expect(r).toBeGreaterThanOrEqual(4.5)
    expect(JSON.stringify(rgbHover)).not.toBe(JSON.stringify(rgbFondo))
  })
}
