import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { TEXTO_REQUIERE_ATENCION, etiquetaDeGrupo, requiereAtencion } from '@/lib/dominio/seguimiento'
import type { AlumnoSeguimiento } from './api'

const ayudante = ayudanteDeColumnas<AlumnoSeguimiento>()

type Opciones = {
  estadoTeorico: Map<string, boolean> | null
}

export function columnasEscuadron({ estadoTeorico }: Opciones) {
  const base = [
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
      cell: (contexto) => (
        <div className="flex items-center gap-2">
          <StatusBadge vocabulario="estado" valor={contexto.getValue()} />
          {requiereAtencion(contexto.getValue()) && (
            <span className="text-xs whitespace-nowrap text-tono-alerta-texto">{TEXTO_REQUIERE_ATENCION}</span>
          )}
        </div>
      ),
    }),
  ]
  if (estadoTeorico === null) return ayudante.columns(base)
  return ayudante.columns([
    ...base,
    ayudante.display({
      id: 'estadoTeorico',
      header: 'Estado teórico',
      cell: (contexto) =>
        estadoTeorico.get(contexto.row.original.codigo) === true ? (
          <StatusBadge vocabulario="subsanacion" valor="pendiente" />
        ) : (
          '—'
        ),
    }),
  ])
}
