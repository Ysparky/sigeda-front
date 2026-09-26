import type { RequestHandler } from 'msw'
import { handlersConsultas } from './ia/consultas'
import { handlersCuestionarios } from './ia/cuestionarios'
import { handlersDocumentos } from './ia/documentos'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersCuestionariosTeoria } from './sigeda/cuestionarios-teoria'
import { handlersDesaprobados } from './sigeda/desaprobados'
import { handlersEstadoTeorico } from './sigeda/estado-teorico'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersFases } from './sigeda/fases'
import { handlersGrupos } from './sigeda/grupos'
import { handlersManiobras } from './sigeda/maniobras'
import { handlersMaterias } from './sigeda/materias'
import { handlersPersonas } from './sigeda/personas'
import { handlersPreguntas } from './sigeda/preguntas'
import { handlersTurnos } from './sigeda/turnos'
import { handlersTurnosTeoricos } from './sigeda/turnos-teoricos'

export const handlers: RequestHandler[] = [
  ...handlersAuth,
  ...handlersCatalogos,
  ...handlersCuentas,
  ...handlersPersonas,
  ...handlersGrupos,
  ...handlersFases,
  ...handlersManiobras,
  ...handlersMaterias,
  ...handlersPreguntas,
  ...handlersTurnos,
  ...handlersTurnosTeoricos,
  ...handlersCuestionariosTeoria,
  ...handlersEstadoTeorico,
  ...handlersEvaluaciones,
  ...handlersDesaprobados,
  ...handlersDocumentos,
  ...handlersCuestionarios,
  ...handlersConsultas,
]
