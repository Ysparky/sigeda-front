import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersTurnos } from './sigeda/turnos'

export const handlers: RequestHandler[] = [
  ...handlersAuth,
  ...handlersCatalogos,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
