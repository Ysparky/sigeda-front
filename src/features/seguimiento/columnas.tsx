import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { etiquetaDeGrupo } from '@/lib/dominio/seguimiento'
import type { AlumnoSeguimiento } from './api'

const ayudante = ayudanteDeColumnas<AlumnoSeguimiento>()

export const COLUMNAS_ESCUADRON = ayudante.columns([
  ayudante.accessor('codigo', {
    header: 'Código',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace to="/seguimiento/$alumno" params={{ alumno: contexto.getValue() }} className="tabular-nums">
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('nombreCompleto', {
    header: 'Alumno',
    enableSorting: true,
    cell: (contexto) => (
      <span className="block max-w-[18rem] truncate" title={contexto.getValue()}>
        {contexto.getValue()}
      </span>
    ),
  }),
  ayudante.accessor('idGrupo', {
    header: 'Grupo',
    enableSorting: true,
    cell: (contexto) => etiquetaDeGrupo(contexto.getValue()),
  }),
  ayudante.accessor('estado', {
    header: 'Estado',
    enableSorting: true,
    cell: (contexto) => <StatusBadge vocabulario="estado" valor={contexto.getValue()} />,
  }),
])
