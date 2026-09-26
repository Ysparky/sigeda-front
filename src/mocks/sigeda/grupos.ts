import { http, HttpResponse } from 'msw'
import { API, autorizar, erroresDeCampo, guardado, paginar, texto, textoEliminado, textoNoEncontrado } from './comun'
import { buscarPersona, datos, siguienteId, type GrupoMock, type PersonaMock, type ProgramaMock } from './datos'

type PersonaDeGrupo = { codigo?: unknown; checked?: unknown }

type CuerpoGrupo = {
  nombre?: unknown
  descripcion?: unknown
  programa?: unknown
  personas?: PersonaDeGrupo[] | null
}

function entidadPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    rango: persona.rango,
    dni: persona.dni,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    estado: persona.estado,
    tipo: persona.tipo,
    codEvalRealizada: persona.codEvalRealizada,
    codEvalDesaprobada: null,
    contChequeo: persona.contChequeo,
    contEval: persona.contEval,
    contMalo: persona.contMalo,
    contRegular: persona.contRegular,
    checked: false,
    idGrupo: persona.idGrupo,
    desaprobados: null,
  }
}

function detalleGrupo(grupo: GrupoMock) {
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    descripcion: grupo.descripcion,
    programa: grupo.programa,
    personas: datos()
      .personas.filter((persona) => persona.idGrupo === grupo.id)
      .map(entidadPersona),
  }
}

function erroresDeGrupo(cuerpo: CuerpoGrupo, conPrograma: boolean): string[] {
  const errores: string[] = []
  const nombre = texto(cuerpo.nombre)
  if (nombre.trim() === '') errores.push("'nombre': El nombre es obligatorio")
  else if (nombre.length < 3 || nombre.length > 35) {
    errores.push("'nombre': El nombre debe tener entre 3 y 35 caracteres.")
  }
  if (texto(cuerpo.descripcion).length > 255) {
    errores.push("'descripcion': La descripción no puede superar los 255 caracteres.")
  }
  if (conPrograma && cuerpo.programa !== 'PDI' && cuerpo.programa !== 'PDE') {
    errores.push("'programa': Ingresar programa válido.")
  }
  return errores
}

function personasDelCuerpo(cuerpo: CuerpoGrupo): PersonaDeGrupo[] {
  return cuerpo.personas ?? []
}

function faltaAlguna(personas: PersonaDeGrupo[]): boolean {
  return personas.some((persona) => !buscarPersona(texto(persona.codigo)))
}

export const handlersGrupos = [
  http.get(`${API}/api/grupos`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    return paginar(datos().grupos, new URL(request.url), { nombreLista: 'grupos', propiedadPorDefecto: 'id' })
  }),
  http.post(`${API}/api/grupos`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoGrupo
    const errores = erroresDeGrupo(cuerpo, true)
    if (errores.length > 0) return erroresDeCampo(errores)
    const personas = personasDelCuerpo(cuerpo)
    if (faltaAlguna(personas)) return textoNoEncontrado('Persona especificada no existe.')
    const grupo: GrupoMock = {
      id: siguienteId('grupo'),
      nombre: texto(cuerpo.nombre),
      descripcion: texto(cuerpo.descripcion),
      programa: cuerpo.programa === 'PDE' ? 'PDE' : ('PDI' as ProgramaMock),
    }
    datos().grupos.push(grupo)
    for (const elegida of personas) {
      const persona = buscarPersona(texto(elegida.codigo))
      if (persona) persona.idGrupo = grupo.id
    }
    return guardado('Grupo', 'grupo', detalleGrupo(grupo))
  }),
  http.get(`${API}/api/grupos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    return HttpResponse.json(detalleGrupo(grupo))
  }),
  http.put(`${API}/api/grupos/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    const cuerpo = (await request.json()) as CuerpoGrupo
    const errores = erroresDeGrupo(cuerpo, false)
    if (errores.length > 0) return erroresDeCampo(errores)
    const personas = personasDelCuerpo(cuerpo)
    if (faltaAlguna(personas)) return textoNoEncontrado('Persona especificada no existe.')
    grupo.nombre = texto(cuerpo.nombre)
    grupo.descripcion = texto(cuerpo.descripcion)
    for (const elegida of personas) {
      const persona = buscarPersona(texto(elegida.codigo))
      if (persona) persona.idGrupo = elegida.checked === true ? grupo.id : null
    }
    return guardado('Grupo', 'grupo', detalleGrupo(grupo))
  }),
  http.delete(`${API}/api/grupos/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const grupo = datos().grupos.find((candidato) => candidato.id === Number(params.id))
    if (!grupo) return textoNoEncontrado('Grupo especificada no existe.')
    for (const persona of datos().personas) {
      if (persona.idGrupo === grupo.id) persona.idGrupo = null
    }
    datos().grupos = datos().grupos.filter((candidato) => candidato.id !== grupo.id)
    return textoEliminado('Grupo')
  }),
]
