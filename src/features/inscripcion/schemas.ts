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
    aceptaDeclaracion: z.literal(true, { message: 'Debe aceptar la declaración jurada.' }),
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
  aceptaDeclaracion: false as unknown as true,
} satisfies ValoresMatricula

export function errorDeArchivo(archivo: File | null, soloImagen: boolean): string | null {
  if (!archivo) return null
  if (archivo.size > MAX_ARCHIVO) return 'El archivo no puede superar los 5 MB.'
  if (soloImagen) return TIPOS_IMAGEN.includes(archivo.type) ? null : 'La fotografía debe ser JPG o PNG.'
  return TIPOS_ARCHIVO.includes(archivo.type) ? null : 'El archivo debe ser PDF, JPG o PNG.'
}

/** Los cinco ítems de la declaración jurada de flujo postulacion.docx, más los dos propios de un aeroclub. */
export const DECLARACION_JURADA = [
  'Los datos consignados y los documentos adjuntos son verdaderos y auténticos.',
  'No tengo impedimentos legales para participar en el proceso de admisión.',
  'Conozco y acepto el reglamento interno, las normas de conducta y los procedimientos de la institución.',
  'Autorizo el tratamiento de mis datos personales para fines del proceso de admisión y formación.',
  'Me comprometo a presentar la documentación original cuando la institución lo requiera.',
  'La información médica proporcionada es verdadera y me comprometo a informar cualquier condición que pueda afectar la seguridad operacional.',
  'Sé que la admisión al curso no garantiza la obtención de licencias aeronáuticas, sujetas a las regulaciones vigentes y a la certificación médica.',
]
