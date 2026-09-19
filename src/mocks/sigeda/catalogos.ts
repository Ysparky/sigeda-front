import { http, HttpResponse } from 'msw'
import { API, autorizar, errorResponse, numero, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, type PersonaMock, type ProgramaMock } from './datos'

function programaDeRuta(valor: unknown): ProgramaMock {
  return String(valor).toUpperCase() === 'PDE' ? 'PDE' : 'PDI'
}

function nombreAlumno(persona: PersonaMock) {
  return { codigo: persona.codigo, nombre: persona.nombre, aPaterno: persona.aPaterno, aMaterno: persona.aMaterno }
}

function alumnoConEstado(persona: PersonaMock) {
  return { ...nombreAlumno(persona), idGrupo: persona.idGrupo, estado: persona.estado }
}

function alumnosDelGrupo(idGrupo: number) {
  return datos().personas.filter((persona) => persona.tipo === 'Alumno' && persona.idGrupo === idGrupo)
}

function sugerencias(estado: string): string[] {
  if (estado === 'En Complementación') return ['Complementacion']
  if (estado === 'En Chequeo' || estado === 'En Final') return ['Chequeo']
  if (estado === 'Apto' || estado === 'En Observación') return ['Ponderada', 'chequeoSubFase', 'Complementacion']
  return []
}

export const handlersCatalogos = [
  http.get(`${API}/api/subfases`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const url = new URL(request.url)
    const page = numero(url, 'page', 0)
    const size = numero(url, 'size', 6)
    if (size > 10) {
      return errorResponse(400, 'Atributo o configuración erronea', 'Tamaño de página demasiado grande, máximo permitido es 10.')
    }
    const todas = datos().subfases.map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion }))
    const content = todas.slice(page * size, page * size + size)
    if (content.length === 0) return errorResponse(404, 'Recurso no encontrado', 'No existen subfases disponibles.')
    return HttpResponse.json({
      content,
      totalElements: todas.length,
      totalPages: Math.ceil(todas.length / size),
      size,
      number: page,
    })
  }),
  http.get(`${API}/api/maniobras/subfase/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const ids = datos().maniobrasPorSubfase[Number(params.id)] ?? []
    if (ids.length === 0) return errorResponse(404, 'Recurso no encontrado', 'No existen maniobras disponibles.')
    return HttpResponse.json(datos().maniobras.filter((maniobra) => ids.includes(maniobra.id)))
  }),
  http.get(`${API}/api/aeronaves`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const aeronaves = datos().aeronaves
    if (aeronaves.length === 0) return textoNoEncontrado('No existen aeronaves disponibles.')
    return HttpResponse.json(aeronaves)
  }),
  http.get(`${API}/api/personas/instructor/:tipo`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const instructores = datos().personas.filter((persona) => persona.tipo === String(params.tipo))
    if (instructores.length === 0) return textoNoEncontrado('No existen personas disponibles.')
    return HttpResponse.json(instructores.map(nombreAlumno))
  }),
  http.get(`${API}/api/alumnos/programa/:nombre`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Shifts')
    if (permitido instanceof Response) return permitido
    const programa = programaDeRuta(params.nombre)
    const grupos = datos()
      .grupos.filter((grupo) => grupo.programa === programa)
      .map((grupo) => ({ ...grupo, personas: alumnosDelGrupo(grupo.id).map(nombreAlumno) }))
      .filter((grupo) => grupo.personas.length > 0)
    if (grupos.length === 0) return textoNoEncontrado('No existen grupos disponibles.')
    return HttpResponse.json(grupos)
  }),
  http.get(`${API}/api/grupos/programa/:nombre`, ({ request, params }) => {
    const permitido = autorizar(request, 'View All Groups')
    if (permitido instanceof Response) return permitido
    const programa = programaDeRuta(params.nombre)
    const catalogo = datos()
      .grupos.filter((grupo) => grupo.programa === programa)
      .map((grupo) => ({ id: grupo.id, personas: alumnosDelGrupo(grupo.id).map(alumnoConEstado) }))
    return paginar(catalogo, new URL(request.url), {
      nombreLista: 'grupos',
      propiedadPorDefecto: 'id',
      proyectar: ({ personas }) => ({ personas }),
    })
  }),
  http.get(`${API}/api/grupos/instructor/:cod/programa/:nombre`, ({ request, params }) => {
    const permitido = autorizar(request, 'View My Group')
    if (permitido instanceof Response) return permitido
    const programa = programaDeRuta(params.nombre)
    const codigos = new Set(
      datos()
        .turnos.filter((turno) => turno.codInstructor === String(params.cod) && turno.programa === programa)
        .flatMap((turno) => turno.alumnos.map((alumno) => alumno.codAlumno)),
    )
    const alumnos = [...codigos]
      .map((codigo) => buscarPersona(codigo))
      .filter((persona): persona is PersonaMock => persona !== undefined)
      .map(alumnoConEstado)
    const catalogo = alumnos.length > 0 ? [{ id: 1, persona: alumnos }] : []
    return paginar(catalogo, new URL(request.url), {
      nombreLista: 'grupos',
      propiedadPorDefecto: 'id',
      proyectar: ({ persona }) => ({ persona }),
    })
  }),
  http.get(`${API}/api/personas/:cod/status`, ({ request, params }) => {
    const permitido = autorizar(request, 'Write')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    const categorias = sugerencias(persona.estado)
    if (categorias.length === 0) return textoNoEncontrado('No hay sugerencias disponibles.')
    return HttpResponse.json(categorias)
  }),
]
