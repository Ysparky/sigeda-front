import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { consultasFases } from './api'
import { FormularioFase } from './components/formulario-fase'

export function ModificarFasePage({ id }: { id: number }) {
  const { data: fase } = useSuspenseQuery(consultasFases.detalle(id))

  return (
    <>
      <PageHeader
        titulo="Modificar fase"
        descripcion={fase.nombre}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/programa/fases/$id" params={{ id: String(fase.id) }}>
              Volver a la fase
            </Link>
          </Button>
        }
      />
      <FormularioFase fase={fase} />
    </>
  )
}
