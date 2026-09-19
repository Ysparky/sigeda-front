import type { RequestHandler } from 'msw'
import { handlersAuth } from './sigeda/auth'

export const handlers: RequestHandler[] = [...handlersAuth]
