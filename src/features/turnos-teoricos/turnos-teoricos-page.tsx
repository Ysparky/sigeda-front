import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CalendarPlus } from 'lucide-react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { AvisoDeTeoria } from '@/components/aviso-de-teoria'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { consultasMaterias } from '@/features/materias/api'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { usePuede, useSesion } from '@/lib/auth/use-sesion'
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { ESTADOS_TURNO, TEXTO_SIN_TURNOS_TEORICOS, TIPOS_EXAMEN } from '@/lib/dominio/teoria'
import { termino } from '@/lib/dominio/vocabulario'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasTurnosTeoricos } from './api'
import { COLUMNAS_TURNOS_TEORICOS } from './columnas'
import type { BusquedaTurnosTeoricos } from './schemas'

const ruta = getRouteApi('/_app/teoria/turnos/')

function AccionRegistrar() {
  if (!accionDisponible('programarTurnoTeorico')) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button disabled>
          <CalendarPlus aria-hidden />
          Registrar turno teórico
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }
  return (
    <Button asChild>
      <Link to="/teoria/turnos/nuevo">
        <CalendarPlus aria-hidden />
        Registrar turno teórico
      </Link>
    </Button>
  )
}

export function TurnosTeoricosPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const sesion = useSesion()
  const todosLosGrupos = usePuede('Manage Groups')
  const materias = useQuery(consultasMaterias.lista())
  const grupos = useQuery(
    consultasTurnosTeoricos.grupos(todosLosGrupos ? null : (sesion?.codPersona ?? null), 'PDI'),
  )
  const turnos = useQuery(consultasTurnosTeoricos.lista(busqueda))
  const error = errorDePrimeraCarga(turnos)

  function cambiar(cambios: Partial<BusquedaTurnosTeoricos>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const hayFiltros =
    busqueda.idGrupo !== undefined ||
    busqueda.idMateria !== undefined ||
    busqueda.estado !== undefined ||
    busqueda.tipoExamen !== undefined ||
    busqueda.fechaPre !== undefined ||
    busqueda.fechaPost !== undefined

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.turnosTeoricos.titulo}
        descripcion={PANTALLAS.turnosTeoricos.descripcion}
        acciones={<AccionRegistrar />}
      />
      <AvisoDeTeoria accion="programarTurnoTeorico" />
      <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:items-end">
        <Field>
          <FieldLabel htmlFor="filtro-grupo">Grupo</FieldLabel>
          <NativeSelect
            id="filtro-grupo"
            className="w-full"
            value={busqueda.idGrupo ?? ''}
            onChange={(evento) => cambiar({ idGrupo: evento.target.value === '' ? undefined : Number(evento.target.value) })}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {(grupos.data ?? []).map((grupo) => (
              <NativeSelectOption key={grupo.id} value={grupo.id}>
                {grupo.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(grupos) !== null && <FieldError>No se pudieron cargar los grupos.</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-materia">Materia</FieldLabel>
          <NativeSelect
            id="filtro-materia"
            className="w-full"
            value={busqueda.idMateria ?? ''}
            onChange={(evento) =>
              cambiar({ idMateria: evento.target.value === '' ? undefined : Number(evento.target.value) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {(materias.data ?? []).map((materia) => (
              <NativeSelectOption key={materia.id} value={materia.id}>
                {materia.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errorDePrimeraCarga(materias) !== null && <FieldError>No se pudieron cargar las materias.</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-estado">Estado</FieldLabel>
          <NativeSelect
            id="filtro-estado"
            className="w-full"
            value={busqueda.estado ?? ''}
            onChange={(evento) => cambiar({ estado: evento.target.value === '' ? undefined : (evento.target.value as never) })}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {ESTADOS_TURNO.map((estado) => (
              <NativeSelectOption key={estado} value={estado}>
                {termino('turnoTeorico', estado).etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-tipo-examen">Tipo de examen</FieldLabel>
          <NativeSelect
            id="filtro-tipo-examen"
            className="w-full"
            value={busqueda.tipoExamen ?? ''}
            onChange={(evento) =>
              cambiar({ tipoExamen: evento.target.value === '' ? undefined : (evento.target.value as never) })
            }
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {TIPOS_EXAMEN.map((tipo) => (
              <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-desde">Desde</FieldLabel>
          <Input
            id="filtro-desde"
            type="date"
            value={busqueda.fechaPre ?? ''}
            onChange={(evento) => cambiar({ fechaPre: evento.target.value || undefined })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-hasta">Hasta</FieldLabel>
          <Input
            id="filtro-hasta"
            type="date"
            value={busqueda.fechaPost ?? ''}
            onChange={(evento) => cambiar({ fechaPost: evento.target.value || undefined })}
          />
        </Field>
        <Button
          variant="ghost"
          disabled={!hayFiltros}
          onClick={() =>
            cambiar({
              idGrupo: undefined,
              idMateria: undefined,
              estado: undefined,
              tipoExamen: undefined,
              fechaPre: undefined,
              fechaPost: undefined,
            })
          }
        >
          Limpiar filtros
        </Button>
      </section>
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void turnos.refetch()} />
      ) : (
        <DataTable
          etiqueta="Turnos teóricos programados"
          columnas={COLUMNAS_TURNOS_TEORICOS}
          pagina={turnos.data}
          cargando={turnos.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(turno) => String(turno.id)}
          vacio={
            <EmptyState
              titulo="No hay turnos teóricos"
              descripcion={hayFiltros ? 'Ningún turno coincide con los filtros.' : TEXTO_SIN_TURNOS_TEORICOS}
              accion={<AccionRegistrar />}
            />
          }
        />
      )}
    </>
  )
}
