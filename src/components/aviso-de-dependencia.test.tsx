import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AvisoDeDependencia } from './aviso-de-dependencia'
import { TEXTO_ALERTAS_SIN_SERVIDOR, TEXTO_INDICES_SIN_SERVIDOR } from '@/lib/dominio/seguimiento'

describe('AvisoDeDependencia', () => {
  it('M5-22 en modo mock no muestra nada', () => {
    vi.stubEnv('VITE_MOCK_API', 'true')
    render(<AvisoDeDependencia accion="verAlertas" texto={TEXTO_ALERTAS_SIN_SERVIDOR} />)
    expect(screen.queryByText(TEXTO_ALERTAS_SIN_SERVIDOR)).not.toBeInTheDocument()
  })

  it('M5-22 fuera del modo mock muestra el texto que recibe, no uno propio', () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    vi.stubEnv('VITE_DEPENDENCIAS_RESUELTAS', '')
    render(
      <>
        <AvisoDeDependencia accion="verAlertas" texto={TEXTO_ALERTAS_SIN_SERVIDOR} />
        <AvisoDeDependencia accion="verIndices" texto={TEXTO_INDICES_SIN_SERVIDOR} />
      </>,
    )
    expect(screen.getByText(TEXTO_ALERTAS_SIN_SERVIDOR)).toBeInTheDocument()
    expect(screen.getByText(TEXTO_INDICES_SIN_SERVIDOR)).toBeInTheDocument()
  })
})
