import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { esTipoPersona, rolCompatible } from '@/lib/dominio/personas'
import {
  API,
  autorizar,
  erroresDeCampo,
  guardado,
  paginar,
  textoEliminado,
  textoNoEncontrado,
  textoProhibido,
} from './comun'
import {
  buscarPersona,
  buscarUsuarioPorNombre,
  datos,
  rolPorId,
  usuarioDePersona,
  type PersonaMock,
} from './datos'

function indexPersona(persona: PersonaMock) {
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    rango: persona.rango,
    tipo: persona.tipo,
  }
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
    contChequeo: 0,
    contEval: persona.contEval,
    contMalo: 0,
    contRegular: 0,
    checked: false,
    idGrupo: persona.idGrupo,
    desaprobados: null,
  }
}

function detalleUsuario(persona: PersonaMock) {
  const usuario = usuarioDePersona(persona.codigo)
  const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
  const rol = usuario ? rolPorId(usuario.idRol) : null
  return {
    codigo: persona.codigo,
    nombre: persona.nombre,
    aPaterno: persona.aPaterno,
    aMaterno: persona.aMaterno,
    dni: persona.dni,
    rango: persona.rango,
    tipo: persona.tipo,
    estado: persona.estado,
    grupo: grupo ? { id: grupo.id, nombre: grupo.nombre } : null,
    usuario: usuario
      ? { id: usuario.id, nombre: usuario.username, correo: usuario.correo, rol: rol && { ...rol } }
      : null,
  }
}

export const handlersPersonas = [
  http.get(`${API}/api/personas`, ({ request }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    return paginar(datos().personas, new URL(request.url), {
      nombreLista: 'personas',
      propiedadPorDefecto: 'codigo',
      proyectar: indexPersona,
    })
  }),
  http.get(`${API}/api/personas/:cod/usuario`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    return HttpResponse.json(detalleUsuario(persona))
  }),
  http.put(`${API}/api/personas/:cod`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    const cuerpo = (await request.json()) as { rango?: unknown; tipo?: unknown }
    const errores: string[] = []
    const tipo = cuerpo.tipo ?? null
    if (tipo !== null && !esTipoPersona(tipo)) errores.push("'tipo': Ingresar tipo de persona válido.")
    else {
      const rol = rolPorId(usuarioDePersona(persona.codigo)?.idRol ?? null)
      if (rol && !rolCompatible(tipo, rol.nombre)) errores.push("'tipo': El tipo no corresponde al rol de la cuenta.")
    }
    const rango = cuerpo.rango ?? null
    if (typeof rango === 'string' && rango.length > 30) {
      errores.push("'rango': El rango no puede superar los 30 caracteres.")
    }
    if (errores.length > 0) return erroresDeCampo(errores)
    persona.rango = typeof rango === 'string' ? rango : null
    persona.tipo = esTipoPersona(tipo) ? tipo : null
    return guardado('Persona', 'persona', entidadPersona(persona))
  }),
  http.delete(`${API}/api/personas/:cod`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const codigo = String(params.cod)
    const persona = buscarPersona(codigo)
    if (!persona) return textoNoEncontrado('Persona especificada no existe.')
    if (persona.codEvalRealizada) return textoProhibido('No se puede eliminar alumno, ya realizó una evaluación.')
    const enTurno = datos().turnos.some((turno) => turno.alumnos.some((alumno) => alumno.codAlumno === codigo))
    if (enTurno) return textoProhibido('El alumno no se pudo eliminar, está presente en un turno.')
    const esInstructor = datos().turnos.some((turno) => turno.codInstructor === codigo)
    if (esInstructor) return textoProhibido('El instructor no se pudo eliminar, está presente en un turno.')
    datos().usuarios = datos().usuarios.filter((usuario) => usuario.codPersona !== codigo)
    datos().personas = datos().personas.filter((candidata) => candidata.codigo !== codigo)
    return textoEliminado('Persona')
  }),
  http.get(`${API}/api/personas/:nom`, ({ request, params }) => {
    if (!usuarioAutenticado(request)) return noAutorizado()
    const usuario = buscarUsuarioPorNombre(String(params.nom))
    const persona = usuario ? buscarPersona(usuario.codPersona) : undefined
    if (!usuario || !persona) return textoNoEncontrado('Persona especificada no existe.')
    const rol = rolPorId(usuario.idRol)
    return HttpResponse.json({
      codigo: persona.codigo,
      nombre: persona.nombre,
      aPaterno: persona.aPaterno,
      aMaterno: persona.aMaterno,
      idGrupo: persona.idGrupo,
      usuario: {
        nombre: usuario.username,
        correo: usuario.correo,
        id: usuario.id,
        rol: rol && { id: rol.id, nombre: rol.nombre },
      },
    })
  }),
]
