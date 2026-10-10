import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, PlaneTakeoff } from 'lucide-react'
import { useState } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { CalendarioMensual } from '@/components/calendario-mensual'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasCatalogos, PROGRAMAS } from '@/features/catalogos/api'
import { usePuede } from '@/lib/auth/use-sesion'
import { hoyIso, primerDiaDelMes } from '@/lib/dominio/calendario'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnos } from './api'
import { COLUMNAS_TURNOS } from './columnas'
import type { BusquedaTurnos } from './schemas'

const ruta = getRouteApi('/_app/turnos/')

export function TurnosPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const puedeProgramar = usePuede('Manage Shifts')
  const subfases = useQuery(consultasCatalogos.subfases())
  const turnos = useQuery(consultasTurnos.lista(busqueda))
  const errorDeTurnos = errorDePrimeraCarga(turnos)

  const navegarA = useNavigate()
  const [vista, setVista] = useState<'tabla' | 'calendario'>('tabla')
  const [mes, setMes] = useState(() => primerDiaDelMes(hoyIso()))
  // En calendario se trae el mes de una (size 100 cubre el programa); el componente
  // muestra los del mes visible. Respeta los mismos filtros que la tabla.
  const turnosDelMes = useQuery({
    ...consultasTurnos.lista({ ...busqueda, page: 0, size: 100 }),
    enabled: vista === 'calendario',
  })
  const errorDelMes = errorDePrimeraCarga(turnosDelMes)
  const eventosDelMes = (turnosDelMes.data?.items ?? []).map((turno) => ({
    id: String(turno.id),
    fecha: turno.fechaEval,
    titulo: turno.nombre,
    subtitulo: turno.subfase,
  }))

  function cambiar(cambios: Partial<BusquedaTurnos>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const hayFiltros = busqueda.idSubfase !== undefined || busqueda.desde !== undefined || busqueda.hasta !== undefined

  return (
    <>
      <PageHeader
        titulo="Programación de turnos"
        descripcion="Turnos de vuelo por sub fase, programa y fecha de evaluación."
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link to="/turnos/dia">
                <PlaneTakeoff aria-hidden />
                Orden de vuelo del día
              </Link>
            </Button>
            {puedeProgramar && (
              <Button asChild>
                <Link to="/turnos/nuevo">
                  <CalendarPlus aria-hidden />
                  Registrar turno
                </Link>
              </Button>
            )}
          </>
        }
      />
      <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <Field>
          <FieldLabel htmlFor="filtro-programa">Programa</FieldLabel>
          <NativeSelect
            id="filtro-programa"
            className="w-full"
            value={busqueda.programa}
            onChange={(evento) => cambiar({ programa: evento.target.value === 'PDE' ? 'PDE' : 'PDI' })}
          >
            {PROGRAMAS.map((programa) => (
              <NativeSelectOption key={programa} value={programa}>
                {programa}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-subfase">Sub fase</FieldLabel>
          <NativeSelect
            id="filtro-subfase"
            className="w-full"
            value={busqueda.idSubfase ?? ''}
            onChange={(evento) =>
              cambiar({ idSubfase: evento.target.value === '' ? undefined : Number(evento.target.value) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {(subfases.data ?? []).map((subfase) => (
              <NativeSelectOption key={subfase.id} value={subfase.id}>
                {subfase.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(subfases) !== null && <FieldError>No se pudieron cargar las sub fases.</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-desde">Desde</FieldLabel>
          <Input
            id="filtro-desde"
            type="date"
            value={busqueda.desde ?? ''}
            onChange={(evento) => cambiar({ desde: evento.target.value || undefined })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-hasta">Hasta</FieldLabel>
          <Input
            id="filtro-hasta"
            type="date"
            value={busqueda.hasta ?? ''}
            onChange={(evento) => cambiar({ hasta: evento.target.value || undefined })}
          />
        </Field>
        <Button
          variant="ghost"
          disabled={!hayFiltros}
          onClick={() => cambiar({ idSubfase: undefined, desde: undefined, hasta: undefined })}
        >
          Limpiar filtros
        </Button>
      </section>
      {(busqueda.desde === undefined) !== (busqueda.hasta === undefined) && (
        <p className="text-sm text-muted-foreground">Indique ambas fechas para filtrar por rango.</p>
      )}
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
            etiqueta="Turnos programados"
            eventos={eventosDelMes}
            onEvento={(evento) => void navegarA({ to: '/turnos/$id', params: { id: evento.id } })}
          />
        )
      ) : errorDeTurnos !== null ? (
        <AvisoDeError error={errorDeTurnos} alReintentar={() => void turnos.refetch()} />
      ) : (
        <DataTable
          etiqueta="Turnos programados"
          columnas={COLUMNAS_TURNOS}
          pagina={turnos.data}
          cargando={turnos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(turno) => String(turno.id)}
          vacio={
            <EmptyState
              titulo="No hay turnos programados"
              descripcion={hayFiltros ? 'Ningún turno coincide con los filtros.' : 'Todavía no se programó ningún turno.'}
              accion={
                puedeProgramar ? (
                  <Button asChild size="sm">
                    <Link to="/turnos/nuevo">Registrar turno</Link>
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}
    </>
  )
}
