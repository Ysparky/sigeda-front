import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { API, autorizar, paginar, textoNoEncontrado } from './comun'
import { buscarPersona, buscarUsuarioPorNombre, datos, rolPorId, type PersonaMock } from './datos'

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
