import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { FormularioManiobra } from './components/formulario-maniobra'

export function RegistrarManiobraPage() {
  return (
    <>
      <PageHeader
        titulo="Registrar maniobra"
        descripcion="Cree una maniobra y asígnela a sus subfases."
        acciones={
          <Button variant="outline" asChild>
            <Link to="/programa/maniobras">Volver a maniobras</Link>
          </Button>
        }
      />
      <FormularioManiobra />
    </>
  )
}
