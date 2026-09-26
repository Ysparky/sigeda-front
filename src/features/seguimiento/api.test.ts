import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { listarEvaluaciones } from '@/features/evaluaciones/api'
import { ApiError } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { permisosDeRol } from '@/lib/auth/permisos'
import { config } from '@/lib/config'
import { mediaSimple } from '@/lib/dominio/seguimiento'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import {
  estadoTeoricoEnLote,
  fuenteDeSeguimiento,
  listarAlertas,
  listarChequeos,
  listarDesaprobados,
  listarHistorialTeorico,
  listarSeguimiento,
  obtenerAlumno,
  obtenerReporteDeSubfase,
  paginarAlumnos,
  listarPromediosDeSubfase,
  MENSAJE_CODIGO_INVALIDO,
  type AlumnoSeguimiento,
  type FiltrosEscuadron,
} from './api'

const PARAMETROS: FiltrosEscuadron = { programa: 'PDI', page: 0, size: 10, direction: 'ASC' }

const ALUMNOS: AlumnoSeguimiento[] = [
  { codigo: '111111', nombreCompleto: 'Oscar Lopez Chaparro', idGrupo: 1, estado: 'Apto' },
  { codigo: '777777', nombreCompleto: 'Carlos Ramirez Sanchez', idGrupo: 4, estado: 'En Chequeo' },
  { codigo: '666666', nombreCompleto: 'Ana Torres Martinez', idGrupo: 3, estado: 'Apto' },
  { codigo: '654321', nombreCompleto: 'Lucía Mendoza Ríos', idGrupo: null, estado: 'Apto' },
]

function contarPeticiones() {
  let total = 0
  const oyente = () => {
    total += 1
  }
  server.events.on('request:start', oyente)
  return {
    total: () => total,
    detener: () => server.events.removeListener('request:start', oyente),
  }
}

describe('catálogo de seguimiento', () => {
  it('M5-6 la escalera tiene dos peldaños y el jefe de operaciones cae en el del instructor', () => {
    expect(fuenteDeSeguimiento(permisosDeRol('Comandante de Escuadrón'))).toBe('todos')
    expect(fuenteDeSeguimiento(permisosDeRol('Administrador Web'))).toBe('todos')
    expect(fuenteDeSeguimiento(permisosDeRol('Instructor'))).toBe('instructor')
    expect(fuenteDeSeguimiento(permisosDeRol('Jefe de Operaciones'))).toBe('instructor')
    expect(fuenteDeSeguimiento(permisosDeRol('Alumno'))).toBeNull()
  })

  it('contrato §1.1 con View All Groups arma la lista con los alumnos de todos los grupos del programa', async () => {
    await iniciarComo('comandante.aguirre')
    const alumnos = await listarSeguimiento('todos', 'PDI', '222444')
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '222222', '555555', '666666', '777777', '999999'])
  })

  it('M5-6 conserva el estado y el idGrupo que listarAlumnos descarta', async () => {
    await iniciarComo('comandante.aguirre')
    const alumnos = await listarSeguimiento('todos', 'PDI', '222444')
    expect(alumnos.find((alumno) => alumno.codigo === '777777')).toEqual({
      codigo: '777777',
      nombreCompleto: 'Carlos Ramirez Sanchez',
      idGrupo: 4,
      estado: 'En Chequeo',
    })
  })

  it('contrato §1.2 el catálogo del instructor da una fila por alumno y turno y la capa deduplica', async () => {
    await iniciarComo('instructor.perez')
    const crudo = await sigeda.pagina<{ persona: unknown[] }>('/api/grupos/instructor/444444/programa/PDI', {
      page: 0,
      size: 10,
    })
    expect(crudo.items).toHaveLength(6)
    expect(crudo.total).toBe(6)
    const alumnos = await listarSeguimiento('instructor', 'PDI', '444444')
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '222222', '555555', '666666'])
  })

  it('contrato §1.2 recorre todas las páginas que informa el servidor', async () => {
    await iniciarComo('instructor.perez')
    const pedidas: string[] = []
    server.use(
      http.get(`${config.sigedaApiUrl}/api/grupos/instructor/:cod/programa/:nombre`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '0'
        pedidas.push(page)
        const codigo = page === '0' ? '111111' : '999999'
        return HttpResponse.json({
          content: [{ persona: [{ codigo, nombre: 'Uno', aPaterno: 'Dos', aMaterno: 'Tres', idGrupo: 1, estado: 'Apto' }] }],
          totalElements: 2,
          totalPages: 2,
          size: 10,
          number: Number(page),
        })
      }),
    )
    const alumnos = await listarSeguimiento('instructor', 'PDI', '444444')
    expect(pedidas).toEqual(['0', '1'])
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '999999'])
  })

  it('M5-6 recorre el catálogo del instructor de a 100, como el picker de M1', async () => {
    await iniciarComo('instructor.perez')
    const tamanos: (string | null)[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api/grupos/instructor/')) tamanos.push(url.searchParams.get('size'))
    })
    await listarSeguimiento('instructor', 'PDI', '444444')
    server.events.removeAllListeners('request:start')
    expect(tamanos).toEqual(['100'])
  })

  it('contrato §1.2 un instructor sin alumnos recibe una lista vacía, no un error', async () => {
    await iniciarComo('jefe.operaciones')
    await expect(listarSeguimiento('instructor', 'PDI', '333333')).resolves.toEqual([])
  })

  it('M5-6 sin código de persona la fuente del instructor no pide nada', async () => {
    await iniciarComo('instructor.perez')
    const conteo = contarPeticiones()
    await expect(listarSeguimiento('instructor', 'PDI', null)).resolves.toEqual([])
    expect(conteo.total()).toBe(0)
    conteo.detener()
  })
})

