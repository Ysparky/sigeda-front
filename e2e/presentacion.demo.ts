import { expect, type Page, test } from '@playwright/test'

import { CUENTAS, type Cuenta, admitir, postular } from './ayudantes'

/**
 * Presentación de SIGEDA grabada contra el stack real, como UNA SOLA HISTORIA que sigue el ciclo de
 * vida de un curso de piloto de helicóptero (PDI EA-510): un aspirante ingresa a la cohorte, la
 * instrucción en tierra y de vuelo avanza, el sistema calcula el mérito del PDI, y el curso termina
 * con la licencia PP-H y el cierre de la cohorte. No es una prueba de regresión; es el guion del video.
 */

const PAUSA = 2000
const PAUSA_ROTULO = 2800

async function rotulo(page: Page, capitulo: string, titulo: string, detalle: string) {
  await page.evaluate(
    ([c, t, d]) => {
      document.getElementById('demo-rotulo')?.remove()
      const el = document.createElement('div')
      el.id = 'demo-rotulo'
      el.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:18px 28px;pointer-events:none;' +
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
        `<div style="font-size:44px;font-weight:800;max-width:920px;line-height:1.12">${t}</div>` +
        `<div style="font-size:20px;opacity:.85;max-width:780px">${s}</div>`
      document.body.appendChild(el)
    },
    [titulo, sub],
  )
  await page.waitForTimeout(segundos * 1000)
  await page.evaluate(() => document.getElementById('demo-placa')?.remove())
}

async function asentar(page: Page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(1000)
}

async function entrar(page: Page, cuenta: Cuenta, rol: string, detalle: string) {
  await page.goto('/').catch(() => {})
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      /* noop */
    }
  }).catch(() => {})
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(cuenta.usuario)
  await page.getByLabel('Contraseña').fill(cuenta.clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: /^(Inicio|Mi curso|Mi cohorte)$/, level: 1 })).toBeVisible({ timeout: 15_000 })
  await rotulo(page, 'ACCESO', `Entra el ${rol}`, detalle)
}

async function visitar(page: Page, ruta: string, capitulo: string, titulo: string, detalle: string) {
  await page.goto(ruta)
  await asentar(page)
  await rotulo(page, capitulo, titulo, detalle)
}

