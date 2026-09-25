import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import {
  TEXTO_ALTERNATIVAS_REPETIDAS,
  TEXTO_CONFIRMAR_IMPORTACION,
  TEXTO_ENUNCIADO_CORTO,
  TEXTO_ENUNCIADO_RECORTADO,
  TEXTO_REVISAR_IMPORTACION,
} from '@/lib/dominio/teoria'
import { API } from '@/mocks/sigeda/comun'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import type { UserEvent } from '@testing-library/user-event'
import { TEXTO_REPETIDA_EN_LOTE } from './importacion'

const DOCUMENTO = 'PDI EA-510 Título III.pdf'

async function generarLote(usuario?: UserEvent) {
  await iniciarComo('instructor.perez')
  const resultado = renderApp('/banco/importar', usuario)
  await screen.findByLabelText('Cantidad de preguntas')
  const usuarioActivo = resultado.usuario
  await usuarioActivo.click(screen.getByLabelText(DOCUMENTO))
  await usuarioActivo.selectOptions(screen.getByLabelText('Materia del lote'), 'Adoctrinamiento de Vuelo')
  await usuarioActivo.clear(screen.getByLabelText('Cantidad de preguntas'))
  await usuarioActivo.type(screen.getByLabelText('Cantidad de preguntas'), '12')
  await usuarioActivo.click(screen.getByRole('button', { name: 'Generar preguntas' }))
  await screen.findByRole('table', { name: 'Preguntas generadas' })
  return resultado
}

function filas(): HTMLElement[] {
  return within(screen.getByRole('table', { name: 'Preguntas generadas' })).getAllByRole('row').slice(1)
}

function fila(numero: number) {
  return within(filas()[numero - 1]!)
}

async function arreglarLasBloqueadas(usuario: UserEvent) {
  await usuario.clear(screen.getByLabelText('Enunciado de la pregunta 1'))
  await usuario.type(screen.getByLabelText('Enunciado de la pregunta 1'), 'Enunciado revisado por el instructor.')
  await usuario.clear(screen.getByLabelText('Alternativa 3 de la pregunta 2'))
  await usuario.type(screen.getByLabelText('Alternativa 3 de la pregunta 2'), 'El mecánico de línea')
  await usuario.clear(screen.getByLabelText('Enunciado de la pregunta 5'))
  await usuario.type(screen.getByLabelText('Enunciado de la pregunta 5'), '¿Qué componente genera la sustentación?')
}