describe('filtro, orden y paginado en el navegador', () => {
  it('M5-6 filtra por grupo, por estado y por texto del nombre', () => {
    expect(paginarAlumnos(ALUMNOS, { ...PARAMETROS, idGrupo: 3 }).items.map((alumno) => alumno.codigo)).toEqual(['666666'])
    expect(paginarAlumnos(ALUMNOS, { ...PARAMETROS, estado: 'En Chequeo' }).items.map((alumno) => alumno.codigo)).toEqual([
      '777777',
    ])
    expect(paginarAlumnos(ALUMNOS, { ...PARAMETROS, texto: 'mendoza' }).items.map((alumno) => alumno.codigo)).toEqual([
      '654321',
    ])
    expect(paginarAlumnos(ALUMNOS, { ...PARAMETROS, texto: 'RIOS' }).items.map((alumno) => alumno.codigo)).toEqual(['654321'])
  })

  it('M5-6 ordena por la columna pedida y el total cuenta alumnos, no filas del servidor', () => {
    const porNombre = paginarAlumnos(ALUMNOS, { ...PARAMETROS, property: 'nombreCompleto' })
    expect(porNombre.items.map((alumno) => alumno.codigo)).toEqual(['666666', '777777', '654321', '111111'])
    expect(porNombre.total).toBe(4)
    const porCodigoDesc = paginarAlumnos(ALUMNOS, { ...PARAMETROS, property: 'codigo', direction: 'DESC' })
    expect(porCodigoDesc.items.map((alumno) => alumno.codigo)).toEqual(['777777', '666666', '654321', '111111'])
  })

  it('M5-6 pagina en el navegador y una página fuera de rango queda vacía sin perder el total', () => {
    const primera = paginarAlumnos(ALUMNOS, { ...PARAMETROS, size: 3, property: 'codigo' })
    expect(primera.items.map((alumno) => alumno.codigo)).toEqual(['111111', '654321', '666666'])
    expect(primera.totalPages).toBe(2)
    const segunda = paginarAlumnos(ALUMNOS, { ...PARAMETROS, size: 3, page: 1, property: 'codigo' })
    expect(segunda.items.map((alumno) => alumno.codigo)).toEqual(['777777'])
    const cuarta = paginarAlumnos(ALUMNOS, { ...PARAMETROS, size: 3, page: 3, property: 'codigo' })
    expect(cuarta.items).toEqual([])
    expect(cuarta.total).toBe(4)
  })
})

describe('estado teórico en lote', () => {
  it('contrato §5.3 pide los códigos separados por comas y devuelve uno por alumno', async () => {
    await iniciarComo('instructor.perez')
    const estados = await estadoTeoricoEnLote(['555555', '666666'])
    expect(estados.map((estado) => estado.codAlumno)).toEqual(['555555', '666666'])
    expect(estados.every((estado) => !Object.hasOwn(estado, 'causales'))).toBe(true)
    expect(estados.find((estado) => estado.codAlumno === '666666')).toMatchObject({
      bloqueadoPorSubsanacion: true,
      alumno: 'Ana Torres Martinez',
    })
    expect(estados.find((estado) => estado.codAlumno === '555555')?.bloqueadoPorSubsanacion).toBe(false)
  })

  it('contrato §5.3 un código inexistente se omite y la lista vacía de resultados es 200', async () => {
    await iniciarComo('instructor.perez')
    await expect(estadoTeoricoEnLote(['666666', '000000'])).resolves.toHaveLength(1)
    await expect(estadoTeoricoEnLote(['000000'])).resolves.toEqual([])
  })

  it('contrato §5.3 sin códigos no pide nada y con más de cien el servidor responde D16', async () => {
    await iniciarComo('instructor.perez')
    const conteo = contarPeticiones()
    await expect(estadoTeoricoEnLote([])).resolves.toEqual([])
    expect(conteo.total()).toBe(0)
    conteo.detener()
    const muchos = Array.from({ length: 101 }, (_, indice) => String(indice).padStart(6, '0'))
    await expect(estadoTeoricoEnLote(muchos)).rejects.toBeInstanceOf(ApiError)
    await expect(estadoTeoricoEnLote(muchos)).rejects.toMatchObject({
      status: 400,
      erroresDeCampo: { codAlumnos: 'No se pueden consultar más de 100 alumnos a la vez.' },
    })
  })
})

