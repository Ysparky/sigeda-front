import { expect, type Page, test } from '@playwright/test'

import { CUENTAS, type Cuenta } from './ayudantes'

/**
 * Presentación completa del sistema SIGEDA, grabada en video contra el stack real.
 * Recorre, rol por rol, el ciclo de vida de un curso de piloto de helicóptero:
 * acceso → admisión → programa (Tabla 4) → teoría → vuelo/simulador → seguimiento → licencia.
 * No es una prueba de regresión; es el guion del video. Correr con la config de presentación.
 */

const PAUSA = 2000
const PAUSA_ROTULO = 2600

/** Rótulo de capítulo sobre la página actual (se borra solo al navegar). */
async function rotulo(page: Page, capitulo: string, titulo: string, detalle: string) {
  await page.evaluate(
    ([c, t, d]) => {
      document.getElementById('demo-rotulo')?.remove()
      const el = document.createElement('div')
      el.id = 'demo-rotulo'
      el.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:18px 28px;' +
        'background:linear-gradient(90deg,#0f2d4a,#1e4d7b);color:#fff;font-family:system-ui,sans-serif;' +
        'box-shadow:0 -4px 24px rgba(0,0,0,.25);display:flex;align-items:baseline;gap:16px'
      el.innerHTML =
        `<span style="font-size:13px;letter-spacing:2px;opacity:.7;font-weight:600">${c}</span>` +
        `<span style="font-size:22px;font-weight:700">${t}</span>` +
        `<span style="font-size:15px;opacity:.85">${d}</span>`
      document.body.appendChild(el)
    },
    [capitulo, titulo, detalle],
  )
  await page.waitForTimeout(PAUSA_ROTULO)
}

/** Placa a pantalla completa (portada / cierre). */
async function placa(page: Page, titulo: string, sub: string, segundos = 4) {
  await page.evaluate(
    ([t, s]) => {
      const el = document.createElement('div')
      el.id = 'demo-placa'
      el.style.cssText =
        'position:fixed;inset:0;z-index:100000;background:linear-gradient(135deg,#0b2239,#1e4d7b);' +
        'color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;gap:20px;text-align:center'
      el.innerHTML =
        `<div style="font-size:14px;letter-spacing:4px;opacity:.6;font-weight:600">SIGEDA</div>` +
        `<div style="font-size:46px;font-weight:800;max-width:900px;line-height:1.1">${t}</div>` +
        `<div style="font-size:20px;opacity:.85;max-width:760px">${s}</div>`
      document.body.appendChild(el)
    },
    [titulo, sub],
  )
  await page.waitForTimeout(segundos * 1000)
  await page.evaluate(() => document.getElementById('demo-placa')?.remove())
}

async function asentar(page: Page) {
  // networkidle NO sirve aquí: la SPA hace polling y nunca queda "idle" → colgaría.
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page
    .getByRole('heading', { level: 1 })
    .first()
    .waitFor({ state: 'visible', timeout: 3000 })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

async function entrar(page: Page, cuenta: Cuenta, rol: string) {
  // Cerrar cualquier sesión previa: el token vive en el almacenamiento y haría que /login redirija.
  await page.goto('/').catch(() => {})
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      /* almacenamiento no disponible */
    }
  }).catch(() => {})
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(cuenta.usuario)
  await page.getByLabel('Contraseña').fill(cuenta.clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible({ timeout: 15_000 })
  await rotulo(page, 'ACCESO', `Ingreso como ${rol}`, 'Autenticación por rol: cada perfil ve solo lo suyo.')
}

/** Navega a una ruta, espera que asiente y deja un rótulo. Tolerante: nunca aborta el video. */
async function visitar(page: Page, ruta: string, capitulo: string, titulo: string, detalle: string) {
  await page.goto(ruta)
  await asentar(page)
  await rotulo(page, capitulo, titulo, detalle)
}

