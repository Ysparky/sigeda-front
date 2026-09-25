import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TEXTO_SIN_PREGUNTAS } from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import type { UserEvent } from '@testing-library/user-event'

const ENUNCIADO = '¿Cuál es el procedimiento normal de encendido del motor?'

async function abrirBanco(ruta = '/banco') {
  await iniciarComo('instructor.perez')
  const resultado = renderApp(ruta)
  await screen.findByText(/registro/)
  return resultado
}

async function abrirRegistrar(usuario: UserEvent) {
  await usuario.click(screen.getByRole('button', { name: 'Registrar pregunta' }))
  return within(await screen.findByRole('dialog'))
}

async function llenarOpcionMultiple(usuario: UserEvent, dialogo: ReturnType<typeof within>) {
  await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
  await usuario.type(dialogo.getByLabelText('Enunciado'), ENUNCIADO)
  for (const [indice, texto] of ['El del manual de vuelo', 'El que indique el alumno', 'Cualquiera', 'Ninguno'].entries()) {
    await usuario.type(dialogo.getByLabelText(`Alternativa ${indice + 1}`), texto)
  }
  await usuario.click(dialogo.getByRole('radio', { name: 'Alternativa 1 es la correcta' }))
}

describe('Registrar y modificar pregunta', () => {
  it('CA-BAN-03 el estado vacío ofrece Registrar pregunta e Importar desde IA', async () => {
    server.use(
      http.get(`${API}/api/preguntas`, () => HttpResponse.text('No existen preguntas disponibles.', { status: 404 })),
    )
    await iniciarComo('instructor.perez')
    renderApp('/banco')
    expect(await screen.findByText(TEXTO_SIN_PREGUNTAS)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Registrar pregunta' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Importar desde IA' }).length).toBeGreaterThan(0)
  })

  it('CA-BAN-04 pide materia, enunciado de 10 a 500, dificultad, tipo y alternativas', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('La materia es obligatoria.')).toBeInTheDocument()
    expect(dialogo.getByText('El enunciado es obligatorio.')).toBeInTheDocument()
    expect(dialogo.getByText('Debe marcar exactamente una alternativa como correcta.')).toBeInTheDocument()
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'corto')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('El enunciado debe tener entre 10 y 500 caracteres.')).toBeInTheDocument()
  })

  it('CA-BAN-04 CA-BAN-05 guarda una pregunta de opción múltiple y la lista la muestra', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await llenarOpcionMultiple(usuario, dialogo)
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Materia'), 'Procedimientos Normales')
    expect(await screen.findByText(ENUNCIADO)).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1 · 1 registro')).toBeInTheDocument()
  })

  it('CA-BAN-05 exige cuatro alternativas con textos distintos', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    expect(dialogo.getAllByRole('radio')).toHaveLength(4)
    await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
    await usuario.type(dialogo.getByLabelText('Enunciado'), ENUNCIADO)
    for (const indice of [1, 2, 3, 4]) {
      await usuario.type(dialogo.getByLabelText(`Alternativa ${indice}`), 'Igual')
    }
    await usuario.click(dialogo.getByRole('radio', { name: 'Alternativa 1 es la correcta' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('Las alternativas no pueden repetirse.')).toBeInTheDocument()
  })

  it('CA-BAN-04 CA-BAN-05 las alternativas en blanco no cuentan como repetidas', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findAllByText('La respuesta es obligatoria.')).toHaveLength(4)
    expect(dialogo.queryByText('Las alternativas no pueden repetirse.')).not.toBeInTheDocument()
  })

  it('CA-BAN-05 dos alternativas que solo difieren en la tilde son distintas y se guardan', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
    await usuario.type(dialogo.getByLabelText('Enunciado'), ENUNCIADO)
    for (const [indice, texto] of ['Sí', 'Si', 'Sí, siempre', 'No'].entries()) {
      await usuario.type(dialogo.getByLabelText(`Alternativa ${indice + 1}`), texto)
    }
    await usuario.click(dialogo.getByRole('radio', { name: 'Alternativa 1 es la correcta' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
    expect(dialogo.queryByText('Las alternativas no pueden repetirse.')).not.toBeInTheDocument()
  })

  it('CA-BAN-06 verdadero o falso ofrece solo esas dos alternativas y exige marcar una', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.selectOptions(dialogo.getByLabelText('Tipo de pregunta'), 'Verdadero o falso')
    expect(dialogo.getAllByRole('radio')).toHaveLength(2)
    expect(dialogo.getByText('Verdadero')).toBeInTheDocument()
    expect(dialogo.getByText('Falso')).toBeInTheDocument()
    expect(dialogo.queryByLabelText('Alternativa 1')).not.toBeInTheDocument()
    await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'El encendido del motor sigue el manual de vuelo.')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('Debe marcar exactamente una alternativa como correcta.')).toBeInTheDocument()
    await usuario.click(dialogo.getByRole('radio', { name: 'Alternativa 1 es la correcta' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
  })

  it('CA-BAN-07 completar exige el marcador y una sola respuesta esperada', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.selectOptions(dialogo.getByLabelText('Tipo de pregunta'), 'Completar')
    expect(dialogo.queryByRole('radio')).not.toBeInTheDocument()
    await usuario.selectOptions(dialogo.getByLabelText('Materia'), 'Procedimientos Normales')
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'El encendido del motor sigue el manual de vuelo.')
    await usuario.type(dialogo.getByLabelText('Respuesta esperada'), 'manual')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(
      await dialogo.findByText('El enunciado de una pregunta de completar debe incluir el marcador _____.'),
    ).toBeInTheDocument()
    await usuario.clear(dialogo.getByLabelText('Enunciado'))
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'El encendido del motor sigue el _____ de vuelo.')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
  })

  it('CA-BAN-08 cambiar el tipo avisa antes de descartar lo escrito y rehace las alternativas', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await usuario.type(dialogo.getByLabelText('Alternativa 1'), 'Algo escrito')
    await usuario.selectOptions(dialogo.getByLabelText('Tipo de pregunta'), 'Verdadero o falso')
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText('¿Cambiar el tipo de pregunta?')).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Conservar el tipo' }))
    expect(dialogo.getByLabelText('Alternativa 1')).toHaveValue('Algo escrito')
    await usuario.selectOptions(dialogo.getByLabelText('Tipo de pregunta'), 'Verdadero o falso')
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cambiar y rehacer' }))
    expect(await dialogo.findByText('Verdadero')).toBeInTheDocument()
    expect(dialogo.queryByLabelText('Alternativa 1')).not.toBeInTheDocument()
  })

  it('CA-BAN-09 la explicación es opcional y admite hasta 1000 caracteres', async () => {
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await llenarOpcionMultiple(usuario, dialogo)
    await usuario.type(dialogo.getByLabelText('Explicación'), 'a'.repeat(1001))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('La explicación no puede superar los 1000 caracteres.')).toBeInTheDocument()
    await usuario.clear(dialogo.getByLabelText('Explicación'))
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
  })

  it('CA-BAN-10 modificar aplica las mismas reglas y conserva el origen IA', async () => {
    const { usuario } = await abrirBanco('/banco?idMateria=3&origen=IA')
    await usuario.click(screen.getByRole('button', { name: 'Modificar la pregunta 9' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByLabelText('Enunciado')).toHaveValue(
      '¿Qué se exige cuando una calificación queda bajo el estándar de la maniobra?',
    )
    await usuario.clear(dialogo.getByLabelText('Enunciado'))
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'corto')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('El enunciado debe tener entre 10 y 500 caracteres.')).toBeInTheDocument()
    await usuario.clear(dialogo.getByLabelText('Enunciado'))
    await usuario.type(dialogo.getByLabelText('Enunciado'), 'Enunciado corregido a mano después de importarlo.')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await screen.findByText('Pregunta guardada con éxito.')).toBeInTheDocument()
    expect(await screen.findByText('Enunciado corregido a mano después de importarlo.')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1 · 2 registros')).toBeInTheDocument()
  })

  it('CA-BAN-12 los errores del backend aparecen bajo su campo, con índice en las alternativas', async () => {
    server.use(
      http.post(`${API}/api/preguntas`, () =>
        HttpResponse.json(
          [
            "'enunciado': El enunciado es obligatorio.",
            "'alternativas[2].respuesta': La respuesta no puede superar los 200 caracteres.",
          ],
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirBanco()
    const dialogo = await abrirRegistrar(usuario)
    await llenarOpcionMultiple(usuario, dialogo)
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar pregunta' }))
    expect(await dialogo.findByText('El enunciado es obligatorio.')).toBeInTheDocument()
    expect(dialogo.getByText('La respuesta no puede superar los 200 caracteres.')).toBeInTheDocument()
  })

  it('CA-BAN-13 el diálogo de modificar no monta el formulario hasta tener el detalle', async () => {
    server.use(http.get(`${API}/api/preguntas/:id`, () => HttpResponse.error()))
    const { usuario } = await abrirBanco('/banco?idMateria=3')
    await usuario.click(screen.getByRole('button', { name: 'Modificar la pregunta 1' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(await dialogo.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(dialogo.queryByLabelText('Enunciado')).not.toBeInTheDocument()
  })
})
