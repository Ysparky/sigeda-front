import { expect, type Locator, type Page, test } from '@playwright/test'

import { CUENTAS, type Cuenta } from './ayudantes'

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
        'background:#101a3c;color:#fff;font-family:"Source Sans 3 Variable",system-ui,sans-serif;' +
        'border-top:3px solid #d8b858;box-shadow:0 -10px 30px rgba(16,26,60,.25);display:flex;align-items:baseline;gap:16px'
      el.innerHTML =
        `<span style="font-family:'Barlow Semi Condensed',sans-serif;font-size:12px;letter-spacing:.16em;color:#d8b858;font-weight:700;text-transform:uppercase;white-space:nowrap">${c}</span>` +
        `<span style="font-family:'Barlow Semi Condensed',sans-serif;font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap">${t}</span>` +
        `<span style="font-size:15px;color:#dde1ec">${d}</span>`
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
        'position:fixed;inset:0;z-index:100000;background:#101a3c;' +
        'color:#fff;font-family:"Source Sans 3 Variable",system-ui,sans-serif;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;gap:22px;text-align:center'
      el.innerHTML =
        `<img src="/asa-logo.png" alt="" style="height:64px;background:#fff;border-radius:14px;padding:8px">` +
        `<div style="font-family:'Barlow Semi Condensed',sans-serif;font-size:52px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;max-width:980px;line-height:1.05">${t}</div>` +
        `<div style="width:64px;height:3px;background:#d8b858"></div>` +
        `<div style="font-size:21px;color:#dde1ec;max-width:820px">${s}</div>`
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


/** Un cursor visible en el video (el navegador sin interfaz no dibuja el del sistema) que marca cada clic. */
async function cursorVisible(page: Page) {
  await page.addInitScript(() => {
    const montar = () => {
      if (document.getElementById('demo-cursor')) return
      const c = document.createElement('div')
      c.id = 'demo-cursor'
      c.style.cssText =
        'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;z-index:2147483647;' +
        'pointer-events:none;background:rgba(216,184,88,.45);border:2px solid #101a3c;transition:transform .15s ease-out'
      document.body.appendChild(c)
      window.addEventListener('mousemove', (e) => {
        c.style.left = `${e.clientX}px`
        c.style.top = `${e.clientY}px`
      })
      window.addEventListener('mousedown', () => (c.style.transform = 'scale(.6)'))
      window.addEventListener('mouseup', () => (c.style.transform = 'scale(1)'))
    }
    if (document.body) montar()
    else document.addEventListener('DOMContentLoaded', montar)
  })
}

/** Lleva el cursor al elemento a velocidad humana, hace una pausa y recién entonces hace clic. */
async function clic(page: Page, objetivo: Locator) {
  await objetivo.scrollIntoViewIfNeeded().catch(() => {})
  const caja = await objetivo.boundingBox().catch(() => null)
  if (caja) await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2, { steps: 24 })
  await page.waitForTimeout(500)
  await objetivo.click()
  await page.waitForTimeout(800)
}

/** Escribe letra por letra, como una persona (las fechas se completan de una vez). */
async function escribir(page: Page, objetivo: Locator, texto: string) {
  await clic(page, objetivo)
  if ((await objetivo.getAttribute('type')) === 'date') await objetivo.fill(texto)
  else {
    await objetivo.fill('')
    await objetivo.pressSequentially(texto, { delay: 60 })
  }
  await page.waitForTimeout(400)
}

async function elegir(page: Page, objetivo: Locator, opcion: string | { label: string }) {
  await objetivo.scrollIntoViewIfNeeded().catch(() => {})
  const caja = await objetivo.boundingBox().catch(() => null)
  if (caja) await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2, { steps: 24 })
  await page.waitForTimeout(500)
  await objetivo.selectOption(opcion)
  await page.waitForTimeout(800)
}

async function bajar(page: Page, px = 500) {
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, px / 5)
    await page.waitForTimeout(120)
  }
  await page.waitForTimeout(900)
}

