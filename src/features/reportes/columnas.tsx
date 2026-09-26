import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { etiquetaDeGrupoConNombre, TEXTO_SIN_DATOS_SUFICIENTES, textoSinNfpi } from '@/lib/dominio/seguimiento'
import { formatearNota } from '@/lib/formato'
import type { FilaDeMerito } from './api'

const ayudante = ayudanteDeColumnas<FilaDeMerito>()

function nota(contexto: { getValue: () => number | null }) {
  const valor = contexto.getValue()
  return <span className="tabular-nums">{valor === null ? TEXTO_SIN_DATOS_SUFICIENTES : formatearNota(valor)}</span>
}

export const COLUMNAS_MERITO = ayudante.columns([
  ayudante.accessor('puesto', {
    header: 'Puesto',
    cell: (contexto) => {
      const fila = contexto.row.original
      if (fila.puesto !== null) return <span className="tabular-nums">{fila.puesto}</span>
      const aviso = textoSinNfpi(fila.motivoSinNfpi ?? '')
      return (
        <span className="whitespace-nowrap text-xs text-muted-foreground" title={aviso}>
          Sin puesto
          <span className="sr-only"> {aviso}</span>
        </span>
      )
    },
  }),
  ayudante.accessor('codigo', {
    header: 'Código',
    enableSorting: true,
    cell: (contexto) => <span className="tabular-nums">{contexto.getValue()}</span>,
  }),
  ayudante.accessor('alumno', {
    header: 'Alumno',
    enableSorting: true,
    cell: (contexto) => (
      <span className="block max-w-[18rem] truncate" title={contexto.getValue()}>
        {contexto.getValue()}
      </span>
    ),
  }),
  ayudante.accessor('grupo', {
    header: 'Grupo',
    cell: (contexto) => {
      const etiqueta = etiquetaDeGrupoConNombre(contexto.row.original.idGrupo, contexto.getValue())
      return (
        <span className="block max-w-[12rem] truncate" title={etiqueta}>
          {etiqueta}
        </span>
      )
    },
  }),
  ayudante.accessor('nfpi', { header: 'NFPI', enableSorting: true, cell: nota }),
  ayudante.accessor('nit', { header: 'NIT', enableSorting: true, cell: nota }),
  ayudante.accessor('nia', { header: 'NIA', enableSorting: true, cell: nota }),
])
