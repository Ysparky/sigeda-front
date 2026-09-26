import type { RequestHandler } from 'msw'
import { handlersConsultas } from './ia/consultas'
import { handlersCuestionarios } from './ia/cuestionarios'
import { handlersDocumentos } from './ia/documentos'
import { handlersAlumnos } from './sigeda/alumnos'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersChequeos } from './sigeda/chequeos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersCuestionariosHistorial } from './sigeda/cuestionarios-historial'
import { handlersCuestionariosTeoria } from './sigeda/cuestionarios-teoria'
import { handlersDesaprobados } from './sigeda/desaprobados'
import { handlersEstadoTeorico } from './sigeda/estado-teorico'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersFases } from './sigeda/fases'
import { handlersGrupos } from './sigeda/grupos'
import { handlersIndices } from './sigeda/indices'
import { handlersManiobras } from './sigeda/maniobras'
import { handlersMaterias } from './sigeda/materias'
import { handlersPersonas } from './sigeda/personas'
import { handlersPreguntas } from './sigeda/preguntas'
import { handlersReportesSubfase } from './sigeda/reportes-subfase'
import { handlersTurnos } from './sigeda/turnos'
import { handlersTurnosTeoricos } from './sigeda/turnos-teoricos'

export const handlers: RequestHandler[] = [
  ...handlersAuth,
  ...handlersCatalogos,
  ...handlersCuentas,
  ...handlersPersonas,
  ...handlersAlumnos,
  ...handlersGrupos,
  ...handlersFases,
  ...handlersManiobras,
  ...handlersMaterias,
  ...handlersPreguntas,
  ...handlersTurnos,
  ...handlersTurnosTeoricos,
  ...handlersCuestionariosTeoria,
  ...handlersCuestionariosHistorial,
  ...handlersEstadoTeorico,
  ...handlersEvaluaciones,
  ...handlersReportesSubfase,
  ...handlersIndices,
  ...handlersDesaprobados,
  ...handlersChequeos,
  ...handlersDocumentos,
  ...handlersCuestionarios,
  ...handlersConsultas,
]