test('Presentación completa del sistema SIGEDA', async ({ page }) => {
  test.setTimeout(420_000)

  // ── Portada ──
  await page.goto('/login')
  await placa(page, 'Sistema de Gestión de la Escuela de Aviación', 'Ciclo de vida de un curso de piloto de helicóptero (PP-H)', 5)

  // ── Cap. 1 · Admisión (Coordinador Académico) ──
  await entrar(page, CUENTAS.coordinador, 'Coordinador Académico')
  await visitar(page, '/convocatorias', 'CAP. 1 · TRAMO DE ENTRADA', 'Convocatorias', 'Se abren 2 convocatorias al año con sus vacantes.')
  await visitar(page, '/matriculas', 'CAP. 1 · TRAMO DE ENTRADA', 'Matrículas', 'Postulaciones de la landing pública: validar → admitir.')
  await visitar(page, '/personas', 'CAP. 1 · TRAMO DE ENTRADA', 'Personas', 'El admitido se vuelve alumno y entra a una cohorte.')
  await visitar(page, '/grupos', 'CAP. 1 · TRAMO DE ENTRADA', 'Cohortes', 'Cada curso es una cohorte con estado propio.')

  // ── Cap. 2 · Programa del curso / Tabla 4 (Comandante) ──
  await entrar(page, CUENTAS.comandante, 'Comandante de Escuadrón')
  await visitar(page, '/programa/fases', 'CAP. 2 · PROGRAMA (TABLA 4)', 'Fases y subfases', '5 fases / 12 subfases; los pesos salen de las horas.')
  await visitar(page, '/programa/maniobras', 'CAP. 2 · PROGRAMA (TABLA 4)', 'Maniobras', 'Catálogo de maniobras propio de la escuela.')
  await visitar(page, '/programa/materias', 'CAP. 2 · PROGRAMA (TABLA 4)', 'Materias', 'Asignaturas de la instrucción en tierra.')

  // ── Cap. 3 · Instrucción en tierra (Instructor + Alumno) ──
  await entrar(page, CUENTAS.instructor, 'Instructor')
  await visitar(page, '/teoria/turnos', 'CAP. 3 · INSTRUCCIÓN EN TIERRA', 'Turnos teóricos', 'Clases y exámenes; nota mínima para aprobar.')
  await visitar(page, '/banco', 'CAP. 3 · INSTRUCCIÓN EN TIERRA', 'Banco de preguntas', 'Reactivos por materia, con importación asistida por IA.')
  await entrar(page, CUENTAS.alumno, 'Alumno')
  await visitar(page, '/examenes', 'CAP. 3 · INSTRUCCIÓN EN TIERRA', 'Mis exámenes', 'El alumno rinde y ve su resultado.')

  // ── Cap. 4 · Instrucción de vuelo y simulador (Jefe de Operaciones + Alumno) ──
  await entrar(page, CUENTAS.operaciones, 'Jefe de Operaciones')
  await visitar(page, '/turnos', 'CAP. 4 · VUELO Y SIMULADOR', 'Programación de turnos', 'Orden de vuelo del día; briefing y evaluación.')
  await visitar(page, '/simuladores', 'CAP. 4 · VUELO Y SIMULADOR', 'Simuladores', 'Horas de simulador que acreditan a la licencia (tope 5 h).')
  await visitar(page, '/sesiones-simulador', 'CAP. 4 · VUELO Y SIMULADOR', 'Sesiones de simulador', 'Cada sesión suma horas y resultados.')

  // ── Cap. 5 · Seguimiento y mérito (Comandante) ──
  await entrar(page, CUENTAS.comandante, 'Comandante de Escuadrón')
  await visitar(page, '/seguimiento', 'CAP. 5 · SEGUIMIENTO', 'Escuadrón', 'Estado de todo el escuadrón de un vistazo.')
  await visitar(page, '/seguimiento/alertas', 'CAP. 5 · SEGUIMIENTO', 'Alertas', 'Alumnos en riesgo por asistencia o notas.')
  await visitar(page, '/reportes', 'CAP. 5 · SEGUIMIENTO', 'Orden de mérito', 'Ranking consolidado del curso.')

  // ── Cap. 6 · Parte final: Ficha de Licencia (Coordinador) ──
  await entrar(page, CUENTAS.coordinador, 'Coordinador Académico')
  const cod = `DEMO${String(Date.now()).slice(-5)}`
  await visitar(page, `/fichas-licencia/${cod}`, 'CAP. 6 · LICENCIA (PP-H)', 'Ficha de licencia', 'Motor §16 de la RAP 61: requisitos, alertas y bloqueos.')
  try {
    await expect(page.getByText('En preparación')).toBeVisible({ timeout: 10_000 })
    await page.getByLabel('Total').fill('30')
    await page.getByLabel('Doble mando').fill('25')
    await page.getByRole('button', { name: 'Guardar ficha' }).click()
    await expect(page.getByText('Ficha guardada.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Observada')).toBeVisible({ timeout: 15_000 })
    await rotulo(page, 'CAP. 6 · LICENCIA (PP-H)', 'El motor evalúa en vivo', 'Faltan horas → la ficha queda "Observada" con el requisito marcado.')
  } catch {
    await rotulo(page, 'CAP. 6 · LICENCIA (PP-H)', 'Ficha de licencia', 'Requisitos, alertas y bloqueos de la RAP 61.')
  }

  // ── Cierre de cohorte ──
  try {
    await page.goto('/grupos/1')
    await asentar(page)
    const cerrar = page.getByRole('button', { name: 'Cerrar cohorte' })
    if (await cerrar.count()) await cerrar.click()
    await expect(page.getByText('Cerrada')).toBeVisible({ timeout: 10_000 })
    await rotulo(page, 'CAP. 6 · LICENCIA (PP-H)', 'Cierre de la cohorte', 'Al terminar el curso se cierra la cohorte y se consolida.')
  } catch {
    await rotulo(page, 'CAP. 6 · LICENCIA (PP-H)', 'Cierre de la cohorte', 'Al terminar el curso se cierra la cohorte y se consolida.')
  }

  // ── Cierre ──
  await placa(page, 'SIGEDA, de la postulación a la licencia', 'Admisión · Programa · Teoría · Vuelo · Seguimiento · Licencia', 5)
  await page.waitForTimeout(PAUSA)
})
