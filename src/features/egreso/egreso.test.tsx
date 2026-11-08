import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { registrarResultado, type ResultadoFinalMock } from '@/mocks/sigeda/resultados'
import { iniciarComo, renderApp } from '@/test/render'

function resultado(cambios: Partial<ResultadoFinalMock>): ResultadoFinalMock {
  return {
    codAlumno: '111111',
    idGrupo: 1,
    situacion: 'EGRESADO',
    fecha: '2026-11-02',
    observacion: null,
    nit: 16.2,
    nia: 16.9,
    nfpi: 16.76,
    puesto: 1,
    horasVuelo: 89.5,
    horasSimulador: 4.5,
    constancia: 'CE-2026-001-01',
    ...cambios,
  }
}

describe('Finalización del curso', () => {
  it('el egresado ve en Mi curso su pase de egreso y lo que le falta para la licencia', async () => {
    registrarResultado(resultado({}))
    await iniciarComo('alumno.lopez')
    renderApp('/inicio')
    const pase = within(await screen.findByRole('region', { name: 'Egresaste' }))
    expect(pase.getByText('CE-2026-001-01')).toBeInTheDocument()
    expect(pase.getByText('1.º de 1')).toBeInTheDocument()
    expect(pase.getByRole('link', { name: 'Ver constancia' })).toHaveAttribute('href', '/constancias/111111')
    expect(screen.queryByRole('region', { name: 'Próximo turno' })).not.toBeInTheDocument()

    const licencia = within(screen.getByRole('region', { name: 'Tu licencia PP-H' }))
    expect(licencia.getByRole('list', { name: 'Ruta de la licencia PP-H' })).toBeInTheDocument()
    expect(licencia.getByText('Certificado médico Clase 2 vigente')).toBeInTheDocument()
    expect(licencia.queryByText(/40 h en total/)).not.toBeInTheDocument()
    expect(licencia.queryByText(/Curso del CIAC/)).not.toBeInTheDocument()
  })

  it('quien se retiró ve su situación final en lugar del próximo turno', async () => {
    registrarResultado(resultado({ situacion: 'RETIRADO', puesto: null, constancia: null, observacion: 'Motivos personales.' }))
    await iniciarComo('alumno.lopez')
    renderApp('/inicio')
    expect(await screen.findByText(/Tu situación final es retirado/)).toHaveTextContent('Motivos personales.')
  })

  it('la constancia de egreso muestra el número, el NFPI y el orden de mérito', async () => {
    registrarResultado(resultado({}))
    await iniciarComo('alumno.lopez')
    renderApp('/constancias/111111')
    const constancia = within(await screen.findByRole('article', { name: 'Constancia CE-2026-001-01' }))
    expect(constancia.getByText(/Oscar Lopez Chaparro/)).toBeInTheDocument()
    expect(constancia.getByText('16.76')).toBeInTheDocument()
    expect(constancia.getByText('1.º de 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument()
  })

  it('un alumno no ve la constancia de otro', async () => {
    registrarResultado(resultado({ codAlumno: '222222' }))
    await iniciarComo('alumno.lopez')
    renderApp('/constancias/222222')
    expect(await screen.findByText(/Solo puede consultar su propia información|Acceso restringido|No tienes permiso/i)).toBeInTheDocument()
  })
})
