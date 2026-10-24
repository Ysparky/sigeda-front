import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

describe('ReporteAsistenciaPage (/asistencias)', () => {
  it('sin el permiso de asistencia, la ruta queda restringida', async () => {
    await iniciarComo('alumno.lopez')
    renderApp('/asistencias')
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
  })

  it('muestra el % y las faltas por alumno y resalta la condición EN_RIESGO', async () => {
    await iniciarComo('instructor.perez')
    renderApp('/asistencias')

    const fila = (await screen.findByText('Riesgo Uno, Rita')).closest('tr') as HTMLElement
    expect(within(fila).getByText('40%')).toBeInTheDocument()
    expect(within(fila).getByText('En riesgo')).toBeInTheDocument()

    const regular = screen.getByText('Regular Dos, Rodo').closest('tr') as HTMLElement
    expect(within(regular).getByText('20%')).toBeInTheDocument()
  })
})
