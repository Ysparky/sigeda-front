import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_GENERICO, MENSAJE_SIN_CONEXION } from '@/lib/api/errors'
import { config } from '@/lib/config'
import { MENSAJE_DEPENDENCIA_PENDIENTE } from '@/lib/dependencias'
import {
  MENSAJE_DOCUMENTO_ELIMINADO,
  MENSAJE_DOCUMENTO_SUBIDO,
  TEXTO_ARCHIVO_RECHAZADO,
  TEXTO_ARCHIVO_VACIO,
  TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO,
  TEXTO_DOCUMENTO_CON_ERROR,
  TEXTO_DOCUMENTO_SIGUE_PROCESANDO,
  TEXTO_DOCUMENTOS_COMPARTIDOS,
  TEXTO_SIN_DOCUMENTOS,
} from '@/lib/dominio/aprendizaje'
import { errorNest, malaPeticion } from '@/mocks/ia/comun'
import {
  C13_ARCHIVO_GRANDE as C13_DEL_MOCK,
  C1_SIN_ARCHIVO as C1_DEL_MOCK,
  C3_DOCUMENTO_NO_ENCONTRADO as C3_DEL_MOCK,
} from '@/mocks/ia/documentos'
import { server } from '@/mocks/server'
import { iniciarComo, renderApp } from '@/test/render'
import { relojFalso } from '@/test/tiempo'
import { C1_SIN_ARCHIVO, C4_SIN_TEXTO_LEGIBLE } from './mensajes'
import { INTERVALO_DE_CONSULTA, LIMITE_DE_CONSULTAS } from './documentos-page'

const RUTA_DOCUMENTOS = `${config.iaApiUrl}/documents`

function filas() {
  return within(screen.getByRole('table', { name: 'Documentos de estudio' }))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell').slice(0, 6).map((celda) => celda.textContent))
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

async function abrirDocumentos(usuarioDePrueba?: ReturnType<typeof userEvent.setup>) {
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
      ['Procedimientos de emergencia.docx', 'DOCX', '180.0 KB', 'Listo', 'emergenciasautorrotación', '18/09/2026'],
      ['PDI EA-510 Título III.pdf', 'PDF', '2.3 MB', 'Listo', 'instrucciónmaniobras', '18/09/2026'],
    ])
  })

  /**
   * `TableCell` trae `whitespace-nowrap`, así que una lista larga de etiquetas ensanchaba la tabla
   * sin tope y metía la página entera en scroll horizontal — con el encabezado y el botón de subir
   * desalineados del resto. Cada etiqueta es ahora su propio elemento dentro de una lista que
   * envuelve, y por eso el texto de la celda ya no lleva comas.
   */
  it('CA-DOC-01 cada etiqueta es un elemento propio, para que la celda pueda envolver', async () => {
    await abrirDocumentos()
    const fila = screen.getByRole('row', { name: /Procedimientos de emergencia\.docx/ })
    const etiquetas = within(fila).getAllByRole('listitem')
    expect(etiquetas.map((item) => item.textContent)).toEqual(['emergencias', 'autorrotación'])
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

  it('CA-DOC-06 una consulta fallida cuenta para el límite y no vacía la tabla', async () => {
    let consultas = 0
    server.use(
      http.get(RUTA_DOCUMENTOS, () => {
        consultas += 1
        if (consultas === 2) {
          return HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 })
        }
        return HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-000000000006',
            filename: 'Reglamento de operaciones.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3_145_728,
            status: 'processing',
            errorMessage: null,
            tags: [],
            createdAt: '2026-09-19T08:00:00.000Z',
            processedAt: null,
          },
        ])
      }),
    )
    const { usuario, avanzar } = relojFalso()
    await abrirDocumentos(usuario)
    expect(filas()).toHaveLength(1)
    await avanzar(INTERVALO_DE_CONSULTA)
    await waitFor(() => expect(consultas).toBe(2))
    expect(filas()[0]).toEqual(['Reglamento de operaciones.pdf', 'PDF', '3.0 MB', 'Procesando', '—', '19/09/2026'])
    expect(screen.queryByText('No se pudieron cargar los documentos')).not.toBeInTheDocument()
    for (let vuelta = 2; vuelta < LIMITE_DE_CONSULTAS + 3; vuelta += 1) await avanzar(INTERVALO_DE_CONSULTA)
    expect(await screen.findByText(TEXTO_DOCUMENTO_SIGUE_PROCESANDO)).toBeInTheDocument()
    expect(consultas).toBe(LIMITE_DE_CONSULTAS)
    expect(filas()).toHaveLength(1)
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

