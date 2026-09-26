import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { StatusBadge } from '@/components/status-badge'
import { formatearFecha } from '@/lib/formato'
import type { Alerta } from './api'

const ayudante = ayudanteDeColumnas<Alerta>()

export function columnasAlertas() {
  return ayudante.columns([
    ayudante.accessor('tipo', {
      header: 'Tipo',
      cell: (contexto) => <StatusBadge vocabulario="tipoAlerta" valor={contexto.getValue()} />,
    }),
    ayudante.accessor('alumno', {
      header: 'Alumno',
      cell: (contexto) => (
        <span className="block max-w-[18rem] truncate" title={contexto.getValue()}>
          {contexto.getValue()}
        </span>
      ),
    }),
    ayudante.accessor('grupo', {
      header: 'Grupo',
      cell: (contexto) => contexto.getValue(),
    }),
    ayudante.accessor('fecha', {
      header: 'Fecha',
      cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue() ?? '')}</span>,
    }),
    ayudante.accessor('detalle', {
      header: 'Detalle',
      cell: (contexto) => (
        <span className="block max-w-sm truncate" title={contexto.getValue()}>
          {contexto.getValue()}
        </span>
      ),
    }),
    ayudante.accessor('severidad', {
      header: 'Severidad',
      cell: (contexto) => <StatusBadge vocabulario="severidad" valor={contexto.getValue()} />,
    }),
  ])
}
