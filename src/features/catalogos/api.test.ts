import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { sigeda } from '@/lib/api/sigeda'
import { permisosDeRol } from '@/lib/auth/permisos'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import {
  agruparPorGrupo,
  fuenteDeAlumnos,
  listarAeronaves,
  listarAlumnos,
  listarInstructores,
  listarManiobrasDeSubfase,
  listarMisionesDeSubfase,
  listarSubfases,
} from './api'

describe('catálogos para turnos y evaluaciones', () => {
  it('lista las sub fases del programa', async () => {
    await iniciarComo('jefe.operaciones')
    const subfases = await listarSubfases()
    expect(subfases.map((subfase) => subfase.nombre)).toEqual([
      'Contacto',
      'Navegación',
      'Instrumentos',
      'Campos Extraños',
      'Formación',
    ])
  })

  it('CA-TUR-05 lista las maniobras de una sub fase y trata el 404 como lista vacía', async () => {
    await iniciarComo('jefe.operaciones')
    expect((await listarManiobrasDeSubfase(4)).map((maniobra) => maniobra.nombre)).toEqual(['Maniobra 7', 'Maniobra 8'])
    await expect(listarManiobrasDeSubfase(1)).resolves.toEqual([])
  })

  // Los cuatro valores salen de la respuesta del servidor vivo, no del contrato:
  // GET /api/subfases/1/misiones -> C-1..C-7, 1.0 h, coeficiente 0.1429 en las siete;
  // GET /api/subfases/2/misiones -> N/I-1..N/I-6 a 0.15 y N/I-7 a 0.1 (1.0 h contra 1.5).
  it('dependencia 62 lista el catálogo de misiones de la sub fase con su coeficiente derivado', async () => {
    await iniciarComo('jefe.operaciones')
    const contacto = await listarMisionesDeSubfase(1)
    expect(contacto.map((mision) => mision.codigo)).toEqual(['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7'])
    expect(contacto[0]).toEqual({ id: 1, codigo: 'C-1', horas: 1, coeficiente: 0.1429 })
    // La única misión del bloque N/I que no vale 1.5 h: si el coeficiente se hubiera guardado en vez
    // de derivarse de las horas, esta es la fila donde se notaría.
    const navegacion = await listarMisionesDeSubfase(2)
    expect(navegacion.map((mision) => mision.coeficiente)).toEqual([0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.1])
    expect(navegacion.at(-1)).toEqual({ id: 14, codigo: 'N/I-7', horas: 1, coeficiente: 0.1 })
  })

  it('dependencia 62 la sub fase sin misiones da 200 con lista vacía, y la que no existe da 404', async () => {
    await iniciarComo('admin.sistema')
    // Una sub fase recién creada no tiene misiones: el servidor devuelve `200 []`, porque «todavía no
    // tiene misiones» no es «no existe». El 404 queda sólo para la sub fase inexistente.
    const fase = await sigeda.post<{ subfases: { id: number; nombre: string }[] }>('/api/fases', {
      nombre: 'Fase de prueba',
      descripcion: 'Creada para comprobar el catálogo vacío',
      subfases: [{ nombre: 'Sub fase sin misiones', descripcion: 'Sin misiones sembradas' }],
    })
    const idNueva = fase.subfases[0]?.id ?? 0
    expect(idNueva).toBeGreaterThan(5)
    await expect(sigeda.get(`/api/subfases/${idNueva}/misiones`)).resolves.toEqual([])
    await expect(sigeda.get('/api/subfases/999/misiones')).rejects.toMatchObject({
      status: 404,
      message: 'No existe información de subfase.',
    })
    // `sigeda.lista` degrada el 404 a lista vacía, que para un selector es lo correcto: no hay
    // misiones que ofrecer. La distinción de estado sigue estando y se comprueba arriba.
    await expect(listarMisionesDeSubfase(999)).resolves.toEqual([])
  })

  it('CA-TUR-08 trae el estado de cada aeronave', async () => {
    await iniciarComo('jefe.operaciones')
    expect(await listarAeronaves()).toEqual([
      { id: 2, nombre: 'Enstrom 280FX', estado: 'En_Mantenimiento' },
      { id: 1, nombre: 'Robinson R22', estado: 'Disponible' },
      { id: 3, nombre: 'Schweizer S-300C', estado: 'No_Disponible' },
    ])
  })

  it('lista los instructores del programa', async () => {
    await iniciarComo('jefe.operaciones')
    expect(await listarInstructores('PDI')).toEqual([
      { codigo: '444444', nombreCompleto: 'Juan Torres Perez' },
      { codigo: '888888', nombreCompleto: 'Maria Flores Mendoza' },
    ])
    await expect(listarInstructores('PDE')).resolves.toEqual([])
  })
})

