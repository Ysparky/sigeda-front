import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { AvisoDeDependencia } from '@/components/aviso-de-dependencia'
import { Enlace } from '@/components/enlace'
import { PageHeader } from '@/components/page-header'
import { PANTALLAS } from '@/lib/auth/pantallas'
import { ETIQUETAS_PESTANA, TEXTO_INDICES_SOLO_MOCK } from '@/lib/dominio/seguimiento'
import { CabeceraDelLegajo } from './components/cabecera-del-legajo'
import { HistorialPractico } from './components/historial-practico'
import { PanelDeEstadoTeorico } from './components/panel-de-estado-teorico'
import { PanelDeIndices } from './components/panel-de-indices'
import { consultasSeguimiento } from './api'
import { PESTANAS } from './schemas'

const ruta = getRouteApi('/_app/seguimiento/$alumno')

export function LegajoPage({ codAlumno }: { codAlumno: string }) {
  const busqueda = ruta.useSearch()
  const alumno = useQuery(consultasSeguimiento.alumno(codAlumno))
  const nombre = alumno.data === undefined ? '' : `${alumno.data.nombre} ${alumno.data.aPaterno} ${alumno.data.aMaterno}`.trim()

  return (
    <div className="grid gap-4">
      <PageHeader
        titulo={PANTALLAS.legajo.titulo}
        descripcion={nombre === '' ? PANTALLAS.legajo.descripcion : `${nombre} · ${codAlumno}`}
      />
      <AvisoDeDependencia accion="verIndices" texto={TEXTO_INDICES_SOLO_MOCK} />
      <nav aria-label="Secciones del legajo" className="flex flex-wrap gap-1 border-b">
        {PESTANAS.map((pestana) => (
          <Enlace
            key={pestana}
            to="/seguimiento/$alumno"
            params={{ alumno: codAlumno }}
            search={(previa) => ({ ...previa, tab: pestana, page: 0 })}
            aria-current={busqueda.tab === pestana ? 'page' : undefined}
            className="rounded-t-md px-3 py-2 text-sm aria-[current=page]:bg-muted aria-[current=page]:font-medium"
          >
            {ETIQUETAS_PESTANA[pestana]}
          </Enlace>
        ))}
      </nav>
      {busqueda.tab === 'resumen' && (
        <>
          <CabeceraDelLegajo codAlumno={codAlumno} alumno={alumno} />
          <PanelDeIndices codAlumno={codAlumno} />
          <PanelDeEstadoTeorico codAlumno={codAlumno} />
        </>
      )}
      {busqueda.tab === 'practico' && <HistorialPractico codAlumno={codAlumno} busqueda={busqueda} />}
      {busqueda.tab === 'teorico' && null}
    </div>
  )
}
