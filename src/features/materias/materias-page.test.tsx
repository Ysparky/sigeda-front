import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { iniciarComo, renderApp } from '@/test/render'

async function abrirMaterias(username = 'comandante.aguirre') {
  await iniciarComo(username)
  const vista = renderApp('/programa/materias')
  await screen.findByRole('table', { name: 'Materias del curso' })
  return vista
}

function filas() {
  return within(screen.getByRole('table', { name: 'Materias del curso' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').slice(0, 4).map((celda) => celda.textContent))
}

describe('Materias', () => {
  it('CA-MAT-01 muestra nombre, nota mínima, coeficiente con 2 decimales y parte del curso', async () => {
    await abrirMaterias()
    expect(filas()[0]).toEqual(['Adoctrinamiento de Vuelo', '18.00', '0.22', 'Primera parte'])
    expect(filas()).toHaveLength(11)
  })

  it('CA-MAT-01 sin Manage Subjects solo se consultan', async () => {
    await abrirMaterias('jefe.operaciones')
    expect(screen.queryByRole('button', { name: 'Registrar materia' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Modificar/ })).not.toBeInTheDocument()
  })

  it('CA-MAT-02 registra una materia con todos sus datos', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Registrar materia' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Nombre'), 'Navegación Aérea')
    await usuario.type(dialogo.getByLabelText('Nota mínima'), '16')
    await usuario.type(dialogo.getByLabelText('Coeficiente'), '0.05')
    await usuario.selectOptions(dialogo.getByLabelText('Parte del curso'), 'Segunda parte')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar materia' }))
    expect(await screen.findByText('Materia guardada con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(filas().at(-1)).toEqual(['Navegación Aérea', '16.00', '0.05', 'Segunda parte']))
  })

  it('CA-MAT-02 valida la nota mínima, el coeficiente y el nombre', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Registrar materia' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Nombre'), 'AB')
    await usuario.type(dialogo.getByLabelText('Nota mínima'), '25')
    await usuario.type(dialogo.getByLabelText('Coeficiente'), '1.5')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar materia' }))
    expect(await dialogo.findByText('El nombre debe tener entre 3 y 60 caracteres.')).toBeInTheDocument()
    expect(dialogo.getByText('La nota mínima debe ser un entero entre 0 y 20.')).toBeInTheDocument()
    expect(dialogo.getByText('El coeficiente debe estar entre 0 y 1, con hasta 2 decimales.')).toBeInTheDocument()
  })

  it('CA-MAT-03 un nombre repetido se muestra bajo su campo', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Registrar materia' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await usuario.type(dialogo.getByLabelText('Nombre'), 'Meteorología')
    await usuario.type(dialogo.getByLabelText('Nota mínima'), '16')
    await usuario.type(dialogo.getByLabelText('Coeficiente'), '0.04')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar materia' }))
    expect(await dialogo.findByText('Ya existe una materia con ese nombre.')).toBeInTheDocument()
  })

  it('CA-MAT-02 modifica una materia existente', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Modificar Meteorología' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getByLabelText('Nota mínima')).toHaveValue('16')
    await usuario.clear(dialogo.getByLabelText('Nota mínima'))
    await usuario.type(dialogo.getByLabelText('Nota mínima'), '18')
    await usuario.click(dialogo.getByRole('button', { name: 'Guardar materia' }))
    expect(await screen.findByText('Materia guardada con éxito.')).toBeInTheDocument()
    await waitFor(() =>
      expect(filas().find((fila) => fila[0] === 'Meteorología')).toEqual(['Meteorología', '18.00', '0.04', 'Primera parte']),
    )
  })

  it('CA-MAT-04 eliminar pide confirmación y explica cuando la materia tiene preguntas', async () => {
    const { usuario } = await abrirMaterias()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Adoctrinamiento de Vuelo' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(
      await screen.findByText('La materia no se puede eliminar, tiene preguntas o turnos teóricos.'),
    ).toBeInTheDocument()
    expect(filas().some((fila) => fila[0] === 'Adoctrinamiento de Vuelo')).toBe(true)
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Meteorología' }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('Materia eliminado con éxito.')).toBeInTheDocument()
    await waitFor(() => expect(filas().some((fila) => fila[0] === 'Meteorología')).toBe(false))
  })
})