describe('M1-9 selector de alumnos por rol', () => {
  it('elige la fuente según los permisos del rol', () => {
    expect(fuenteDeAlumnos(permisosDeRol('Administrador Web'))).toBe('todos')
    expect(fuenteDeAlumnos(permisosDeRol('Comandante de Escuadrón'))).toBe('todos')
    expect(fuenteDeAlumnos(permisosDeRol('Jefe de Operaciones'))).toBe('programacion')
    expect(fuenteDeAlumnos(permisosDeRol('Instructor'))).toBe('instructor')
    expect(fuenteDeAlumnos(permisosDeRol('Alumno'))).toBeNull()
  })

  it('Comandante y Administrador ven a los alumnos de todos los grupos', async () => {
    await iniciarComo('admin.sistema')
    const alumnos = await listarAlumnos('todos', 'PDI', null)
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '222222', '555555', '666666', '777777', '999999'])
    expect(alumnos[0]).toEqual({ codigo: '111111', nombreCompleto: 'Oscar Lopez Chaparro', grupo: 'Grupo 1' })
  })

  it('Jefe de Operaciones ve a los alumnos agrupados por grupo', async () => {
    await iniciarComo('jefe.operaciones')
    const alumnos = await listarAlumnos('programacion', 'PDI', null)
    expect(alumnos.find((alumno) => alumno.codigo === '666666')).toEqual({
      codigo: '666666',
      nombreCompleto: 'Ana Torres Martinez',
      grupo: 'Grupo 3',
    })
  })

  it('el Instructor ve a los alumnos de sus turnos', async () => {
    await iniciarComo('instructor.mendoza')
    const alumnos = await listarAlumnos('instructor', 'PDI', '888888')
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['777777', '999999'])
  })

  it('el catálogo del instructor publica `persona` como objeto, no como arreglo de uno', async () => {
    // La proyección declaraba `List<Alumno>` sobre un `@OneToOne` y el frontend tenía que aceptar las
    // dos formas a la vez. La tanda G alineó el servidor con la relación; esto lo fija de este lado.
    await iniciarComo('instructor.mendoza')
    const pagina = await sigeda.pagina<{ persona: unknown }>('/api/grupos/instructor/888888/programa/PDI', {
      page: 0,
      size: 10,
    })
    const persona = pagina.items[0]?.persona as Record<string, unknown>
    expect(Array.isArray(persona)).toBe(false)
    expect(persona.codigo).toBe('777777')
  })
})

describe('agruparPorGrupo', () => {
  it('el catálogo del instructor recorre todas las páginas y no se corta en la primera', async () => {
    await iniciarComo('instructor.perez')
    const pedidas: string[] = []
    server.use(
      http.get(`${config.sigedaApiUrl}/api/grupos/instructor/:cod/programa/:nombre`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '0'
        pedidas.push(page)
        const codigo = page === '0' ? '111111' : '999999'
        return HttpResponse.json({
          content: [
            { persona: { codigo, nombre: 'Uno', aPaterno: 'Dos', aMaterno: 'Tres', idGrupo: 1, estado: 'Apto' } },
          ],
          totalElements: 2,
          totalPages: 2,
          size: 100,
          number: Number(page),
        })
      }),
    )
    const alumnos = await listarAlumnos('instructor', 'PDI', '444444')
    expect(pedidas).toEqual(['0', '1'])
    expect(alumnos.map((alumno) => alumno.codigo)).toEqual(['111111', '999999'])
  })

  it('agrupa las opciones por su grupo y deja aparte a los alumnos sin grupo', () => {
    expect(
      agruparPorGrupo([
        { codigo: '111111', nombreCompleto: 'Oscar Lopez Chaparro', grupo: 'Grupo 1' },
        { codigo: '555555', nombreCompleto: 'Pedro Rodriguez Garcia', grupo: 'Grupo 3' },
        { codigo: '666666', nombreCompleto: 'Ana Torres Martinez', grupo: 'Grupo 3' },
        { codigo: '123456', nombreCompleto: 'Sin Grupo Asignado', grupo: null },
      ]).map(([grupo, alumnos]) => [grupo, alumnos.map((alumno) => alumno.codigo)]),
    ).toEqual([
      ['Grupo 1', ['111111']],
      ['Grupo 3', ['555555', '666666']],
      ['Sin grupo', ['123456']],
    ])
  })
})