test('Presentación: el ciclo de un curso en SIGEDA', async ({ page }) => {
  test.setTimeout(420_000)

  // ── Portada ──
  await page.goto('/login')
  await placa(
    page,
    'El ciclo de un curso de piloto de helicóptero',
    'De la postulación a la licencia PP-H, siguiendo una cohorte de principio a fin',
    5,
  )

  // ════════ ACTO 1 · INGRESO A LA COHORTE ════════
  // Un aspirante llega a la web pública (sin sesión): el catálogo solo deja postular al curso
  // cuando tiene una convocatoria de admisión abierta. Ahí es donde elige la convocatoria.
  const sufijo = String(Date.now()).slice(-7)
  const dni = `9${sufijo}`
  const correo = `aspirante.${sufijo}@correo.com`

  await page.goto('/')
  await asentar(page)
  await page.evaluate(() => document.getElementById('cursos')?.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(900)
  await rotulo(page, 'ACTO 1 · INGRESO', 'La admisión está abierta', 'El curso solo admite postulantes cuando tiene una convocatoria abierta: aquí, Admisión 2026-I.')
  await page.getByRole('link', { name: 'Postular' }).first().click()

  // Al postular por esa convocatoria, el formulario abre con su nombre: no es un alta genérica.
  await asentar(page)
  await expect(page.getByRole('heading', { level: 1, name: /Admisión 2026-I/ })).toBeVisible({ timeout: 15_000 })
  await rotulo(page, 'ACTO 1 · INGRESO', 'Postula a la convocatoria', 'El aspirante se matricula a “Admisión 2026-I”, la convocatoria que enruta a la cohorte.')
  const codigo = await postular(page, { numero: dni, nombres: 'Mateo', aPaterno: 'Quispe', aMaterno: 'Rojas', correo })
  await rotulo(page, 'ACTO 1 · INGRESO', 'Postulación enviada', `Sin crear cuenta: con su documento y el código ${codigo} sigue el avance.`)

  // El Coordinador gestiona la admisión. Primero la convocatoria: el proceso que la gobierna.
  await entrar(page, CUENTAS.coordinador, 'Coordinador Académico', 'Gestiona la admisión y la cohorte.')
  await page.goto('/convocatorias')
  await asentar(page)
  await rotulo(page, 'ACTO 1 · INGRESO', 'La convocatoria de admisión', '“Admisión 2026-I” fija vacantes y fechas, y enruta a los admitidos a la Promoción 2026-I.')
  await page.goto('/matriculas')
  await asentar(page)
  await rotulo(page, 'ACTO 1 · INGRESO', 'Bandeja de matrículas', 'Llegan las postulaciones de esa convocatoria; el Coordinador las revisa una por una.')
  await rotulo(page, 'ACTO 1 · INGRESO', 'Admisión', 'Documentos, citación, evaluación (examen, entrevista y psicológica) y pago de matrícula.')
  await admitir(page, dni, /Mateo Quispe/)

  await page.goto('/grupos/7/editar')
  await asentar(page)
  await rotulo(page, 'ACTO 1 · INGRESO', 'Formación del grupo', 'El Coordinador asigna al alumno y a su instructor responsable (hasta 20 por grupo).')
  await page.getByRole('checkbox', { name: /Mateo Quispe/ }).check()
  await page.getByLabel('Instructor responsable').selectOption({ label: 'Juan Torres Perez' })
  await page.getByRole('button', { name: 'Guardar grupo' }).click()
  await expect(page.getByRole('table', { name: 'Alumnos del grupo' })).toContainText('Mateo Quispe', { timeout: 15_000 })
  await rotulo(page, 'ACTO 1 · INGRESO', 'Ya es alumno de la cohorte', 'Mateo Quispe figura en la Promoción 2026-I: el curso empieza.')

  // ════════ ACTO 2 · INSTRUCCIÓN EN TIERRA ════════
  await entrar(page, CUENTAS.instructor, 'Instructor', 'Programa y califica la instrucción teórica.')
  await visitar(page, '/teoria/turnos', 'ACTO 2 · INSTRUCCIÓN EN TIERRA', 'Turnos teóricos', 'Las clases y exámenes se programan, se rinden y se califican.')
  await visitar(page, '/banco', 'ACTO 2 · INSTRUCCIÓN EN TIERRA', 'Banco de preguntas', 'Reactivos por materia, con importación asistida por IA.')

  // ════════ ACTO 3 · INSTRUCCIÓN DE VUELO Y SIMULADOR ════════
  await entrar(page, CUENTAS.operaciones, 'Jefe de Operaciones', 'Programa el vuelo y administra el simulador.')
  await visitar(page, '/turnos', 'ACTO 3 · VUELO Y SIMULADOR', 'Programación de turnos', 'La orden de vuelo del día; cada vuelo se evalúa maniobra por maniobra.')
  await visitar(page, '/simuladores', 'ACTO 3 · VUELO Y SIMULADOR', 'Simulador', 'Las horas de simulador acreditan a la licencia, con tope de 5 h.')

  // ════════ ACTO 4 · SEGUIMIENTO Y MÉRITO (el PDI EA-510) ════════
  await entrar(page, CUENTAS.comandante, 'Comandante de Escuadrón', 'Supervisa el avance y el orden de mérito.')
  await visitar(page, '/reportes', 'ACTO 4 · SEGUIMIENTO Y MÉRITO', 'Orden de mérito', 'El servidor calcula el NFPI de cada alumno y arma el ranking de la cohorte.')
  await visitar(page, '/seguimiento/555555', 'ACTO 4 · SEGUIMIENTO Y MÉRITO', 'Legajo del alumno', 'La cadena del PDI: nota → NSF ponderado → NIT → NIA → NFPI, con sus causales.')
  await visitar(page, '/seguimiento/alertas', 'ACTO 4 · SEGUIMIENTO Y MÉRITO', 'Alertas', 'Los alumnos en riesgo por asistencia o bajo rendimiento se señalan solos.')

  // ════════ ACTO 5 · PARTE FINAL: LICENCIA Y CIERRE ════════
  await entrar(page, CUENTAS.coordinador, 'Coordinador Académico', 'Tramita la licencia y cierra el curso.')
  await visitar(page, '/fichas-licencia/555555', 'ACTO 5 · LICENCIA (PP-H)', 'Ficha de licencia', 'Al terminar, se consolidan los requisitos de la RAP 61 para la licencia PP-H.')
  try {
    await page.getByLabel('Total').fill('30')
    await page.getByLabel('Doble mando').fill('25')
    await page.getByRole('button', { name: 'Guardar ficha' }).click()
    await expect(page.getByText('Ficha guardada.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Observada')).toBeVisible({ timeout: 15_000 })
    await rotulo(page, 'ACTO 5 · LICENCIA (PP-H)', 'El motor §16 evalúa en vivo', 'Faltan horas de vuelo → la ficha queda "Observada" con el requisito marcado.')
  } catch {
    await rotulo(page, 'ACTO 5 · LICENCIA (PP-H)', 'El motor §16', 'Requisitos, alertas y bloqueos de la RAP 61, evaluados en vivo.')
  }

  try {
    await page.goto('/grupos/3')
    await asentar(page)
    const cerrar = page.getByRole('button', { name: 'Cerrar cohorte' })
    if (await cerrar.count()) await cerrar.click()
    await expect(page.getByText('Cerrada')).toBeVisible({ timeout: 10_000 })
    await rotulo(page, 'ACTO 5 · LICENCIA (PP-H)', 'Cierre de la cohorte', 'Terminado el curso, la cohorte se cierra y queda su consolidado.')
  } catch {
    await rotulo(page, 'ACTO 5 · LICENCIA (PP-H)', 'Cierre de la cohorte', 'Terminado el curso, la cohorte se cierra y queda su consolidado.')
  }

  // ── Cierre ──
  await placa(
    page,
    'SIGEDA: de la postulación a la licencia',
    'Ingreso · Instrucción en tierra · Vuelo y simulador · Mérito del PDI · Licencia PP-H',
    5,
  )
  await page.waitForTimeout(PAUSA)
})
