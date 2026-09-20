import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/server'
import { sesion } from '@/lib/auth/sesion'
import { reiniciarMocks } from '@/mocks/reiniciar'

class ResizeObserverDePrueba {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'scrollTo', { writable: true, value: () => {} })
Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverDePrueba })
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})
Object.defineProperty(Element.prototype, 'hasPointerCapture', { writable: true, value: () => false })
Object.defineProperty(Element.prototype, 'releasePointerCapture', { writable: true, value: () => {} })
Object.defineProperty(Element.prototype, 'scrollIntoView', { writable: true, value: () => {} })

const ancla = document.createElement('div')
ancla.tabIndex = -1
document.body.append(ancla)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  toast.dismiss()
  ancla.focus()
  server.resetHandlers()
  reiniciarMocks()
  sesion.expirar()
  localStorage.clear()
  document.documentElement.className = ''
})

afterAll(() => {
  server.close()
})
