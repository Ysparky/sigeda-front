import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { FormularioGrupo } from './components/formulario-grupo'

export function RegistrarGrupoPage() {
  return (
    <>
      <PageHeader
        titulo="Registrar grupo"
        descripcion="Cree un grupo y asigne sus alumnos."
        acciones={
          <Button variant="outline" asChild>
            <Link to="/grupos">Volver a grupos</Link>
          </Button>
        }
      />
      <FormularioGrupo />
    </>
  )
}
