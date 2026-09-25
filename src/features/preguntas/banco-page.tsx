import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus, Sparkles } from 'lucide-react'
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
import { accionDisponible, MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import { DIFICULTADES, ORIGENES_PREGUNTA, TEXTO_SIN_PREGUNTAS, TIPOS_PREGUNTA } from '@/lib/dominio/teoria'
import { errorDePrimeraCarga } from '@/lib/query'
import { consultasPreguntas } from './api'
import { COLUMNAS_PREGUNTAS, COLUMNAS_PREGUNTAS_CON_ACCIONES } from './columnas'
import { DialogoPregunta } from './components/dialogo-pregunta'
import type { BusquedaPreguntas } from './schemas'

const ruta = getRouteApi('/_app/banco/')

function AccionImportar() {
  if (!accionDisponible('importarPreguntas')) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button variant="outline" disabled>
          <Sparkles aria-hidden />
          Importar desde IA
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }
  return (
    <Button variant="outline" asChild>
      <Link to="/banco/importar">
        <Sparkles aria-hidden />
        Importar desde IA
      </Link>
    </Button>
  )
}

function AccionRegistrar() {
  if (!accionDisponible('gestionarPreguntas')) {
    return (
      <div className="grid justify-items-end gap-1">
        <Button disabled>
          <Plus aria-hidden />
          Registrar pregunta
        </Button>
        <p className="text-xs text-muted-foreground">{MENSAJE_DEPENDENCIA_PENDIENTE}</p>
      </div>
    )
  }
  return (
    <DialogoPregunta
      disparador={
        <Button>
          <Plus aria-hidden />
          Registrar pregunta
        </Button>
      }
    />
  )
}

export function BancoPage() {
  const busqueda = ruta.useSearch()
  const navegar = ruta.useNavigate()
  const materias = useQuery(consultasMaterias.lista())
  const preguntas = useQuery(consultasPreguntas.lista(busqueda))
  const error = errorDePrimeraCarga(preguntas)
  const puedeGestionar = accionDisponible('gestionarPreguntas')

  function cambiar(cambios: Partial<BusquedaPreguntas>) {
    void navegar({ search: (previa) => ({ ...previa, page: 0, ...cambios }) })
  }

  const hayFiltros =
    busqueda.idMateria !== undefined ||
    busqueda.dificultad !== undefined ||
    busqueda.tipo !== undefined ||
    busqueda.origen !== undefined ||
    busqueda.texto !== undefined

  return (
    <>
      <PageHeader
        titulo={PANTALLAS.banco.titulo}
        descripcion={PANTALLAS.banco.descripcion}
        acciones={
          <>
            <AccionImportar />
            <AccionRegistrar />
          </>
        }
      />
      <AvisoDeTeoria accion="gestionarPreguntas" />
      <section aria-label="Filtros" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
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
          <FieldLabel htmlFor="filtro-dificultad">Dificultad</FieldLabel>
          <NativeSelect
            id="filtro-dificultad"
            className="w-full"
            value={busqueda.dificultad ?? ''}
            onChange={(evento) =>
              cambiar({ dificultad: evento.target.value === '' ? undefined : (evento.target.value as never) })
            }
          >
            <NativeSelectOption value="">Todas</NativeSelectOption>
            {DIFICULTADES.map((dificultad) => (
              <NativeSelectOption key={dificultad.valor} value={dificultad.valor}>
                {dificultad.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-tipo">Tipo</FieldLabel>
          <NativeSelect
            id="filtro-tipo"
            className="w-full"
            value={busqueda.tipo ?? ''}
            onChange={(evento) => cambiar({ tipo: evento.target.value === '' ? undefined : (evento.target.value as never) })}
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {TIPOS_PREGUNTA.map((tipo) => (
              <NativeSelectOption key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-origen">Origen</FieldLabel>
          <NativeSelect
            id="filtro-origen"
            className="w-full"
            value={busqueda.origen ?? ''}
            onChange={(evento) =>
              cambiar({ origen: evento.target.value === '' ? undefined : (evento.target.value as never) })
            }
          >
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {ORIGENES_PREGUNTA.map((origen) => (
              <NativeSelectOption key={origen.valor} value={origen.valor}>
                {origen.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="filtro-texto">Enunciado</FieldLabel>
          <Input
            id="filtro-texto"
            value={busqueda.texto ?? ''}
            onChange={(evento) => cambiar({ texto: evento.target.value.trim() === '' ? undefined : evento.target.value })}
          />
        </Field>
        <Button
          variant="ghost"
          disabled={!hayFiltros}
          onClick={() =>
            cambiar({ idMateria: undefined, dificultad: undefined, tipo: undefined, origen: undefined, texto: undefined })
          }
        >
          Limpiar filtros
        </Button>
      </section>
      {error !== null ? (
        <AvisoDeError error={error} alReintentar={() => void preguntas.refetch()} />
      ) : (
        <DataTable
          etiqueta="Preguntas del banco"
          columnas={puedeGestionar ? COLUMNAS_PREGUNTAS_CON_ACCIONES : COLUMNAS_PREGUNTAS}
          pagina={preguntas.data}
          cargando={preguntas.isFetching}
          parametros={busqueda}
          alCambiar={(cambios) => void navegar({ search: (previa) => ({ ...previa, ...cambios }) })}
          idDeFila={(pregunta) => String(pregunta.id)}
          vacio={
            <EmptyState
              titulo="No hay preguntas"
              descripcion={hayFiltros ? 'Ninguna pregunta coincide con los filtros.' : TEXTO_SIN_PREGUNTAS}
              accion={
                <div className="flex flex-wrap items-start justify-center gap-2">
                  <AccionImportar />
                  <AccionRegistrar />
                </div>
              }
            />
          }
        />
      )}
    </>
  )
}
