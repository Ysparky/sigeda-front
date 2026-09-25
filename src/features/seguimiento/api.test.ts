import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { permisosDeRol } from '@/lib/auth/permisos'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import {
  estadoTeoricoEnLote,
  fuenteDeSeguimiento,
  listarSeguimiento,
  paginarAlumnos,
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
