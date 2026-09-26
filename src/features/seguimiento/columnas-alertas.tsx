import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Enlace } from '@/components/enlace'
import { StatusBadge } from '@/components/status-badge'
import { etiquetaDeGrupoConNombre, etiquetaDeTipoAlerta } from '@/lib/dominio/seguimiento'
import { formatearFecha } from '@/lib/formato'
import type { Alerta } from './api'

const ayudante = ayudanteDeColumnas<Alerta>()

type Destino = { to: string; params?: Record<string, string>; search?: Record<string, string>; hash?: string }

export function destinoDeAlerta(alerta: Alerta): Destino {
  if (alerta.tipo === 'VUELO_DESAPROBADO' && alerta.codEvaluacion !== null) {
    return { to: '/evaluaciones/$cod', params: { cod: alerta.codEvaluacion } }
  }
  if (alerta.tipo === 'CAUSAL_TEORICO' || alerta.tipo === 'SUBSANACION_PENDIENTE') {
    return { to: '/seguimiento/$alumno', params: { alumno: alerta.codAlumno }, search: { tab: 'teorico' } }
  }
  if (alerta.tipo === 'CHEQUEO_PENDIENTE') {
    return { to: '/seguimiento/$alumno', params: { alumno: alerta.codAlumno }, search: { tab: 'practico' }, hash: 'chequeo' }
  }
  return { to: '/seguimiento/$alumno', params: { alumno: alerta.codAlumno } }
}

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
      cell: (contexto) => {
        const etiqueta = etiquetaDeGrupoConNombre(contexto.row.original.idGrupo, contexto.getValue())
        return (
          <span className="block max-w-[12rem] truncate" title={etiqueta}>
            {etiqueta}
          </span>
        )
      },
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
    ayudante.display({
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: (contexto) => (
        <Enlace
          {...destinoDeAlerta(contexto.row.original)}
          aria-label={`Abrir ${etiquetaDeTipoAlerta(contexto.row.original.tipo)} de ${contexto.row.original.alumno}`}
        >
          Abrir
        </Enlace>
      ),
    }),
  ])
}