/** La admisión del aspirante a ritmo de demostración, con el médico y el inglés aceptados con su vigencia. */
async function admitirDespacio(page: Page, numero: string) {
  const enDias = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10)
  await page.goto('/matriculas')
  await asentar(page)
  await clic(page, page.getByRole('link', { name: numero }))
  await asentar(page)
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Revisión documental', 'El Coordinador abre cada documento y valida la postulación.')
  await clic(page, page.getByRole('button', { name: 'Validar documentación' }))
  await expect(page).toHaveURL(/estado=PENDIENTE/, { timeout: 15_000 })

  await page.goto('/matriculas?estado=VALIDADA')
  await asentar(page)
  await clic(page, page.getByRole('link', { name: numero }))
  await asentar(page)
  await clic(page, page.getByRole('button', { name: 'Aceptar Certificado médico aeronáutico clase 2' }))
  await escribir(page, page.getByLabel('Vigente hasta'), enDias(300))
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'El médico, con su vigencia', 'La ficha de licencia la usará, y el instructor recibe una alerta si vence durante el curso.')
  await clic(page, page.getByRole('button', { name: 'Aceptar documento' }))
  await clic(page, page.getByRole('button', { name: 'Aceptar Constancia de inglés' }))
  await escribir(page, page.getByLabel('Nivel de inglés'), 'Operacional (4)')
  await escribir(page, page.getByLabel('Vigente hasta'), enDias(1000))
  await clic(page, page.getByRole('button', { name: 'Aceptar documento' }))

  await escribir(page, page.getByLabel('Fecha', { exact: true }), new Date().toISOString().slice(0, 10))
  await escribir(page, page.getByLabel('Hora'), '09:00')
  await escribir(page, page.getByLabel('Lugar'), 'Hangar 2')
  await clic(page, page.getByRole('button', { name: 'Citar' }))
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Citación y evaluación', 'Examen de conocimientos, entrevista y evaluación psicológica: el resultado se deriva, no se elige.')
  await escribir(page, page.getByLabel('Examen de conocimientos (0–20)'), '16')
  await clic(page, page.getByRole('button', { name: 'Registrar evaluación' }))
  await expect(page.getByRole('heading', { name: 'Pago de matrícula' })).toBeVisible({ timeout: 15_000 })
  await escribir(page, page.getByLabel('Monto (S/)'), '1500')
  await escribir(page, page.getByLabel('N.º de operación'), 'OP-001')
  await clic(page, page.getByRole('button', { name: 'Registrar pago' }))
  await expect(page.getByText(/Pago confirmado/)).toBeVisible({ timeout: 15_000 })
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Admitido y matriculado', 'Con el pago confirmado, el alumno puede pasar a su grupo.')
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
  await escribir(page, page.getByLabel('Usuario'), cuenta.usuario)
  await escribir(page, page.getByLabel('Contraseña'), cuenta.clave)
  await clic(page, page.getByRole('button', { name: 'Ingresar' }))
  await expect(page.getByRole('heading', { name: /^(Inicio|Mi curso|Mi cohorte)$/, level: 1 })).toBeVisible({ timeout: 15_000 })
  await rotulo(page, 'ACCESO', `Entra el ${rol}`, detalle)
}

let paginaActual: Page | null = null

async function intentar(nombre: string, paso: () => Promise<void>) {
  try {
    await paso()
  } catch (error) {
    console.warn(`[presentación] paso omitido (${nombre}):`, error instanceof Error ? error.message.split('\n')[0] : error)
    await paginaActual?.screenshot({ path: `test-results/omitido-${nombre}.png` }).catch(() => {})
  }
}

async function visitar(page: Page, ruta: string, capitulo: string, titulo: string, detalle: string) {
  await page.goto(ruta)
  await asentar(page)
  await rotulo(page, capitulo, titulo, detalle)
}

