import type { RequestHandler } from 'msw'
import { handlersConsultas } from './ia/consultas'
import { handlersCuestionarios } from './ia/cuestionarios'
import { handlersDocumentos } from './ia/documentos'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersFases } from './sigeda/fases'
import { handlersGrupos } from './sigeda/grupos'
import { handlersManiobras } from './sigeda/maniobras'
import { handlersMaterias } from './sigeda/materias'
import { handlersPersonas } from './sigeda/personas'
import { handlersPreguntas } from './sigeda/preguntas'
import { handlersTurnos } from './sigeda/turnos'

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
  ...handlersEvaluaciones,
  ...handlersDocumentos,
  ...handlersCuestionarios,
  ...handlersConsultas,
]
