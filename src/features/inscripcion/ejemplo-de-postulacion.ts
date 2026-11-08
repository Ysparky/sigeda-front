import type { TipoDocumentoPostulacion } from './api'
import type { ValoresMatricula } from './schemas'

/**
 * Un aspirante de ejemplo para las demostraciones (solo en desarrollo): datos válidos con un número de documento
 * nuevo en cada uso y los archivos que exige la postulación, para no tener que buscarlos en vivo.
 */
export function aspiranteDeEjemplo(): ValoresMatricula {
  const numero = `9${String(Date.now()).slice(-7)}`
  return {
    tipoDocumento: 'DNI',
    numeroDocumento: numero,
    nombres: 'Mateo',
    aPaterno: 'Quispe',
    aMaterno: 'Rojas',
    fechaNacimiento: '2001-03-15',
    sexo: 'MASCULINO',
    nacionalidad: 'Peruana',
    direccion: 'Av. Arequipa 1234, Lima',
    correo: `aspirante.${numero}@correo.com`,
    contacto: '999000222',
    aceptaTratamientoDatos: true,
  }
}

function pdf(titulo: string): string {
  const contenido = `BT /F1 18 Tf 72 720 Td (${titulo}) Tj ET`
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let salida = '%PDF-1.4\n'
  const posiciones: number[] = []
  objetos.forEach((objeto, i) => {
    posiciones.push(salida.length)
    salida += `${i + 1} 0 obj\n${objeto}\nendobj\n`
  })
  const xref = salida.length
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  salida += posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return salida
}

const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

export function archivosDeEjemplo(): Partial<Record<TipoDocumentoPostulacion, File>> {
  const archivoPdf = (nombre: string, titulo: string) => new File([pdf(titulo)], nombre, { type: 'application/pdf' })
  const png = new Uint8Array(Array.from(atob(PNG_1X1), (c) => c.charCodeAt(0)))
  return {
    DOCUMENTO_IDENTIDAD: archivoPdf('dni.pdf', 'Documento de identidad - ejemplo'),
    CERTIFICADO_SECUNDARIA: archivoPdf('secundaria.pdf', 'Certificado de estudios secundarios - ejemplo'),
    FOTOGRAFIA: new File([png], 'fotografia.png', { type: 'image/png' }),
    ANTECEDENTES_POLICIALES: archivoPdf('antecedentes.pdf', 'Certificado de antecedentes policiales - ejemplo'),
    DECLARACION_JURADA: archivoPdf('declaracion-jurada-firmada.pdf', 'Declaracion jurada firmada - ejemplo'),
    CONSTANCIA_INGLES: archivoPdf('constancia-ingles.pdf', 'Constancia de ingles - ejemplo'),
    CERTIFICADO_MEDICO: archivoPdf('certificado-medico.pdf', 'Certificado medico aeronautico clase 2 - ejemplo'),
  }
}
