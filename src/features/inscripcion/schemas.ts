import { z } from 'zod'
import { hoyIso } from '@/lib/dominio/calendario'

export const EDAD_MINIMA = 18
export const TIPOS_ARCHIVO = ['application/pdf', 'image/jpeg', 'image/png']
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png']
export const MAX_ARCHIVO = 5 * 1024 * 1024

export function esMayorDeEdad(fechaNacimiento: string, hoy = hoyIso()): boolean {
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number)
  const [anioHoy, mesHoy, diaHoy] = hoy.split('-').map(Number)
  const edad = anioHoy - anio - (mesHoy < mes || (mesHoy === mes && diaHoy < dia) ? 1 : 0)
  return edad >= EDAD_MINIMA
}

const PATRONES: Record<string, [RegExp, string]> = {
  DNI: [/^\d{8}$/, 'El DNI debe tener 8 dígitos.'],
  CE: [/^[A-Za-z0-9]{9,12}$/, 'El carné de extranjería debe tener de 9 a 12 caracteres alfanuméricos.'],
  PASAPORTE: [/^[A-Za-z0-9]{6,12}$/, 'El pasaporte debe tener de 6 a 12 caracteres alfanuméricos.'],
}

export const esquemaMatricula = z
  .object({
    tipoDocumento: z.enum(['DNI', 'CE', 'PASAPORTE']),
    numeroDocumento: z.string().min(1, 'El número de documento es obligatorio.'),
    nombres: z.string().min(1, 'El nombre es obligatorio').max(50, 'El nombre no puede superar los 50 caracteres.'),
    aPaterno: z
      .string()
      .min(1, 'El apellido paterno es obligatorio.')
      .max(50, 'El apellido paterno no puede superar los 50 caracteres.'),
    aMaterno: z.string().max(50, 'El apellido materno no puede superar los 50 caracteres.'),
    fechaNacimiento: z
      .string()
      .min(1, 'La fecha de nacimiento es obligatoria.')
      .refine((fecha) => esMayorDeEdad(fecha), 'Debe ser mayor de edad para postular.'),
    sexo: z.enum(['MASCULINO', 'FEMENINO'], { message: 'El sexo es obligatorio.' }),
    nacionalidad: z.string().min(1, 'La nacionalidad es obligatoria.').max(50),
    direccion: z.string().min(1, 'La dirección es obligatoria.').max(255),
    correo: z.string().min(1, 'El correo es obligatorio.').email('Ingresar correo válido.'),
    contacto: z.string().min(1, 'El teléfono es obligatorio.').max(30, 'El teléfono no puede superar los 30 caracteres.'),
    aceptaTratamientoDatos: z.literal(true, { message: 'Debe autorizar el tratamiento de sus datos personales.' }),
  })
  .superRefine((valores, contexto) => {
    const [patron, mensaje] = PATRONES[valores.tipoDocumento]
    if (valores.numeroDocumento !== '' && !patron.test(valores.numeroDocumento)) {
      contexto.addIssue({ code: 'custom', path: ['numeroDocumento'], message: mensaje })
    }
  })

export type ValoresMatricula = z.input<typeof esquemaMatricula>

export const matriculaVacia = {
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  nombres: '',
  aPaterno: '',
  aMaterno: '',
  fechaNacimiento: '',
  sexo: '' as unknown as 'MASCULINO',
  nacionalidad: 'Peruana',
  direccion: '',
  correo: '',
  contacto: '',
  aceptaTratamientoDatos: false as unknown as true,
} satisfies ValoresMatricula

export function errorDeArchivo(archivo: File | null, soloImagen: boolean): string | null {
  if (!archivo) return null
  if (archivo.size > MAX_ARCHIVO) return 'El archivo no puede superar los 5 MB.'
  if (soloImagen) return TIPOS_IMAGEN.includes(archivo.type) ? null : 'La fotografía debe ser JPG o PNG.'
  return TIPOS_ARCHIVO.includes(archivo.type) ? null : 'El archivo debe ser PDF, JPG o PNG.'
}

