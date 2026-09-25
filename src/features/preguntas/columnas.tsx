import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { etiquetaDeDificultad, etiquetaDeOrigen, etiquetaDeTipoPregunta } from '@/lib/dominio/teoria'
import type { PreguntaFila } from './api'

const ayudante = ayudanteDeColumnas<PreguntaFila>()

export const COLUMNAS_PREGUNTAS = ayudante.columns([
  ayudante.accessor('materia', { header: 'Materia', enableSorting: true }),
  ayudante.accessor('enunciado', {
    header: 'Enunciado',
    enableSorting: true,
    cell: (contexto) => <span className="block max-w-xl">{contexto.getValue()}</span>,
  }),
  ayudante.accessor('tipoPregunta', {
    header: 'Tipo',
    cell: (contexto) => etiquetaDeTipoPregunta(contexto.getValue()),
  }),
  ayudante.accessor('dificultad', {
    header: 'Dificultad',
    enableSorting: true,
    cell: (contexto) => etiquetaDeDificultad(contexto.getValue()),
  }),
  ayudante.accessor('origen', { header: 'Origen', cell: (contexto) => etiquetaDeOrigen(contexto.getValue()) }),
  ayudante.accessor('enUso', { header: 'En uso', cell: (contexto) => (contexto.getValue() ? 'Sí' : 'No') }),
])
