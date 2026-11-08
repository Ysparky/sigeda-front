/** El mundo visual público (landing, postulación y su consulta): paleta Pilotin del Figma con el contenido de ASA. */

export const NAVY = '#101A3C'
export const BLUE = '#2540A1'
export const GOLD = '#D8B858'
export const BODY = '#5B6072'
export const MUTED = '#A6ACBE'
export const SURFACE = '#F8F8F8'
export const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8B858] focus-visible:ring-offset-2'
export const BTN_ORO = `font-display inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition hover:brightness-95 ${FOCO}`
export const BTN_LINEA = `font-display inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3.5 text-sm font-bold uppercase tracking-wider transition hover:bg-white/10 ${FOCO}`
export const FOTO_COCKPIT = '/asa/cockpit.webp'
export const FOTO_PILOTOS = '/asa/pilotos.webp'
export const FOTO_INSTRUMENTOS = '/asa/instrumentos.webp'
export const PASOS = [
  {
    titulo: 'Postula en línea',
    texto: 'Llena tus datos, sube tus documentos y la declaración jurada firmada. Recibes un código de postulación.',
  },
  {
    titulo: 'Revisión documental',
    texto: 'El coordinador académico revisa tus documentos. Con tu código consultas el avance y subsanas lo observado.',
  },
  {
    titulo: 'Evaluación de admisión',
    texto: 'Te citamos a una evaluación presencial: examen de conocimientos, entrevista y evaluación psicológica.',
  },
  {
    titulo: 'Resultado y matrícula',
    texto: 'Si eres admitido, pagas tu matrícula y quedas asignado a tu grupo e instructor.',
  },
  { titulo: 'Activa tu cuenta', texto: 'Con tu código creas tu contraseña y entras a SIGEDA para seguir tu formación.' },
]
