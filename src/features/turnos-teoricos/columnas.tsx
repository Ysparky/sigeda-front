import { Pencil } from 'lucide-react'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { accionDisponible } from '@/lib/dependencias'
import { etiquetaDeTipoExamen, TEXTO_VENTANA_COMENZADA } from '@/lib/dominio/teoria'
import { formatearFecha } from '@/lib/formato'
import type { TurnoTeoricoFila } from './api'
import { EliminarTurnoTeorico } from './components/eliminar-turno-teorico'

const ayudante = ayudanteDeColumnas<TurnoTeoricoFila>()

const COLUMNAS_SIN_ACCIONES = ayudante.columns([
  ayudante.accessor('nombre', {
    header: 'Nombre',
    enableSorting: true,
    cell: (contexto) => (
      <Enlace
        to="/teoria/turnos/$id"
        params={{ id: String(contexto.row.original.id) }}
        className="block max-w-48 truncate"
        title={contexto.getValue()}
      >
        {contexto.getValue()}
      </Enlace>
    ),
  }),
  ayudante.accessor('materia', {
    header: 'Materia',
    enableSorting: true,
    cell: (contexto) => (
      <span className="block max-w-36 truncate" title={contexto.getValue()}>
        {contexto.getValue()}
      </span>
    ),
  }),
  ayudante.accessor('tipoExamen', { header: 'Tipo de examen', cell: (contexto) => etiquetaDeTipoExamen(contexto.getValue()) }),
  ayudante.accessor('grupo', { header: 'Grupo', enableSorting: true }),
  ayudante.accessor('fechaExamen', {
    header: 'Fecha',
    enableSorting: true,
    cell: (contexto) => <span className="tabular-nums">{formatearFecha(contexto.getValue())}</span>,
  }),
  ayudante.display({
    id: 'horario',
    header: 'Horario',
    cell: (contexto) => (
      <span className="tabular-nums">
        {contexto.row.original.horaInicio}–{contexto.row.original.horaFin}
      </span>
    ),
  }),
  ayudante.accessor('estado', {
    header: 'Estado',
    cell: (contexto) => <StatusBadge vocabulario="turnoTeorico" valor={contexto.getValue()} />,
  }),
  ayudante.display({
    id: 'rindieron',
    header: 'Rindieron',
    cell: (contexto) => (
      <span className="tabular-nums">
        {contexto.row.original.rindieron} de {contexto.row.original.cantAlumnos}
      </span>
    ),
  }),
])

const acciones = ayudante.display({
  id: 'acciones',
  header: () => <span className="sr-only">Acciones</span>,
  cell: (contexto) => {
    const turno = contexto.row.original
    if (turno.estado !== 'PROGRAMADO') {
      return (
        <div className="flex justify-end">
          <span className="text-xs whitespace-nowrap text-muted-foreground" title={TEXTO_VENTANA_COMENZADA} aria-hidden>
            Ventana comenzada
          </span>
          <span className="sr-only">{TEXTO_VENTANA_COMENZADA}</span>
        </div>
      )
    }
    const deshabilitado = !accionDisponible('programarTurnoTeorico')
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {deshabilitado ? (
          <Button variant="outline" size="sm" disabled aria-label={`Modificar ${turno.nombre}`}>
            <Pencil aria-hidden />
            Modificar
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Enlace
              to="/teoria/turnos/$id/editar"
              params={{ id: String(turno.id) }}
              aria-label={`Modificar ${turno.nombre}`}
            >
              <Pencil aria-hidden />
              Modificar
            </Enlace>
          </Button>
        )}
        <EliminarTurnoTeorico id={turno.id} nombre={turno.nombre} deshabilitado={deshabilitado} />
      </div>
    )
  },
})

export const COLUMNAS_TURNOS_TEORICOS = ayudante.columns([...COLUMNAS_SIN_ACCIONES, acciones])
