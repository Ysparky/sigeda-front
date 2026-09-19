import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SinPermisoError } from '@/lib/auth/guardas'
import { ErrorDeRuta } from './error-de-ruta'

it('CA-SES-04 muestra "No tiene permisos para esta acción" cuando falta el permiso', () => {
  render(<ErrorDeRuta error={new SinPermisoError()} reset={() => {}} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Acceso restringido')
  expect(screen.getByRole('alert')).toHaveTextContent('No tiene permisos para esta acción.')
})
