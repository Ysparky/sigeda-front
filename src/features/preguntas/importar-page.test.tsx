import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEXTO_GENERACION_DEMORADA, TEXTO_GENERANDO_CUESTIONARIO } from '@/lib/dominio/aprendizaje'
import { TEXTO_GENERACION_RECHAZADA_E8, TEXTO_REVISAR_IMPORTACION } from '@/lib/dominio/teoria'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import type { UserEvent } from '@testing-library/user-event'

const DOCUMENTO = 'PDI EA-510 Título III.pdf'

async function abrirImportar(usuario?: UserEvent) {
  await iniciarComo('instructor.perez')
  const resultado = renderApp('/banco/importar', usuario)
  await screen.findByLabelText('Cantidad de preguntas')
  return resultado
}

async function prepararLote(usuario: UserEvent, cantidad: string) {
  await usuario.click(screen.getByLabelText(DOCUMENTO))
  await usuario.selectOptions(screen.getByLabelText('Materia del lote'), 'Adoctrinamiento de Vuelo')
  await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
  await usuario.type(screen.getByLabelText('Cantidad de preguntas'), cantidad)
}

function contarGeneraciones() {
  let generaciones = 0
  const oyente = ({ request }: { request: Request }) => {
    if (request.method === 'POST' && request.url.includes('/quizzes/generate')) generaciones += 1
  }
  server.events.on('request:start', oyente)
  return {
    total: () => generaciones,
    detener: () => server.events.removeListener('request:start', oyente),
  }
}

describe('Importar preguntas desde IA', () => {
  it('CA-IMP-01 exige documento, tipo, cantidad de 2 a 20, materia y dificultad', async () => {
    const { usuario } = await abrirImportar()
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText('Elija al menos un documento.')).toBeInTheDocument()
    expect(screen.getByText('La materia es obligatoria.')).toBeInTheDocument()
    await usuario.click(screen.getByLabelText(DOCUMENTO))
    await usuario.selectOptions(screen.getByLabelText('Materia del lote'), 'Adoctrinamiento de Vuelo')
    await usuario.click(screen.getByLabelText('Opción múltiple'))
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText('Elija al menos un tipo de pregunta.')).toBeInTheDocument()
    await usuario.click(screen.getByLabelText('Opción múltiple'))
    await usuario.clear(screen.getByLabelText('Cantidad de preguntas'))
    await usuario.type(screen.getByLabelText('Cantidad de preguntas'), '1')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText('La cantidad debe ser un número entero entre 2 y 20.')).toBeInTheDocument()
  })

  it('CA-IMP-04 una generación válida pasa a la revisión con E4 y deja el formulario', async () => {
    const { usuario } = await abrirImportar()
    await prepararLote(usuario, '12')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText(TEXTO_REVISAR_IMPORTACION)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generar preguntas' })).not.toBeInTheDocument()
  })

  it('CA-IMP-02 mientras genera deshabilita el formulario, avisa y no envía dos veces', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirImportar(usuario)
    const conteo = contarGeneraciones()
    await prepararLote(usuario, '20')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText(TEXTO_GENERANDO_CUESTIONARIO)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled()
    expect(screen.getByLabelText('Cantidad de preguntas')).toBeDisabled()
    expect(screen.getByLabelText(DOCUMENTO)).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: 'Generando…' }))
    await avanzar(3000)
    expect(await screen.findByText(TEXTO_REVISAR_IMPORTACION)).toBeInTheDocument()
    expect(conteo.total()).toBe(1)
    conteo.detener()
  })

  it('CA-IMP-02 a los 120 segundos la petición se cancela y se ofrece Reintentar', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirImportar(usuario)
    await prepararLote(usuario, '13')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    await screen.findByText(TEXTO_GENERANDO_CUESTIONARIO)
    await avanzar(119_000)
    expect(screen.queryByText(TEXTO_GENERACION_DEMORADA)).not.toBeInTheDocument()
    await avanzar(1500)
    expect(await screen.findByText(TEXTO_GENERACION_DEMORADA)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  })

  it('CA-IMP-03 un mensaje que no está en la lista del contrato se reemplaza por E8', async () => {
    const { usuario } = await abrirImportar()
    await prepararLote(usuario, '7')
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText(TEXTO_GENERACION_RECHAZADA_E8)).toBeInTheDocument()
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument()
  })

  it('CA-IMP-03 un documento que no está listo muestra el mensaje del contrato', async () => {
    const { usuario } = await abrirImportar()
    await prepararLote(usuario, '5')
    await usuario.click(screen.getByLabelText(DOCUMENTO))
    await usuario.click(screen.getByRole('button', { name: 'Generar preguntas' }))
    expect(await screen.findByText('Elija al menos un documento.')).toBeInTheDocument()
  })
})
