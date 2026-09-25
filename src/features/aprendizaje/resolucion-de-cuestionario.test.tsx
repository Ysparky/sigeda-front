import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEXTO_CUESTIONARIO_REINICIADO, TEXTO_CUESTIONARIO_SIN_NOTA } from '@/lib/dominio/aprendizaje'
import { ID_CUESTIONARIO } from '@/mocks/ia/cuestionarios'
import { iniciarComo, renderApp } from '@/test/render'

function pregunta(numero: number) {
  return within(screen.getByRole('group', { name: `Pregunta ${numero}` }))
}

async function abrirCuestionario() {
  await iniciarComo('alumno.lopez')
  const vista = renderApp(`/aprendizaje/cuestionario?cuestionario=${ID_CUESTIONARIO}`)
  await screen.findByRole('group', { name: 'Pregunta 1' })
  return vista
}

async function responderTodo(usuario: ReturnType<typeof renderApp>['usuario'], completar: string) {
  await usuario.click(pregunta(1).getByRole('radio', { name: 'Un descenso controlado sin potencia del motor' }))
  await usuario.click(pregunta(2).getByRole('radio', { name: 'Verdadero' }))
  await usuario.type(pregunta(3).getByLabelText('Respuesta de la pregunta 3'), completar)
}

async function entregar(usuario: ReturnType<typeof renderApp>['usuario']) {
  await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
  const confirmacion = within(await screen.findByRole('alertdialog'))
  await usuario.click(confirmacion.getByRole('button', { name: 'Entregar' }))
}

describe('Resolver el cuestionario de práctica', () => {
  it('CA-CUE-07 muestra cada enunciado con sus opciones, verdadero/falso o un campo de texto', async () => {
    await abrirCuestionario()
    expect(pregunta(1).getByText('¿Qué permite la autorrotación?')).toBeInTheDocument()
    expect(pregunta(1).getAllByRole('radio')).toHaveLength(4)
    expect(pregunta(2).getAllByRole('radio').map((opcion) => opcion.textContent)).toEqual(['Verdadero', 'Falso'])
    expect(pregunta(3).getByLabelText('Respuesta de la pregunta 3')).toBeInTheDocument()
    expect(pregunta(3).queryByText(/_____/)).not.toBeInTheDocument()
  })

  it('CA-CUE-07 antes de entregar la respuesta correcta y la explicación no están en el DOM', async () => {
    await abrirCuestionario()
    expect(screen.queryByText(/El rotor gira por el flujo de aire ascendente/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Respuesta correcta/)).not.toBeInTheDocument()
    expect(screen.queryByText('autorrotación', { exact: true })).not.toBeInTheDocument()
  })

  it('CA-CUE-08 no se puede entregar con preguntas sin responder y entregar pide confirmación', async () => {
    const { usuario } = await abrirCuestionario()
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled()
    expect(screen.getByText('Responda las 3 preguntas para entregar.')).toBeInTheDocument()
    await usuario.click(pregunta(1).getByRole('radio', { name: 'Un descenso controlado sin potencia del motor' }))
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled()
    await responderTodo(usuario, 'autorrotación')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entregar' })).toBeEnabled())
    await usuario.click(screen.getByRole('button', { name: 'Entregar' }))
    expect(within(await screen.findByRole('alertdialog')).getByText(TEXTO_CUESTIONARIO_SIN_NOTA)).toBeInTheDocument()
  })

  it('CA-CUE-09 al entregar muestra los aciertos, el porcentaje, cada respuesta y A10', async () => {
    const { usuario } = await abrirCuestionario()
    await responderTodo(usuario, 'autorrotación')
    await entregar(usuario)
    expect(await screen.findByText('Aciertos: 3 de 3 (100 %)')).toBeInTheDocument()
    expect(screen.getAllByText(TEXTO_CUESTIONARIO_SIN_NOTA).length).toBeGreaterThan(0)
    expect(pregunta(1).getByText('Correcta')).toBeInTheDocument()
    expect(pregunta(1).getByText('Su respuesta: Un descenso controlado sin potencia del motor')).toBeInTheDocument()
    expect(pregunta(1).getByText('Respuesta correcta: Un descenso controlado sin potencia del motor')).toBeInTheDocument()
    expect(pregunta(1).getByText('El rotor gira por el flujo de aire ascendente.')).toBeInTheDocument()
    expect(pregunta(2).getByText('Respuesta correcta: Verdadero')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entregar' })).not.toBeInTheDocument()
  })

  it('CA-CUE-09 una respuesta equivocada se marca y muestra la correcta', async () => {
    const { usuario } = await abrirCuestionario()
    await usuario.click(pregunta(1).getByRole('radio', { name: 'Aumentar la velocidad de ascenso' }))
    await usuario.click(pregunta(2).getByRole('radio', { name: 'Falso' }))
    await usuario.type(pregunta(3).getByLabelText('Respuesta de la pregunta 3'), 'autogiro')
    await entregar(usuario)
    expect(await screen.findByText('Aciertos: 0 de 3 (0 %)')).toBeInTheDocument()
    expect(pregunta(1).getByText('Incorrecta')).toBeInTheDocument()
    expect(pregunta(1).getByText('Respuesta correcta: Un descenso controlado sin potencia del motor')).toBeInTheDocument()
    expect(pregunta(3).getByText('Respuesta correcta: autorrotación')).toBeInTheDocument()
  })

  it('CA-CUE-10 en completar no distingue mayúsculas, tildes ni espacios sobrantes', async () => {
    const { usuario } = await abrirCuestionario()
    await responderTodo(usuario, '  AutoRRotacion  ')
    await entregar(usuario)
    expect(await screen.findByText('Aciertos: 3 de 3 (100 %)')).toBeInTheDocument()
    expect(pregunta(3).getByText('Correcta')).toBeInTheDocument()
  })

  it('CA-CUE-11 al recargar el cuestionario abre las preguntas en el mismo orden y sin respuestas, con A2', async () => {
    const { usuario, unmount } = await abrirCuestionario()
    await responderTodo(usuario, 'autorrotación')
    await entregar(usuario)
    expect(await screen.findByText('Aciertos: 3 de 3 (100 %)')).toBeInTheDocument()
    unmount()

    await abrirCuestionario()
    expect(screen.getByText(TEXTO_CUESTIONARIO_REINICIADO)).toBeInTheDocument()
    expect(
      ['Pregunta 1', 'Pregunta 2', 'Pregunta 3'].map((nombre) =>
        within(screen.getByRole('group', { name: nombre })).queryAllByRole('radio').length,
      ),
    ).toEqual([4, 2, 0])
    expect(pregunta(1).getAllByRole('radio').every((opcion) => opcion.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(pregunta(3).getByLabelText('Respuesta de la pregunta 3')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled()
  })
})
