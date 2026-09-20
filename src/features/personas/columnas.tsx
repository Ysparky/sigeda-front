import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { etiquetaDeTipo } from '@/lib/dominio/personas'
import { apellidosYNombres, type PersonaFila } from './api'

const ayudante = ayudanteDeColumnas<PersonaFila>()

export const COLUMNAS_PERSONAS = ayudante.columns([
  ayudante.accessor('codigo', {
    header: 'Código',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/personas/$cod" params={{ cod: contexto.getValue() }} className="tabular-nums">
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('aPaterno', {
    header: 'Apellidos y nombres',
    enableSorting: true,
    cell: (contexto) => apellidosYNombres(contexto.row.original),
  }),
  ayudante.accessor('rango', { header: 'Rango', cell: (contexto) => contexto.getValue() ?? '—' }),
  ayudante.accessor('tipo', { header: 'Tipo', cell: (contexto) => etiquetaDeTipo(contexto.getValue()) }),
])