/** El cuerpo del modelo de declaración jurada: los cinco ítems de flujo postulacion.docx y los dos propios de un aeroclub. */
export const DECLARACION_JURADA = [
  'Los datos consignados y los documentos adjuntos son verdaderos y auténticos.',
  'No tengo impedimentos legales para participar en el proceso de admisión.',
  'Conozco y acepto el reglamento interno, las normas de conducta y los procedimientos de la institución.',
  'Autorizo el tratamiento de mis datos personales para fines del proceso de admisión y formación.',
  'Me comprometo a presentar la documentación original cuando la institución lo requiera.',
  'La información médica proporcionada es verdadera y me comprometo a informar cualquier condición que pueda afectar la seguridad operacional.',
  'Sé que la admisión al curso no garantiza la obtención de licencias aeronáuticas, sujetas a las regulaciones vigentes y a la certificación médica.',
]

export const TEXTO_CONSENTIMIENTO =
  'Autorizo al Aeroclub Sudamericano de los Andes a tratar mis datos personales, incluidos los de salud y antecedentes, solo para el proceso de admisión y mi formación (Ley 29733).'

export type DatosDeclaracion = {
  nombres: string
  aPaterno: string
  aMaterno: string
  tipoDocumento: string
  numeroDocumento: string
  direccion: string
  convocatoria: string
  fecha: string
}

const NOMBRE_DOCUMENTO: Record<string, string> = {
  DNI: 'DNI',
  CE: 'carné de extranjería',
  PASAPORTE: 'pasaporte',
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}

/** El modelo imprimible, prellenado con los datos del postulante, para firmar a mano y subir escaneado. */
export function modeloDeclaracionJurada(d: DatosDeclaracion): string {
  const nombre = escapar([d.nombres, d.aPaterno, d.aMaterno].filter(Boolean).join(' '))
  const items = DECLARACION_JURADA.map((item) => `<li>${escapar(item)}</li>`).join('')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Declaración jurada - ${nombre}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;line-height:1.55;padding:0 24px}
h1{text-align:center;font-size:20px;letter-spacing:.08em;margin:0 0 4px}p.sub{text-align:center;margin:0 0 28px;font-size:13px}
ol{padding-left:22px}li{margin-bottom:8px}.firmas{display:flex;justify-content:space-between;margin-top:72px;gap:32px}
.firma{flex:1;border-top:1px solid #111;padding-top:6px;text-align:center;font-size:13px}.huella{width:110px;height:130px;border:1px solid #111;font-size:11px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
.nota{margin-top:36px;font-size:12px;color:#444}@media print{.nota{display:none}}</style></head><body>
<h1>DECLARACIÓN JURADA</h1><p class="sub">Aeroclub Sudamericano de los Andes · ${escapar(d.convocatoria)}</p>
<p>Yo, <strong>${nombre}</strong>, identificado(a) con ${escapar(NOMBRE_DOCUMENTO[d.tipoDocumento] ?? d.tipoDocumento)} N.º <strong>${escapar(d.numeroDocumento)}</strong>, con domicilio en ${escapar(d.direccion)}, en mi calidad de postulante, declaro bajo juramento que:</p>
<ol>${items}</ol>
<p>Formulo la presente declaración en honor a la verdad, sabiendo que la falsedad de lo declarado conlleva la anulación de mi postulación y las responsabilidades legales que correspondan.</p>
<p>Lima, ${escapar(d.fecha)}</p>
<div class="firmas"><div class="firma">Firma del postulante<br>${nombre}</div><div class="huella">Huella digital</div></div>
<p class="nota">Imprima o guarde como PDF, fírmelo a mano (o con firma digital) y súbalo como «Declaración jurada firmada».</p>
<script>window.addEventListener('load',function(){window.print()})</script></body></html>`
}
