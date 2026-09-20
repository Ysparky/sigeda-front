import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import type { FaseFila } from './api'

const ayudante = ayudanteDeColumnas<FaseFila>()

export const COLUMNAS_FASES = ayudante.columns([
  ayudante.accessor('nombre', {
    header: 'Nombre',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/programa/fases/$id" params={{ id: String(contexto.row.original.id) }}>
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('descripcion', { header: 'Descripción', cell: (contexto) => contexto.getValue() || '—' }),
])
