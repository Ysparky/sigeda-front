import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'
import { handlersTurnos } from './sigeda/turnos'

export const handlers: RequestHandler[] = [...handlersAuth, ...handlersCatalogos, ...handlersTurnos]