test('Presentación: el ciclo de un curso en SIGEDA', async ({ page }) => {
  test.setTimeout(1_200_000)
  paginaActual = page
  await cursorVisible(page)

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

  await page.goto('/')
  await asentar(page)
  await page.evaluate(() => document.getElementById('cursos')?.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(900)
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'La admisión está abierta', 'El curso solo admite postulantes cuando tiene una convocatoria abierta: aquí, Admisión 2026-I.')
  await clic(page, page.getByRole('link', { name: 'Postular' }).first())

  // Al postular por esa convocatoria, el formulario abre con su nombre: no es un alta genérica.
  await asentar(page)
  await expect(page.getByRole('heading', { level: 1, name: /Admisión 2026-I/ })).toBeVisible({ timeout: 15_000 })
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Postula a la convocatoria', 'El aspirante se matricula a “Admisión 2026-I”, la convocatoria que enruta a la cohorte.')
  await clic(page, page.getByRole('button', { name: 'Llenar con un aspirante de ejemplo' }))
  const dni = await page.getByLabel('Número de documento').inputValue()
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Datos y documentos', 'Datos personales, la declaración jurada firmada y los documentos; el médico y el inglés con su vigencia.')
  await bajar(page, 700)
  await bajar(page, 700)
  await clic(page, page.getByRole('button', { name: 'Enviar postulación' }))
  await expect(page.getByText('Postulación enviada')).toBeVisible({ timeout: 15_000 })
  const codigo = ((await page.getByLabel('Código de postulación').textContent()) ?? '').trim()
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Postulación enviada', `Sin crear cuenta: con su documento y el código ${codigo} sigue el avance.`)

  // El Coordinador gestiona la admisión. Primero la convocatoria: el proceso que la gobierna.
  await entrar(page, CUENTAS.coordinador, 'Coordinador Académico', 'Gestiona la admisión y la cohorte.')
  await page.goto('/convocatorias')
  await asentar(page)
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'La convocatoria de admisión', '“Admisión 2026-I” fija vacantes y fechas, y enruta a los admitidos a la Promoción 2026-I.')
  await page.goto('/matriculas')
  await asentar(page)
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Bandeja de matrículas', 'Llegan las postulaciones de esa convocatoria; el Coordinador las revisa una por una.')
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Admisión', 'Documentos, citación, evaluación (examen, entrevista y psicológica) y pago de matrícula.')
  await admitirDespacio(page, dni)

  await page.goto('/grupos/7/editar')
  await asentar(page)
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Formación del grupo', 'El Coordinador asigna al alumno y a su instructor responsable (hasta 20 por grupo).')
  await clic(page, page.getByRole('checkbox', { name: /Mateo Quispe/ }))
  await elegir(page, page.getByLabel('Instructor responsable'), { label: 'Juan Torres Perez' })
  await clic(page, page.getByRole('button', { name: 'Guardar grupo' }))
  await expect(page.getByRole('table', { name: 'Alumnos del grupo' })).toContainText('Mateo Quispe', { timeout: 15_000 })
  await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'Ya es alumno de la cohorte', 'Mateo Quispe figura en la Promoción 2026-I: el curso empieza.')

  // El curso empieza: con instructor, alumnos y pagos confirmados, la cohorte inicia y fija sus fechas.
  await intentar('iniciar-cohorte', async () => {
    await page.goto('/grupos/7')
    await asentar(page)
    await clic(page, page.getByRole('button', { name: 'Iniciar cohorte' }))
    await expect(page.getByText('En progreso').first()).toBeVisible({ timeout: 15_000 })
    await rotulo(page, 'ACTO 1 · INICIO DEL CURSO', 'La cohorte inicia', 'Exige instructor, alumnos y pagos; fija el inicio y el fin previsto a 81 días hábiles.')
  })

  // ════════ ACTO 2 · DESARROLLO: EL AULA VIRTUAL ════════
  await placa(page, 'Desarrollo del curso', 'El aula virtual ordenada por el programa PDI EA-510', 3)
  await entrar(page, CUENTAS.alumno, 'Alumno', 'Oscar Lopez, cadete de la cohorte Grupo 1.')
  await rotulo(page, 'ACTO 2 · AULA VIRTUAL', 'Mi curso', 'Su próximo vuelo como pase de embarque y el programa completo: tierra y 5 fases con 12 sub fases.')
  await bajar(page, 520)
  await page.waitForTimeout(1200)
  await rotulo(page, 'ACTO 2 · AULA VIRTUAL', 'El mapa del programa', 'La sub fase en curso en dorado; cada punto es una misión de la Tabla 4.')

  await entrar(page, CUENTAS.instructor, 'Instructor', 'Juan Torres, instructor responsable de la cohorte.')
  await rotulo(page, 'ACTO 2 · AULA VIRTUAL', 'Mi cohorte', 'Los turnos de hoy, alumnos por sub fase, vuelos por evaluar y alertas.')

  // ════════ ACTO 3 · INSTRUCCIÓN EN TIERRA Y EN EL AIRE ════════
  await visitar(page, '/teoria/turnos', 'ACTO 3 · TIERRA', 'Turnos teóricos', 'Clases y exámenes por asignatura; la primera parte se aprueba antes de volar solo.')
  await visitar(page, '/banco', 'ACTO 3 · TIERRA', 'Banco de preguntas', 'Reactivos por materia para los exámenes en línea, con calificación automática.')
  await intentar('evaluacion', async () => {
    await page.goto('/turnos/20/evaluar/111111')
    await asentar(page)
    await rotulo(page, 'ACTO 3 · VUELO', 'Evaluación DIRBE', 'Nombre y categoría propuestos, y cada maniobra ya en su estándar: el instructor marca solo las excepciones.')
    await bajar(page, 500)
    const primera = page.getByRole('radiogroup').first()
    const excelente = primera.getByRole('radio', { name: /^E \(/ })
    if (await excelente.isEnabled()) await clic(page, excelente)
    await rotulo(page, 'ACTO 3 · VUELO', 'Calificación por excepción', 'Una maniobra sobre el estándar; el resto queda en Bueno, como lo exige la misión.')
    await clic(page, page.getByRole('button', { name: 'Guardar evaluación' }))
    await page.waitForTimeout(2500)
    await rotulo(page, 'ACTO 3 · VUELO', 'Nota de misión', 'El servidor calcula la nota de misión y la clasifica (Bueno, Regular o Malo); tres MALOS disparan el chequeo.')
  })

  // ════════ ACTO 4 · SIMULADOR: EVALUACIÓN PRÁCTICA ════════
  await entrar(page, CUENTAS.operaciones, 'Jefe de Operaciones', 'Programa los vuelos y el simulador.')
  await visitar(page, '/turnos', 'ACTO 4 · OPERACIONES', 'Programación de turnos', 'Hasta 5 alumnos por turno; solo cohortes en curso; un turno se suspende o reprograma.')
  await intentar('simulador', async () => {
    await page.goto('/sesiones-simulador/nueva')
    await asentar(page)
    await rotulo(page, 'ACTO 4 · SIMULADOR', 'Planificar la sesión', 'Simulador FNPT II con un escenario de emergencia: falla de motor en crucero.')
    await elegir(page, page.getByLabel('Alumno'), '111111')
    await elegir(page, page.getByLabel('Instructor'), '444444')
    await clic(page, page.getByRole('button', { name: 'Planificar' }))
    await expect(page.getByText('Planificada', { exact: true })).toBeVisible({ timeout: 15_000 })
    await clic(page, page.getByRole('button', { name: 'Iniciar' }))
    await expect(page.getByRole('link', { name: 'Calificar' }).first()).toBeVisible({ timeout: 15_000 })
    await rotulo(page, 'ACTO 4 · SIMULADOR', 'En curso: el alumno vuela', 'La simulación corre en la cabina del FNPT II; SIGEDA recibe sus datos y la evalúa.')
    const cabina = page.getByRole('region', { name: 'Cabina FNPT II' })
    await clic(page, cabina.getByRole('button', { name: 'Conectar cabina (simulación)' }))
    await rotulo(page, 'ACTO 4 · SIMULADOR', 'Cabina conectada', 'Altitud, velocidad, RPM del rotor y eventos en vivo: falla de motor, autorrotación, MAYDAY, toma.')
    await expect(cabina.getByRole('list', { name: 'Propuesta del sistema' })).toBeVisible({ timeout: 60_000 })
    await cabina.getByRole('list', { name: 'Propuesta del sistema' }).scrollIntoViewIfNeeded()
    await rotulo(page, 'ACTO 4 · SIMULADOR', 'Propuesta del sistema', 'Reglas fijas sobre la telemetría: tiempo de reacción, RPM en rango, comunicación, listas y toma.')
    await clic(page, cabina.getByRole('link', { name: /Calificar con esta propuesta/ }))
    await asentar(page)
    await rotulo(page, 'ACTO 4 · SIMULADOR', 'El instructor confirma', 'Los grados llegan propuestos con su motivo; el instructor los confirma o ajusta.')
    await clic(page, page.getByRole('button', { name: 'Guardar calificación' }))
    await expect(page.getByRole('heading', { level: 2, name: 'Resultado de la sesión' })).toBeVisible({ timeout: 15_000 })
    await rotulo(page, 'ACTO 4 · SIMULADOR', 'Resultado de la sesión', 'Competente o no competente; aprobar el escenario habilita volar la sub fase que lo exige.')
  })

  // ════════ ACTO 5 · APRENDIZAJE ASISTIDO POR IA ════════
  await entrar(page, CUENTAS.alumno, 'Alumno', 'Estudia con el material del curso.')
  await visitar(page, '/aprendizaje', 'ACTO 5 · APRENDIZAJE', 'Documentos de estudio', 'El material del PDI que el alumno sube se procesa y se etiqueta automáticamente.')
  await intentar('cuestionario', async () => {
    await page.goto('/aprendizaje/cuestionario')
    await asentar(page)
    await clic(page, page.getByRole('checkbox', { name: 'pdi-calificacion-del-vuelo.txt' }))
    await escribir(page, page.getByLabel('Cantidad de preguntas'), '3')
    await clic(page, page.getByRole('button', { name: 'Generar cuestionario' }))
    await rotulo(page, 'ACTO 5 · APRENDIZAJE', 'Cuestionario de práctica', 'La IA genera preguntas solo a partir del material elegido.')
    await expect(page.getByRole('heading', { name: /Pregunta 1/i })).toBeVisible({ timeout: 120_000 })
    await page.waitForTimeout(1500)
    await rotulo(page, 'ACTO 5 · APRENDIZAJE', 'Preguntas generadas', 'Opción múltiple y verdadero o falso, con su corrección al entregar.')
  })
  await intentar('consultas', async () => {
    await page.goto('/aprendizaje/consultas')
    await asentar(page)
    await clic(page, page.getByRole('checkbox', { name: 'pdi-calificacion-del-vuelo.txt' }))
    await escribir(page, page.getByLabel('Pregunta'), '¿Cuándo un vuelo se califica como VUELO MALO?')
    await clic(page, page.getByRole('button', { name: 'Enviar' }))
    await rotulo(page, 'ACTO 5 · APRENDIZAJE', 'Consultas', 'El asistente responde citando el material del curso, no de memoria.')
    await expect(page.getByText(/Insuficiente/).first()).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(1500)
    await rotulo(page, 'ACTO 5 · APRENDIZAJE', 'Respuesta con fuentes', 'Útil para repasar el PDI antes del vuelo o del examen.')
  })

  // ════════ ACTO 6 · SEGUIMIENTO Y PROYECCIÓN ════════
  await entrar(page, CUENTAS.comandante, 'Comandante de Escuadrón', 'Supervisa el rendimiento de toda la escuela.')
  await intentar('proyeccion', async () => {
    await page.goto('/seguimiento/proyeccion')
    await asentar(page)
    await rotulo(page, 'ACTO 6 · PROYECCIÓN', 'Proyección de desempeño', 'Riesgo y tendencia de cada alumno a partir de sus evaluaciones de vuelo.')
    await clic(page, page.getByRole('link', { name: /Ana Torres/ }).first())
    await asentar(page)
    await rotulo(page, 'ACTO 6 · PROYECCIÓN', 'Riesgo alto, tendencia a la baja', 'Proyección, desglose por maniobra y recomendaciones antes de que llegue el chequeo.')
    await bajar(page, 600)
    await page.waitForTimeout(1500)
  })
  await visitar(page, '/seguimiento/666666', 'ACTO 6 · SEGUIMIENTO', 'Legajo del alumno', 'La cadena del PDI: nota → NSF ponderado → NIT → NIA → NFPI, con sus causales.')
  await visitar(page, '/seguimiento/alertas', 'ACTO 6 · SEGUIMIENTO', 'Alertas', 'Subsanaciones, chequeos y bajo rendimiento se señalan solos.')
  await visitar(page, '/reportes', 'ACTO 6 · SEGUIMIENTO', 'Orden de mérito', 'El servidor calcula el NFPI de cada alumno y arma el ranking.')

  // ════════ ACTO 7 · FINALIZACIÓN: EGRESO, CONSTANCIA Y LICENCIA ════════
  await placa(page, 'Finalización del curso', 'Egreso, cierre de la cohorte, constancia y licencia PP-H', 3)
  await entrar(page, CUENTAS.coordinador, 'Coordinador Académico', 'Cierra la cohorte y lleva la licencia.')
  await intentar('tablero', async () => {
    await page.goto('/grupos/1')
    await asentar(page)
    await page.getByRole('region', { name: 'Cierre de la cohorte' }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await rotulo(page, 'ACTO 7 · FINALIZACIÓN', 'Tablero de cierre', 'La cohorte no cierra mientras un alumno no egrese o tenga baja: el sistema dice quién falta.')
  })
  await intentar('acta', async () => {
    await page.goto('/grupos/8')
    await asentar(page)
    await page.getByRole('table', { name: 'Acta de cierre' }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await rotulo(page, 'ACTO 7 · FINALIZACIÓN', 'Acta de cierre', 'Al cerrar se congelan NFPI, puesto, horas y el número de constancia de cada egresado.')
    await clic(page, page.getByRole('link', { name: 'Ficha de licencia de Rosa Quispe' }))
    await asentar(page)
    await rotulo(page, 'ACTO 7 · LICENCIA PP-H', 'Ficha de licencia', 'Al egresar ya trae casi todo del curso y la admisión: solo falta el examen teórico ante la DGAC.')
  })
  await entrar(page, CUENTAS.egresada, 'Alumna egresada', 'Rosa Quispe, de la Promoción 2026-II.')
  await rotulo(page, 'ACTO 7 · FINALIZACIÓN', 'Egresaste', 'Su pase de egreso con la constancia, el NFPI y el orden de mérito; para la licencia solo le falta el examen DGAC.')
  await intentar('constancia', async () => {
    await clic(page, page.getByRole('link', { name: 'Ver constancia' }))
    await asentar(page)
    await rotulo(page, 'ACTO 7 · FINALIZACIÓN', 'Constancia de egreso', 'Acredita el curso del CIAC que exige la RAP 61 para el examen teórico ante la DGAC.')
  })

  // ── Cierre ──
  await placa(
    page,
    'SIGEDA: del ingreso a la constancia',
    'Admisión · Aula virtual · Tierra y vuelo · Simulador · Aprendizaje con IA · Proyección · Egreso y licencia PP-H',
    5,
  )
  await page.waitForTimeout(PAUSA)
})
