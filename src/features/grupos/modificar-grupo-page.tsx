import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { consultasGrupos } from './api'
import { FormularioGrupo } from './components/formulario-grupo'

export function ModificarGrupoPage({ id }: { id: number }) {
  const { data: grupo } = useSuspenseQuery(consultasGrupos.detalle(id))

  return (
    <>
      <PageHeader
        titulo="Modificar grupo"
        descripcion={grupo.nombre}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/grupos/$id" params={{ id: String(grupo.id) }}>
              Volver al grupo
            </Link>
          </Button>
        }
      />
      <FormularioGrupo grupo={grupo} />
    </>
  )
}
