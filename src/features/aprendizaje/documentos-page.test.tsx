import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { TEXTO_DOCUMENTO_CON_ERROR, TEXTO_DOCUMENTO_SIGUE_PROCESANDO, TEXTO_SIN_DOCUMENTOS } from '@/lib/dominio/aprendizaje'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { C4_SIN_TEXTO_LEGIBLE } from './mensajes'
import { INTERVALO_DE_CONSULTA, LIMITE_DE_CONSULTAS } from './documentos-page'

const RUTA_DOCUMENTOS = `${config.iaApiUrl}/documents`

function filas() {
  return within(screen.getByRole('table', { name: 'Documentos de estudio' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
}

function contarConsultas() {
  let consultas = 0
  const contar = ({ request }: { request: Request }) => {
    if (request.method === 'GET' && request.url === RUTA_DOCUMENTOS) consultas += 1
  }
  server.events.on('request:start', contar)
  return {
    total: () => consultas,
    dejar: () => server.events.removeListener('request:start', contar),
  }
}

async function abrirDocumentos(usuarioDePrueba?: ReturnType<typeof relojFalso>['usuario']) {
  await iniciarComo('alumno.lopez')
  const vista = renderApp('/aprendizaje', usuarioDePrueba)
  await screen.findByRole('table', { name: 'Documentos de estudio' })
  return vista
}

describe('Documentos de estudio', () => {
  it('CA-DOC-01 muestra nombre, tipo, tamaño, estado, etiquetas y fecha, del más reciente al más antiguo', async () => {
    await abrirDocumentos()
    expect(filas()).toEqual([
      ['Reglamento de operaciones.pdf', 'PDF', '3.0 MB', 'Procesando', '—', '19/09/2026'],
      ['Apuntes de aerodinámica.txt', 'TXT', '12.0 KB', 'Procesando', '—', '19/09/2026'],
      [
        'Manual de vuelo escaneado.pdf',
        'PDF',
        '5.0 MB',
        `Error${C4_SIN_TEXTO_LEGIBLE}`,
        '—',
        '18/09/2026',
      ],
      ['Procedimientos de emergencia.docx', 'DOCX', '180.0 KB', 'Listo', 'emergencias, autorrotación', '18/09/2026'],
      ['PDI EA-510 Título III.pdf', 'PDF', '2.3 MB', 'Listo', 'instrucción, maniobras', '18/09/2026'],
    ])
  })

  it('CA-DOC-01 sin documentos muestra A14', async () => {
    server.use(http.get(RUTA_DOCUMENTOS, () => HttpResponse.json([])))
    await iniciarComo('alumno.lopez')
    renderApp('/aprendizaje')
    expect(await screen.findByText(TEXTO_SIN_DOCUMENTOS)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Documentos de estudio' })).not.toBeInTheDocument()
  })

  it('CA-DOC-05 un documento en Error muestra C4 y reemplaza cualquier otro motivo', async () => {
    server.use(
      http.get(RUTA_DOCUMENTOS, () =>
        HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-000000000003',
            filename: 'Manual de vuelo escaneado.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 5_242_880,
            status: 'error',
            errorMessage: 'pdf-parse: bad XRef entry at offset 91234',
            tags: [],
            createdAt: '2026-09-18T18:45:00.000Z',
            processedAt: null,
          },
        ]),
      ),
    )
    await abrirDocumentos()
    expect(screen.getByText(TEXTO_DOCUMENTO_CON_ERROR)).toBeInTheDocument()
    expect(screen.queryByText(/pdf-parse/)).not.toBeInTheDocument()
  })

  it('CA-DOC-08 la pantalla nunca muestra el texto extraído ni la ruta de almacenamiento', async () => {
    server.use(
      http.get(RUTA_DOCUMENTOS, () =>
        HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-000000000001',
            filename: 'PDI EA-510 Título III.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2_411_008,
            status: 'ready',
            errorMessage: null,
            tags: ['instrucción'],
            createdAt: '2026-09-18T14:02:11.000Z',
            processedAt: '2026-09-18T14:02:58.000Z',
            extractedText: 'TITULO III DE LA INSTRUCCION EN VUELO',
            storageKey: 'documentos/564984ee/pdi-titulo-iii.pdf',
            ownerId: '564984ee-448a-424f-b689-57a03b3ea108',
          },
        ]),
      ),
    )
    await abrirDocumentos()
    expect(screen.queryByText(/TITULO III DE LA INSTRUCCION/)).not.toBeInTheDocument()
    expect(screen.queryByText(/documentos\/564984ee/)).not.toBeInTheDocument()
    expect(screen.queryByText(/564984ee-448a/)).not.toBeInTheDocument()
  })

  it('CA-DOC-04 la lista se actualiza sola cada 3 segundos hasta que el documento queda Listo', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirDocumentos(usuario)
    expect(filas()[1]?.[3]).toBe('Procesando')
    await avanzar(INTERVALO_DE_CONSULTA)
    await avanzar(INTERVALO_DE_CONSULTA)
    await waitFor(() => expect(filas()[1]?.[3]).toBe('Listo'))
    expect(filas()[1]).toEqual(['Apuntes de aerodinámica.txt', 'TXT', '12.0 KB', 'Listo', 'aerodinámica', '19/09/2026'])
  })

  it('CA-DOC-04 sin filas en proceso no vuelve a consultar', async () => {
    server.use(
      http.get(RUTA_DOCUMENTOS, () =>
        HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-000000000001',
            filename: 'PDI EA-510 Título III.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2_411_008,
            status: 'ready',
            errorMessage: null,
            tags: [],
            createdAt: '2026-09-18T14:02:11.000Z',
            processedAt: '2026-09-18T14:02:58.000Z',
          },
        ]),
      ),
    )
    const consultas = contarConsultas()
    try {
      const { usuario, avanzar } = relojFalso()
      await abrirDocumentos(usuario)
      expect(consultas.total()).toBe(1)
      await avanzar(INTERVALO_DE_CONSULTA * 5)
      expect(consultas.total()).toBe(1)
    } finally {
      consultas.dejar()
    }
  })

  it('CA-DOC-06 tras 40 consultas seguidas se detiene y ofrece Actualizar', async () => {
    const consultas = contarConsultas()
    try {
      const { usuario, avanzar } = relojFalso()
      await abrirDocumentos(usuario)
      for (let vuelta = 1; vuelta < LIMITE_DE_CONSULTAS + 3; vuelta += 1) await avanzar(INTERVALO_DE_CONSULTA)
      expect(await screen.findByText(TEXTO_DOCUMENTO_SIGUE_PROCESANDO)).toBeInTheDocument()
      expect(consultas.total()).toBe(LIMITE_DE_CONSULTAS)
      await usuario.click(screen.getByRole('button', { name: 'Actualizar' }))
      await waitFor(() => expect(consultas.total()).toBe(LIMITE_DE_CONSULTAS + 1))
      await avanzar(INTERVALO_DE_CONSULTA * 5)
      expect(consultas.total()).toBe(LIMITE_DE_CONSULTAS + 1)
      expect(screen.getByText(TEXTO_DOCUMENTO_SIGUE_PROCESANDO)).toBeInTheDocument()
    } finally {
      consultas.dejar()
    }
  })
})
