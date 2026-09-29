import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { ayudanteDeColumnas } from './columnas-tabla'
import { DataTable } from './data-table'

type Fila = { id: number; nombre: string; fecha: string }

const ayudante = ayudanteDeColumnas<Fila>()
const COLUMNAS = ayudante.columns([
  ayudante.accessor('nombre', { header: 'Nombre', enableSorting: true }),
  ayudante.accessor('fecha', { header: 'Fecha' }),
])

const PAGINA: Pagina<Fila> = {
  items: [
    { id: 1, nombre: 'Control Básico Inicial', fecha: '2024-03-01' },
    { id: 2, nombre: 'Control Básico Intermedio', fecha: '2024-03-08' },
  ],
  page: 0,
  size: 2,
  total: 3,
  totalPages: 2,
}

function Prueba({
  alCambiar,
  pagina = PAGINA,
  page = 0,
}: {
  alCambiar: (cambios: Partial<ParametrosPagina>) => void
  pagina?: Pagina<Fila>
  page?: number
}) {
  const [parametros, setParametros] = useState<ParametrosPagina>({ page, size: 2, direction: 'ASC' })
  return (
    <DataTable
      etiqueta="Turnos"
      columnas={COLUMNAS}
      pagina={pagina}
      cargando={false}
      parametros={parametros}
      alCambiar={(cambios) => {
        alCambiar(cambios)
        setParametros((previos) => ({ ...previos, ...cambios }))
      }}
      vacio={<p>Sin turnos</p>}
      idDeFila={(fila) => String(fila.id)}
    />
  )
}

describe('DataTable', () => {
  it('muestra las filas y el resumen de la paginación del servidor', () => {
    render(<Prueba alCambiar={vi.fn()} />)
    const tabla = screen.getByRole('table', { name: 'Turnos' })
    expect(within(tabla).getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('Página 1 de 2 · 3 registros')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })

  it('pide la página siguiente', async () => {
    const alCambiar = vi.fn()
    render(<Prueba alCambiar={alCambiar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(alCambiar).toHaveBeenCalledWith({ page: 1, size: 2 })
  })

  it('ordena solo por las columnas habilitadas y alterna la dirección', async () => {
    const alCambiar = vi.fn()
    render(<Prueba alCambiar={alCambiar} />)
    expect(screen.queryByRole('button', { name: /Fecha/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(alCambiar).toHaveBeenLastCalledWith({ property: 'nombre', direction: 'ASC', page: 0 })
    expect(screen.getByRole('columnheader', { name: /Nombre/ })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(alCambiar).toHaveBeenLastCalledWith({ property: 'nombre', direction: 'DESC', page: 0 })
  })

  it('muestra el estado vacío cuando no hay filas', () => {
    render(<Prueba alCambiar={vi.fn()} pagina={{ items: [], page: 0, size: 2, total: 0, totalPages: 0 }} />)
    expect(screen.getByText('Sin turnos')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Volver a la primera página' })).not.toBeInTheDocument()
  })

  it('ofrece volver a la primera página cuando la página pedida quedó fuera de rango', async () => {
    const alCambiar = vi.fn()
    render(<Prueba alCambiar={alCambiar} page={2} pagina={{ items: [], page: 2, size: 2, total: 3, totalPages: 2 }} />)
    expect(screen.getByText('Sin turnos')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver a la primera página' }))
    expect(alCambiar).toHaveBeenCalledWith({ page: 0 })
  })
})
