import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { formatearFecha } from '@/lib/formato'
import type { TurnoResumen } from './api'

const ayudante = ayudanteDeColumnas<TurnoResumen>()

const nombre = ayudante.accessor('nombre', {
  header: 'Nombre',
  enableSorting: true,
  cell: (contexto) => (
    <Enlace to="/turnos/$id" params={{ id: String(contexto.row.original.id) }}>
      {contexto.getValue()}
    </Enlace>
  ),
})

const fecha = ayudante.accessor('fechaEval', {
  header: 'Fecha de evaluación',
  enableSorting: true,
  cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
})

const alumnos = ayudante.accessor('cantAlumno', {
  header: 'Alumnos',
  cell: (contexto) => <span className="tabular-nums">{contexto.getValue()}</span>,
})

const maniobras = ayudante.accessor('cantManiobra', {
  header: 'Maniobras',
  cell: (contexto) => <span className="tabular-nums">{contexto.getValue()}</span>,
})

export const COLUMNAS_TURNOS = ayudante.columns([
  nombre,
  ayudante.accessor('subfase', { header: 'Sub fase' }),
  ayudante.accessor('programa', { header: 'Programa' }),
  fecha,
  alumnos,
  maniobras,
])

export const COLUMNAS_MIS_TURNOS = ayudante.columns([
  nombre,
  ayudante.accessor('subfase', { header: 'Sub fase' }),
  fecha,
  maniobras,
])