describe('Revisión de las preguntas generadas', () => {
  it('CA-IMP-04 muestra E4, una fila editable por pregunta y nada se guarda todavía', async () => {
    await generarLote()
    expect(screen.getByText(TEXTO_REVISAR_IMPORTACION)).toBeInTheDocument()
    expect(filas()).toHaveLength(5)
    expect(screen.getByLabelText('Enunciado de la pregunta 3')).toHaveValue(
      'La última misión de cada subfase es un chequeo.',
    )
    expect(fila(3).getByText('Verdadero o falso')).toBeInTheDocument()
    expect(screen.getByText('Elegidas: 5 de 5.')).toBeInTheDocument()
  })

  it('CA-IMP-05 el enunciado largo llega recortado con E5 y el corto con E26', async () => {
    const { usuario } = await generarLote()
    const largo = screen.getByLabelText('Enunciado de la pregunta 1') as HTMLTextAreaElement
    expect(largo.value).toHaveLength(500)
    expect(largo.maxLength).toBe(500)
    expect(largo.value.startsWith('¿Cuál de las siguientes afirmaciones')).toBe(true)
    expect(fila(1).getByText(TEXTO_ENUNCIADO_RECORTADO)).toBeInTheDocument()
    expect(screen.getByLabelText('Enunciado de la pregunta 5')).toHaveValue('Motor?')
    expect(fila(5).getByText(TEXTO_ENUNCIADO_CORTO)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar al banco' })).toBeDisabled()
    await usuario.clear(screen.getByLabelText('Enunciado de la pregunta 1'))
    await usuario.type(screen.getByLabelText('Enunciado de la pregunta 1'), 'Enunciado revisado por el instructor.')
    expect(fila(1).queryByText(TEXTO_ENUNCIADO_RECORTADO)).not.toBeInTheDocument()
  })

  it('CA-IMP-06 la pregunta de verdadero o falso trae sus dos alternativas con la correcta marcada', async () => {
    await generarLote()
    expect(fila(3).getByText('Verdadero')).toBeInTheDocument()
    expect(fila(3).getByText('Falso')).toBeInTheDocument()
    expect(fila(3).getByRole('radio', { name: 'Alternativa 1 de la pregunta 3 es la correcta' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('CA-IMP-07 las alternativas repetidas muestran E6 y una opción larga se recorta sin aviso', async () => {
    const { usuario } = await generarLote()
    expect(fila(2).getByText(TEXTO_ALTERNATIVAS_REPETIDAS)).toBeInTheDocument()
    expect((screen.getByLabelText('Alternativa 1 de la pregunta 5') as HTMLInputElement).value).toHaveLength(200)
    expect(fila(5).queryByText(TEXTO_ALTERNATIVAS_REPETIDAS)).not.toBeInTheDocument()
    await usuario.clear(screen.getByLabelText('Alternativa 3 de la pregunta 2'))
    await usuario.type(screen.getByLabelText('Alternativa 3 de la pregunta 2'), 'El mecánico de línea')
    expect(fila(2).queryByText(TEXTO_ALTERNATIVAS_REPETIDAS)).not.toBeInTheDocument()
  })

  it('CA-IMP-04 CA-IMP-11 quitar filas cambia el total y sin elegidas Importar está deshabilitado', async () => {
    const { usuario } = await generarLote()
    await usuario.click(fila(1).getByRole('button', { name: 'Quitar la pregunta 1 de la importación' }))
    expect(screen.getByText('Elegidas: 4 de 5.')).toBeInTheDocument()
    for (const numero of [2, 3, 4, 5]) {
      await usuario.click(screen.getByLabelText(`Importar la pregunta ${numero}`))
    }
    expect(screen.getByText('Elegidas: 0 de 5.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar al banco' })).toBeDisabled()
  })

  it('CA-IMP-09 quitar una de dos filas duplicadas habilita la que queda y permite importar', async () => {
    const { usuario, router } = await generarLote()
    const enunciadoComun = 'Enunciado de prueba para verificar duplicados en el lote de importación.'
    await usuario.clear(screen.getByLabelText('Enunciado de la pregunta 1'))
    await usuario.type(screen.getByLabelText('Enunciado de la pregunta 1'), enunciadoComun)
    await usuario.clear(screen.getByLabelText('Enunciado de la pregunta 2'))
    await usuario.type(screen.getByLabelText('Enunciado de la pregunta 2'), enunciadoComun)
    await usuario.clear(screen.getByLabelText('Alternativa 3 de la pregunta 2'))
    await usuario.type(screen.getByLabelText('Alternativa 3 de la pregunta 2'), 'El mecánico de línea')
    for (const numero of [3, 4, 5]) {
      await usuario.click(screen.getByLabelText(`Importar la pregunta ${numero}`))
    }
    expect(fila(2).getByText(TEXTO_REPETIDA_EN_LOTE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar al banco' })).toBeDisabled()
    await usuario.click(screen.getByLabelText('Importar la pregunta 1'))
    expect(fila(2).queryByText(TEXTO_REPETIDA_EN_LOTE)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar al banco' })).toBeEnabled()
    await usuario.click(screen.getByRole('button', { name: 'Importar al banco' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Importar' }))
    expect(await screen.findByText('Preguntas guardadas con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/banco')
  })

  it('CA-IMP-10 mientras se importa los controles de cada fila quedan deshabilitados', async () => {
    const { usuario, avanzar } = relojFalso()
    server.use(
      http.post(`${API}/api/preguntas/lote`, async () => {
        await delay(5000)
        return HttpResponse.json({ mensaje: 'Preguntas guardadas con éxito.', preguntas: [] }, { status: 201 })
      }),
    )
    const { router } = await generarLote(usuario)
    await arreglarLasBloqueadas(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Importar al banco' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Importar' }))
    await waitFor(() => expect(screen.getByLabelText('Importar la pregunta 1')).toBeDisabled())
    expect(screen.getByLabelText('Enunciado de la pregunta 1')).toBeDisabled()
    expect(screen.getByLabelText('Materia de la pregunta 1')).toBeDisabled()
    expect(screen.getByLabelText('Dificultad de la pregunta 1')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Quitar la pregunta 1 de la importación' })).toBeDisabled()
    await avanzar(5000)
    expect(await screen.findByText('Preguntas guardadas con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/banco')
  })

  it('CA-IMP-08 CA-IMP-09 CA-IMP-10 importa con E7, la materia por pregunta y vuelve al banco', async () => {
    const { usuario, router } = await generarLote()
    await arreglarLasBloqueadas(usuario)
    await usuario.selectOptions(screen.getByLabelText('Materia de la pregunta 4'), 'Procedimientos de Emergencias')
    await usuario.selectOptions(screen.getByLabelText('Dificultad de la pregunta 4'), 'Alta')
    await usuario.click(screen.getByRole('button', { name: 'Importar al banco' }))
    const aviso = within(await screen.findByRole('alertdialog'))
    expect(aviso.getByText(TEXTO_CONFIRMAR_IMPORTACION)).toBeInTheDocument()
    await usuario.click(aviso.getByRole('button', { name: 'Importar' }))
    expect(await screen.findByText('Preguntas guardadas con éxito.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/banco')
    await usuario.selectOptions(await screen.findByLabelText('Materia'), 'Procedimientos de Emergencias')
    expect(await screen.findByText('Página 1 de 1 · 7 registros')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByLabelText('Origen'), 'IA')
    expect(await screen.findByText('Página 1 de 1 · 1 registro')).toBeInTheDocument()
  })

  it('CA-IMP-09 si el servidor rechaza una fila ninguna queda en el banco y el error la señala', async () => {
    server.use(
      http.post(`${API}/api/preguntas/lote`, () =>
        HttpResponse.json(["'preguntas[2].enunciado': El enunciado debe tener entre 10 y 500 caracteres."], {
          status: 400,
        }),
      ),
    )
    const { usuario, router } = await generarLote()
    await arreglarLasBloqueadas(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Importar al banco' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Importar' }))
    expect(await fila(3).findByText('El enunciado debe tener entre 10 y 500 caracteres.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/banco/importar')
  })

  it('CA-BAN-14 fuera del modo mock y sin la dependencia 6 Importar al banco queda deshabilitado', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const { usuario } = await generarLote()
    await arreglarLasBloqueadas(usuario)
    expect(screen.getByRole('button', { name: 'Importar al banco' })).toBeDisabled()
  })

  it('CA-IMP-05 el aviso que bloquea la fila usa el color destructivo del sistema', async () => {
    await generarLote()
    expect(fila(1).getByText(TEXTO_ENUNCIADO_RECORTADO)).toHaveClass('text-destructive')
    expect(fila(2).getByText(TEXTO_ALTERNATIVAS_REPETIDAS)).toHaveClass('text-destructive')
    expect(fila(5).getByText(TEXTO_ENUNCIADO_CORTO)).toHaveClass('text-destructive')
  })
})
