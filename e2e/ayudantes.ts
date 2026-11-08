import { expect, type Page } from '@playwright/test'

export type Cuenta = { usuario: string; clave: string }

/** Las cinco cuentas de data_prod.sql. La contraseña sembrada es 123 para todas. */
export const CUENTAS = {
  admin: { usuario: 'admin.sistema', clave: '123' },
  comandante: { usuario: 'comandante.aguirre', clave: '123' },
  operaciones: { usuario: 'jefe.operaciones', clave: '123' },
  instructor: { usuario: 'instructor.perez', clave: '123' },
  alumno: { usuario: 'alumno.lopez', clave: '123' },
  coordinador: { usuario: 'coordinador.rivas', clave: '123' },
} satisfies Record<string, Cuenta>

export async function entrarComo(page: Page, cuenta: Cuenta) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(cuenta.usuario)
  await page.getByLabel('Contraseña').fill(cuenta.clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: /^(Inicio|Mi curso|Mi cohorte)$/, level: 1 })).toBeVisible({ timeout: 15_000 })
}

export type Postulante = { numero: string; nombres: string; aPaterno: string; aMaterno: string; correo: string }

const pdf = (nombre: string) => ({ name: nombre, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 e2e') })
const png = (nombre: string) => ({ name: nombre, mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) })

/** Llena y envía la postulación pública (con el médico incluido) y devuelve el código de postulación. */
export async function postular(page: Page, p: Postulante, idConvocatoria = 1): Promise<string> {
  await page.goto(`/matricula?convocatoria=${idConvocatoria}`)
  await page.getByLabel('Número de documento').fill(p.numero)
  await page.getByLabel('Nombres').fill(p.nombres)
  await page.getByLabel('Apellido paterno').fill(p.aPaterno)
  await page.getByLabel('Apellido materno').fill(p.aMaterno)
  await page.getByLabel('Fecha de nacimiento').fill('2001-03-15')
  await page.getByLabel('Sexo').selectOption('MASCULINO')
  await page.getByLabel('Dirección').fill('Av. Arequipa 1234, Lima')
  await page.getByLabel('Correo').fill(p.correo)
  await page.getByLabel('Teléfono de contacto').fill('999000222')
  await page.getByLabel('Documento de identidad').setInputFiles(pdf('dni.pdf'))
  await page.getByLabel('Certificado de estudios secundarios').setInputFiles(pdf('secundaria.pdf'))
  await page.getByLabel('Fotografía').setInputFiles(png('foto.png'))
  await page.getByLabel('Certificado de antecedentes policiales').setInputFiles(pdf('antecedentes.pdf'))
  await page.getByLabel('Declaración jurada firmada').setInputFiles(pdf('declaracion-firmada.pdf'))
  await page.getByLabel('Certificado médico aeronáutico clase 2').setInputFiles(pdf('medico.pdf'))
  await page.getByRole('checkbox', { name: /Autorizo al Aeroclub/ }).click()
  await page.getByRole('button', { name: 'Enviar postulación' }).click()
  await expect(page.getByText('Postulación enviada')).toBeVisible({ timeout: 15_000 })
  return ((await page.getByLabel('Código de postulación').textContent()) ?? '').trim()
}

/** Como Coordinador (ya con sesión): valida, acepta el médico, cita, evalúa (16, apto, apto) y registra el pago. */
export async function admitir(page: Page, numero: string, nombre: RegExp) {
  await page.goto('/matriculas')
  await page.getByRole('link', { name: numero }).click()
  await expect(page.getByRole('heading', { level: 1, name: nombre })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Validar documentación' }).click()
  await expect(page).toHaveURL(/estado=PENDIENTE/, { timeout: 15_000 })

  await page.goto('/matriculas?estado=VALIDADA')
  await page.getByRole('link', { name: numero }).click()
  await expect(page.getByRole('heading', { level: 1, name: nombre })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Aceptar Certificado médico aeronáutico clase 2' }).click()
  await page.getByLabel('Fecha', { exact: true }).fill(new Date().toISOString().slice(0, 10))
  await page.getByLabel('Hora').fill('09:00')
  await page.getByLabel('Lugar').fill('Hangar 2')
  await page.getByRole('button', { name: 'Citar' }).click()

  await page.getByLabel('Examen de conocimientos (0–20)').fill('16')
  await page.getByRole('button', { name: 'Registrar evaluación' }).click()
  await expect(page.getByRole('heading', { name: 'Pago de matrícula' })).toBeVisible({ timeout: 15_000 })
  await page.getByLabel('Monto (S/)').fill('1500')
  await page.getByLabel('N.º de operación').fill('OP-E2E')
  await page.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(page.getByText(/Pago confirmado/)).toBeVisible({ timeout: 15_000 })
}
