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

// Controles y superficies propios de las páginas públicas: claras aunque la app esté en modo oscuro.
export const TINTA = NAVY
export const LINEA = '#D9DCE5'
export const ERROR = '#B42318'
export const EXITO = '#1E7A4C'
export const AVISO = '#8A5A00'
export const CONTROL = `h-11 w-full rounded-lg border bg-white px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-[#6B7185] focus-visible:border-[#2540A1] focus-visible:shadow-[0_0_0_3px_rgba(216,184,88,0.45)] aria-[invalid=true]:border-[#B42318]`
export const PANEL = 'rounded-2xl bg-white p-6 shadow-[0_10px_40px_rgba(16,26,60,0.07)] sm:p-8'
export const TITULO_PANEL = 'font-display text-xl font-bold uppercase tracking-wide'
