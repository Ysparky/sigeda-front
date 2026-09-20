import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersCuentas } from './sigeda/cuentas'
import { handlersEvaluaciones } from './sigeda/evaluaciones'
import { handlersPersonas } from './sigeda/personas'
import { handlersTurnos } from './sigeda/turnos'

export const handlers: RequestHandler[] = [
  ...handlersAuth,
  ...handlersCatalogos,
  ...handlersCuentas,
  ...handlersPersonas,
  ...handlersTurnos,
  ...handlersEvaluaciones,
]
