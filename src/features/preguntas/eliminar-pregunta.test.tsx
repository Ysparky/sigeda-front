import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TEXTO_PREGUNTA_EN_USO } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { D3_PREGUNTA_EN_USO } from '@/mocks/sigeda/preguntas'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirBanco(ruta: string) {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(ruta)
  await screen.findByText(/registro/)
  return resultado
}

describe('Eliminar pregunta', () => {
  it('CA-BAN-11 una pregunta en uso no se puede eliminar y muestra E2', async () => {
    await abrirBanco('/banco?idMateria=3')
    expect(screen.getByRole('button', { name: 'Eliminar la pregunta 1' })).toBeDisabled()
    expect(screen.getAllByText(TEXTO_PREGUNTA_EN_USO).length).toBeGreaterThan(0)
  })

  it('CA-BAN-11 eliminar pide confirmación y quita la fila', async () => {
    const { usuario } = await abrirBanco('/banco?idMateria=1')
    expect(screen.getByText('Página 1 de 1 · 3 registros')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar la pregunta 22' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText('¿Eliminar la pregunta?')).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Pregunta eliminado con éxito.')).toBeInTheDocument()
    expect(await screen.findByText('Página 1 de 1 · 2 registros')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar la pregunta 22' })).not.toBeInTheDocument()
  })

  it('CA-BAN-11 una eliminación que el servidor rechaza muestra D3', async () => {
    server.use(http.delete(`${API}/api/preguntas/:id`, () => HttpResponse.text(D3_PREGUNTA_EN_USO, { status: 409 })))
    const { usuario } = await abrirBanco('/banco?idMateria=1')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar la pregunta 22' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText(D3_PREGUNTA_EN_USO)).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1 · 3 registros')).toBeInTheDocument()
  })

  it('CA-BAN-11 eliminar una pregunta actualiza la lista de la materia filtrada', async () => {
    const { usuario } = await abrirBanco('/banco?idMateria=6')
    await usuario.click(screen.getByRole('button', { name: 'Eliminar la pregunta 16' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Pregunta eliminado con éxito.')).toBeInTheDocument()
    expect(await screen.findByText('Página 1 de 1 · 5 registros')).toBeInTheDocument()
  })
})
