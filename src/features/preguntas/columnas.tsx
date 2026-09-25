import { Pencil } from 'lucide-react'
import { ayudanteDeColumnas } from '@/components/columnas-tabla'
import { Button } from '@/components/ui/button'
import { accionDisponible } from '@/lib/dependencias'
import { etiquetaDeDificultad, etiquetaDeOrigen, etiquetaDeTipoPregunta } from '@/lib/dominio/teoria'
import type { PreguntaFila } from './api'
import { DialogoPregunta } from './components/dialogo-pregunta'
import { EliminarPregunta } from './components/eliminar-pregunta'

const ayudante = ayudanteDeColumnas<PreguntaFila>()

const COLUMNAS_SIN_ACCIONES = ayudante.columns([
  ayudante.accessor('materia', { header: 'Materia', enableSorting: true }),
  ayudante.accessor('enunciado', {
    header: 'Enunciado',
    enableSorting: true,
    cell: (contexto) => <span className="block max-w-xl">{contexto.getValue()}</span>,
  }),
  ayudante.accessor('tipoPregunta', {
    header: 'Tipo',
    cell: (contexto) => etiquetaDeTipoPregunta(contexto.getValue()),
  }),
  ayudante.accessor('dificultad', {
    header: 'Dificultad',
    enableSorting: true,
    cell: (contexto) => etiquetaDeDificultad(contexto.getValue()),
  }),
  ayudante.accessor('origen', { header: 'Origen', cell: (contexto) => etiquetaDeOrigen(contexto.getValue()) }),
  ayudante.accessor('enUso', { header: 'En uso', cell: (contexto) => (contexto.getValue() ? 'Sí' : 'No') }),
])

const acciones = ayudante.display({
  id: 'acciones',
  header: () => <span className="sr-only">Acciones</span>,
  cell: (contexto) => {
    const deshabilitado = !accionDisponible('gestionarPreguntas')
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <DialogoPregunta
          idPregunta={contexto.row.original.id}
          disparador={
            <Button
              variant="outline"
              size="sm"
              disabled={deshabilitado}
              aria-label={`Modificar la pregunta ${contexto.row.original.id}`}
            >
              <Pencil aria-hidden />
              Modificar
            </Button>
          }
        />
        <EliminarPregunta pregunta={contexto.row.original} deshabilitado={deshabilitado} />
      </div>
    )
  },
})

export const COLUMNAS_PREGUNTAS = ayudante.columns([...COLUMNAS_SIN_ACCIONES, acciones])
