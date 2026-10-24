import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('AsistenciaRegistroPage (/turnos/:id/asistencia)', () => {
  it('sin el permiso de asistencia, la ruta queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/turnos/1/asistencia')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })

  it('lista los alumnos del turno, permite marcar y guarda', async () => {
    await iniciarComo('instructor.perez')
    const { usuario } = renderApp('/turnos/1/asistencia')

    expect(await screen.findByText('Alfa Uno, Ana')).toBeInTheDocument()
    expect(screen.getByText('Beta Dos, Beto')).toBeInTheDocument()

    await usuario.selectOptions(screen.getByLabelText('Estado de Beta Dos, Beto'), 'PRESENTE')
    await usuario.click(screen.getByRole('button', { name: 'Guardar asistencia' }))

    expect(await screen.findByText(/Asistencia guardada/)).toBeInTheDocument()
  })
})
