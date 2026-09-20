import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import type { GrupoFila } from './api'

const ayudante = ayudanteDeColumnas<GrupoFila>()

export const COLUMNAS_GRUPOS = ayudante.columns([
  ayudante.accessor('nombre', {
    header: 'Nombre',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/grupos/$id" params={{ id: String(contexto.row.original.id) }}>
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('descripcion', { header: 'Descripción', cell: (contexto) => contexto.getValue() || '—' }),
  ayudante.accessor('programa', { header: 'Programa', enableSorting: true }),
])