const fuentes = import.meta.glob<string>('/src/features/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })

describe('el agujero de desaprobados se expone, nunca se explota', () => {
  it('CA-ALE-06 la capa de API rechaza un codPersona que no tenga exactamente seis caracteres', async () => {
    await iniciarComo('instructor.perez')
    await expect(listarDesaprobados('7')).rejects.toThrow(MENSAJE_CODIGO_INVALIDO)
    await expect(listarDesaprobados('7777777')).rejects.toThrow(MENSAJE_CODIGO_INVALIDO)
    await expect(listarDesaprobados('')).rejects.toThrow(MENSAJE_CODIGO_INVALIDO)
    await expect(listarDesaprobados('777777')).resolves.toHaveLength(3)
  })

  it('CA-ALE-06 ninguna pantalla llama a un endpoint de desaprobados sin permiso declarado', () => {
    const referencias = Object.entries(fuentes)
      .filter(([archivo]) => !archivo.includes('.test.'))
      .flatMap(([archivo, fuente]) =>
        [...fuente.matchAll(/\/api\/desaprobados[^`'"]*/g)].map((coincidencia) => [archivo, coincidencia[0]] as const),
      )
    expect(referencias.length).toBeGreaterThan(0)
    expect(referencias.filter(([, ruta]) => !ruta.startsWith('/api/desaprobados/persona/'))).toEqual([])
  })
})

describe('lo que el legajo lee sin pedir nada nuevo', () => {
  it('contrato §6.1 el legajo normaliza las claves raras de DetallePersona', async () => {
    await iniciarComo('instructor.perez')
    await expect(obtenerAlumno('777777')).resolves.toEqual({
      dni: '78901234',
      nombre: 'Carlos',
      aPaterno: 'Ramirez',
      aMaterno: 'Sanchez',
      rango: 'Mayor',
      estado: 'En Chequeo',
      usuario: { nombre: 'alumno.ramirez', correo: 'alumno5@sigeda.com' },
    })
  })

  it('contrato §6.3 el historial práctico se lee con el reader de M1, sin uno nuevo', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await listarEvaluaciones('777777', { programa: 'PDI', page: 0, size: 10, direction: 'ASC' })
    expect(pagina.items).toHaveLength(5)
    expect(pagina.items[0]).toMatchObject({ codigo: '777777-1', promedio: 12, clasificacion: 'Malo' })
  })

  it('contrato §9.9 las tres medias simples del contrato son 13.00, 14.50 y 16.00', async () => {
    await iniciarComo('instructor.perez')
    const media = async (idSubfase: number, cod: string) =>
      mediaSimple(
        (await listarPromediosDeSubfase(idSubfase, cod)).flatMap((fila) => (fila.promedio === null ? [] : [fila.promedio])),
      )
    expect(await media(3, '777777')).toBe(13)
    expect(await media(1, '555555')).toBe(14.5)
    expect(await media(1, '999999')).toBe(16)
  })

  it('contrato §9.9 un reporte sin evaluaciones llega como null y su texto no se muestra', async () => {
    await iniciarComo('instructor.perez')
    await expect(obtenerReporteDeSubfase(2, '555555')).resolves.toBeNull()
    const reporte = await obtenerReporteDeSubfase(3, '777777')
    expect(reporte?.notas[0]?.promedio).toBe(12)
    expect(reporte?.maniobras).toHaveLength(2)
  })
})

describe('chequeos e historial teórico desde la capa de API', () => {
  it('contrato §6.2 los chequeos llegan como una línea de tiempo por fecha', async () => {
    await iniciarComo('instructor.perez')
    const chequeos = await listarChequeos('999999')
    expect(chequeos.map((chequeo) => chequeo.codigo)).toEqual(['999999-2'])
    expect(chequeos[0]?.contadores.evaluaciones).toBe(7)
    await expect(listarChequeos('777777')).resolves.toEqual([])
  })

  it('contrato §5.2 el historial teórico conserva los dos punteros de la subsanación', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await listarHistorialTeorico('999999', { page: 0, size: 10, direction: 'DESC' })
    expect(pagina.items.map((fila) => fila.nota)).toEqual([17, 10])
    expect(pagina.items[1]?.subsanadoPor?.nota).toBe(17)
    expect(pagina.items[0]?.idTurnoOrigen).toBe(6)
  })
})

describe('capa de API de alertas', () => {
  it('contrato §2.1 pagina las alertas y conserva sus punteros', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await listarAlertas({ programa: 'PDI', page: 0, size: 10, direction: 'ASC' })
    expect(pagina.total).toBe(13)
    expect(pagina.totalPages).toBe(2)
    expect(pagina.items[0]).toMatchObject({ tipo: 'SUBSANACION_PENDIENTE', severidad: 'ALTA' })
    const segunda = await listarAlertas({ programa: 'PDI', page: 1, size: 10, direction: 'ASC' })
    expect(segunda.items).toHaveLength(3)
  })

  it('contrato §2.1 una lista vacía llega como página vacía, no como error', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await listarAlertas({ programa: 'PDE', page: 0, size: 10, direction: 'ASC' })
    expect(pagina.items).toEqual([])
    expect(pagina.total).toBe(0)
  })
})
