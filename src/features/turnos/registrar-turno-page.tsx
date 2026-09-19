import { PageHeader } from '@/components/page-header'
import { FormularioTurno } from './components/formulario-turno'
import { turnoVacio } from './schemas'

export function RegistrarTurnoPage() {
  return (
    <>
      <PageHeader
        titulo="Registrar turno"
        descripcion="Programe un turno de vuelo con su instructor, aeronave, alumnos y maniobras."
      />
      <FormularioTurno valoresIniciales={turnoVacio()} />
    </>
  )
}
