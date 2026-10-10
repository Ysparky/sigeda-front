import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { CalendarioMensual } from '@/components/calendario-mensual'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { useSesion } from '@/lib/auth/use-sesion'
import { hoyIso, primerDiaDelMes } from '@/lib/dominio/calendario'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnos } from './api'
import { COLUMNAS_MIS_TURNOS } from './columnas'

const ruta = getRouteApi('/_app/mis-turnos')

export function MisTurnosPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const codPersona = useSesion()?.codPersona ?? ''
  const navegarA = useNavigate()
  const turnos = useQuery({ ...consultasTurnos.delAlumno(codPersona, busqueda), enabled: codPersona !== '' })
  const errorDeTurnos = errorDePrimeraCarga(turnos)

  const [vista, setVista] = useState<'tabla' | 'calendario'>('tabla')
  const [mes, setMes] = useState(() => primerDiaDelMes(hoyIso()))
  const turnosDelMes = useQuery({
    ...consultasTurnos.delAlumno(codPersona, { ...busqueda, page: 0, size: 100 }),
    enabled: codPersona !== '' && vista === 'calendario',
  })
  const errorDelMes = errorDePrimeraCarga(turnosDelMes)
  const eventosDelMes = (turnosDelMes.data?.items ?? []).map((turno) => ({
    id: String(turno.id),
    fecha: turno.fechaEval,
    titulo: turno.nombre,
    subtitulo: turno.subfase,
  }))

  return (
    <>
      <PageHeader titulo="Mis turnos" descripcion="Sus turnos de vuelo programados." />
      {codPersona === '' ? (
        <EmptyState titulo="Su usuario no tiene una persona asociada" descripcion="Consulte con el administrador." />
      ) : (
        <>
          <div role="group" aria-label="Vista" className="flex gap-1">
            <Button size="sm" variant={vista === 'tabla' ? 'default' : 'outline'} onClick={() => setVista('tabla')}>
              Tabla
            </Button>
            <Button
              size="sm"
              variant={vista === 'calendario' ? 'default' : 'outline'}
              onClick={() => setVista('calendario')}
            >
              Calendario
            </Button>
          </div>
          {vista === 'calendario' ? (
            errorDelMes !== null ? (
              <AvisoDeError error={errorDelMes} alReintentar={() => void turnosDelMes.refetch()} />
            ) : (
              <CalendarioMensual
                mes={mes}
                onMes={setMes}
                etiqueta="Mis turnos"
                eventos={eventosDelMes}
                onEvento={(evento) => void navegarA({ to: '/turnos/$id', params: { id: evento.id } })}
              />
            )
          ) : errorDeTurnos !== null ? (
            <AvisoDeError error={errorDeTurnos} alReintentar={() => void turnos.refetch()} />
          ) : (
            <DataTable
              etiqueta="Mis turnos"
              columnas={COLUMNAS_MIS_TURNOS}
              pagina={turnos.data}
              cargando={turnos.isFetching}
              parametros={busqueda}
              alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
              idDeFila={(turno) => String(turno.id)}
              vacio={<EmptyState titulo="No tiene turnos programados" descripcion="Aquí aparecerán sus próximos vuelos." />}
            />
          )}
        </>
      )}
    </>
  )
}
