import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { API, textoNoEncontrado } from './comun'
import { buscarPersona, buscarUsuarioPorNombre, rolPorId } from './datos'

export const handlersPersonas = [
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