describe('Subir y eliminar documentos', () => {
  function archivo(nombre = 'Apuntes nuevos.txt', tipo = 'text/plain', bytes = 32) {
    return new File([new Uint8Array(bytes)], nombre, { type: tipo })
  }

  async function abrirDialogo(usuario: ReturnType<typeof renderApp>['usuario']) {
    await usuario.click(screen.getAllByRole('button', { name: 'Subir documento' })[0]!)
    return within(await screen.findByRole('dialog'))
  }

  it('CA-DOC-01 el estado vacío ofrece Subir documento', async () => {
    server.use(http.get(RUTA_DOCUMENTOS, () => HttpResponse.json([])))
    await iniciarComo('alumno.lopez')
    const { usuario } = renderApp('/aprendizaje')
    expect(await screen.findByText(TEXTO_SIN_DOCUMENTOS)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Subir documento' })).toHaveLength(2)
    const dialogo = await abrirDialogo(usuario)
    expect(dialogo.getByLabelText('Archivo')).toBeInTheDocument()
  })

  it('CA-DOC-02 y CA-DOC-04 un TXT válido se sube y aparece como Procesando', async () => {
    const { usuario, avanzar } = relojFalso()
    await abrirDocumentos(usuario)
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await screen.findByText(MENSAJE_DOCUMENTO_SUBIDO)).toBeInTheDocument()
    await waitFor(() => expect(filas()[0]?.[0]).toBe('Apuntes nuevos.txt'))
    expect(filas()[0]?.[3]).toBe('Procesando')
    await avanzar(INTERVALO_DE_CONSULTA)
    await avanzar(INTERVALO_DE_CONSULTA)
    await waitFor(() => expect(filas()[0]?.[3]).toBe('Listo'))
  })

  it('CA-DOC-02 un archivo de otro tipo se rechaza en el navegador con A11 y no se envía', async () => {
    let subidas = 0
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () => {
        subidas += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { usuario } = await abrirDocumentos(userEvent.setup({ applyAccept: false }))
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo('foto.png', 'image/png'))
    expect(await dialogo.findAllByText(TEXTO_ARCHIVO_RECHAZADO)).toHaveLength(2)
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(subidas).toBe(0)
    expect(dialogo.getByText('foto.png')).toBeInTheDocument()
  })

  it('CA-DOC-02 un archivo de más de 25 MB se rechaza en el navegador y no se envía', async () => {
    let subidas = 0
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () => {
        subidas += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo('Manual.pdf', 'application/pdf', 26 * 1024 * 1024))
    expect(await dialogo.findAllByText(TEXTO_ARCHIVO_RECHAZADO)).toHaveLength(2)
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(subidas).toBe(0)
  })

  it('M3-6 un archivo vacío se rechaza en el navegador con A17 y no se envía', async () => {
    let subidas = 0
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () => {
        subidas += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo('Apuntes vacíos.txt', 'text/plain', 0))
    expect(await dialogo.findByText(TEXTO_ARCHIVO_VACIO)).toBeInTheDocument()
    expect(dialogo.getAllByText(TEXTO_ARCHIVO_RECHAZADO)).toHaveLength(1)
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(subidas).toBe(0)
  })

  it('CA-DOC-03 el mensaje del servidor se muestra y la selección se conserva', async () => {
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () =>
        HttpResponse.json({ statusCode: 400, message: C1_SIN_ARCHIVO, error: 'Bad Request' }, { status: 400 }),
      ),
    )
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await dialogo.findByText(C1_SIN_ARCHIVO)).toBeInTheDocument()
    expect(dialogo.getByText('Apuntes nuevos.txt')).toBeInTheDocument()
  })

  it('CA-DOC-09 una caída de red informa la falta de conexión y conserva el archivo', async () => {
    server.use(http.post(`${RUTA_DOCUMENTOS}/upload`, () => HttpResponse.error()))
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await dialogo.findByText(MENSAJE_SIN_CONEXION)).toBeInTheDocument()
    expect(dialogo.getByText('Apuntes nuevos.txt')).toBeInTheDocument()
  })

  it('CA-DOC-05 un mensaje del servidor que no está en el contrato se reemplaza al subir', async () => {
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () =>
        HttpResponse.json(
          { statusCode: 400, message: ['file must be a valid MIME type'], error: 'Bad Request' },
          { status: 400 },
        ),
      ),
    )
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await dialogo.findByText(MENSAJE_GENERICO)).toBeInTheDocument()
    expect(dialogo.queryByText(/must be a valid MIME type/)).not.toBeInTheDocument()
  })

  it('contrato §5 el C1 definido en el mock llega a la pantalla tal cual', async () => {
    server.use(http.post(`${RUTA_DOCUMENTOS}/upload`, () => malaPeticion(C1_DEL_MOCK)))
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await dialogo.findByText(C1_DEL_MOCK)).toBeInTheDocument()
    expect(dialogo.queryByText(MENSAJE_GENERICO)).not.toBeInTheDocument()
  })

  it('contrato §5 el C13 definido en el mock llega a la pantalla tal cual', async () => {
    server.use(
      http.post(`${RUTA_DOCUMENTOS}/upload`, () => errorNest(413, C13_DEL_MOCK, 'Payload Too Large')),
    )
    const { usuario } = await abrirDocumentos()
    const dialogo = await abrirDialogo(usuario)
    await usuario.upload(dialogo.getByLabelText('Archivo'), archivo())
    await usuario.click(dialogo.getByRole('button', { name: 'Subir' }))
    expect(await dialogo.findByText(C13_DEL_MOCK)).toBeInTheDocument()
    expect(dialogo.queryByText(MENSAJE_GENERICO)).not.toBeInTheDocument()
  })

  it('contrato §5 el C3 definido en el mock llega a la pantalla tal cual', async () => {
    server.use(
      http.get(RUTA_DOCUMENTOS, () =>
        HttpResponse.json([
          {
            id: 'd0c00000-0000-4000-8000-0000000000ff',
            filename: 'Apunte ya eliminado.txt',
            mimeType: 'text/plain',
            sizeBytes: 2048,
            status: 'ready',
            errorMessage: null,
            tags: [],
            createdAt: '2026-09-19T08:00:00.000Z',
            processedAt: '2026-09-19T08:00:30.000Z',
          },
        ]),
      ),
    )
    const { usuario } = await abrirDocumentos()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Apunte ya eliminado.txt' }))
    const confirmacion = within(await screen.findByRole('alertdialog'))
    await usuario.click(confirmacion.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText(C3_DEL_MOCK)).toBeInTheDocument()
    expect(screen.queryByText(MENSAJE_GENERICO)).not.toBeInTheDocument()
  })

  it('CA-DOC-07 eliminar pide confirmación con A13 y quita el documento de la lista', async () => {
    const { usuario } = await abrirDocumentos()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar PDI EA-510 Título III.pdf' }))
    const confirmacion = within(await screen.findByRole('alertdialog'))
    expect(confirmacion.getByText(TEXTO_CONFIRMAR_ELIMINAR_DOCUMENTO)).toBeInTheDocument()
    await usuario.click(confirmacion.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText(MENSAJE_DOCUMENTO_ELIMINADO)).toBeInTheDocument()
    await waitFor(() => expect(filas().some((fila) => fila[0] === 'PDI EA-510 Título III.pdf')).toBe(false))
  })

  it('CA-DOC-10 fuera del modo mock y sin la dependencia 39 subir y eliminar están deshabilitados', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    await abrirDocumentos()
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar PDI EA-510 Título III.pdf' })).toBeDisabled()
    expect(screen.getAllByText(MENSAJE_DEPENDENCIA_PENDIENTE).length).toBeGreaterThan(1)
  })

  it('CA-DOC-10 en modo mock subir y eliminar están disponibles y A1 no aparece', async () => {
    await abrirDocumentos()
    expect(screen.getByRole('button', { name: 'Subir documento' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Eliminar PDI EA-510 Título III.pdf' })).toBeEnabled()
    expect(screen.queryByText(MENSAJE_DEPENDENCIA_PENDIENTE)).not.toBeInTheDocument()
    expect(screen.queryByText(TEXTO_DOCUMENTOS_COMPARTIDOS)).not.toBeInTheDocument()
  })
})
