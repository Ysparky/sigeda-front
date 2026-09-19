import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'
import { handlersCatalogos } from './sigeda/catalogos'

export const handlers: RequestHandler[] = [...handlersAuth, ...handlersCatalogos]
