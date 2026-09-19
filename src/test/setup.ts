import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

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

afterEach(() => {
  cleanup()
})
