import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { FormularioFase } from './components/formulario-fase'

export function RegistrarFasePage() {
  return (
    <>
      <PageHeader
        titulo="Registrar fase"
        descripcion="Cree una fase con sus subfases."
        acciones={
          <Button variant="outline" asChild>
            <Link to="/programa/fases">Volver a fases</Link>
          </Button>
        }
      />
      <FormularioFase />
    </>
  )
}
