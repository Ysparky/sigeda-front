import { http, HttpResponse } from 'msw'
import { noAutorizado, usuarioAutenticado } from './auth'
import { esTipoPersona, rolCompatible } from '@/lib/dominio/personas'
import { erroresDeContrasena, erroresDeUsername } from './cuentas'
import {
  API,
  autorizar,
  erroresDeCampo,
  guardado,
  paginar,
  textoEliminado,
  textoMalaPeticion,
  textoNoEncontrado,
  textoProhibido,
} from './comun'
import {
  buscarPersona,
  buscarUsuarioPorNombre,
  datos,
  rolPorId,
  siguienteId,
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

const PATRON_CODIGO = /^[A-Za-z0-9]{6}$/
const PATRON_DNI = /^\d{8}$/
const PATRON_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function obligatorio(valor: unknown, campo: string, mensaje: string): string[] {
  return texto(valor).trim() === '' ? [`'${campo}': ${mensaje}`] : []
}

function erroresDePersonaNueva(cuerpo: CuerpoPersonaNueva): string[] {
  const errores: string[] = []
  const codigo = obligatorio(cuerpo.codigo, 'codigo', 'El código es obligatorio.')
  if (codigo.length > 0) errores.push(...codigo)
  else if (!PATRON_CODIGO.test(texto(cuerpo.codigo))) {
    errores.push("'codigo': El código debe tener 6 caracteres alfanuméricos.")
  }
  const dni = obligatorio(cuerpo.dni, 'dni', 'El DNI es obligatorio.')
  if (dni.length > 0) errores.push(...dni)
  else if (!PATRON_DNI.test(texto(cuerpo.dni))) errores.push("'dni': El DNI debe tener 8 dígitos.")
  const nombre = obligatorio(cuerpo.nombre, 'nombre', 'El nombre es obligatorio')
  if (nombre.length > 0) errores.push(...nombre)
  else if (texto(cuerpo.nombre).length > 50) errores.push("'nombre': El nombre no puede superar los 50 caracteres.")
  const aPaterno = obligatorio(cuerpo.aPaterno, 'aPaterno', 'El apellido paterno es obligatorio.')
  if (aPaterno.length > 0) errores.push(...aPaterno)
  else if (texto(cuerpo.aPaterno).length > 50) {
    errores.push("'aPaterno': El apellido paterno no puede superar los 50 caracteres.")
  }
  if (texto(cuerpo.aMaterno).length > 50) {
    errores.push("'aMaterno': El apellido materno no puede superar los 50 caracteres.")
  }
  if (texto(cuerpo.rango).length > 30) errores.push("'rango': El rango no puede superar los 30 caracteres.")
  const tipo = cuerpo.tipo ?? null
  const tipoValido = tipo === null || esTipoPersona(tipo)
  if (!tipoValido) errores.push("'tipo': Ingresar tipo de persona válido.")
  const usuario = cuerpo.usuario
  if (!usuario) {
    errores.push("'usuario': Los datos de la cuenta son requeridos.")
    return errores
  }
  errores.push(...erroresDeUsername(usuario.username, 'usuario.username', null))
  const correo = obligatorio(usuario.correo, 'usuario.correo', 'El correo es obligatorio.')
  if (correo.length > 0) errores.push(...correo)
  else if (!PATRON_CORREO.test(texto(usuario.correo))) errores.push("'usuario.correo': Ingresar correo válido.")
  errores.push(...erroresDeContrasena(usuario.password, 'usuario.password'))
  const idRol = Number(usuario.idRol)
  const rol = Number.isInteger(idRol) && idRol > 0 ? rolPorId(idRol) : null
  if (!Number.isInteger(idRol) || idRol <= 0) errores.push("'usuario.idRol': El rol es requerido.")
  else if (!rol) errores.push("'usuario.idRol': El rol seleccionado no existe.")
  else if (tipoValido && !rolCompatible(tipo, rol.nombre)) {
    errores.push("'usuario.idRol': El rol no corresponde al tipo de persona.")
  }
  return errores
}

type CuerpoPersonaNueva = {
  codigo?: unknown
  dni?: unknown
  nombre?: unknown
  aPaterno?: unknown
  aMaterno?: unknown
  rango?: unknown
  tipo?: string | null
  usuario?: { username?: unknown; correo?: unknown; password?: unknown; idRol?: unknown } | null
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
  http.post(`${API}/api/personas`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Users')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoPersonaNueva
    const errores = erroresDePersonaNueva(cuerpo)
    if (errores.length > 0) return erroresDeCampo(errores)
    const codigo = texto(cuerpo.codigo)
    if (buscarPersona(codigo)) return textoMalaPeticion('El alumno ya ha sido registrado.')
    const persona: PersonaMock = {
      codigo,
      nombre: texto(cuerpo.nombre),
      aPaterno: texto(cuerpo.aPaterno),
      aMaterno: texto(cuerpo.aMaterno),
      dni: texto(cuerpo.dni),
      rango: texto(cuerpo.rango) === '' ? null : texto(cuerpo.rango),
      tipo: esTipoPersona(cuerpo.tipo) ? cuerpo.tipo : null,
      estado: 'Apto',
      idGrupo: null,
      contEval: 0,
      codEvalRealizada: null,
    }
    const cuenta = cuerpo.usuario
    const usuario = {
      id: siguienteId('usuario'),
      username: texto(cuenta?.username),
      correo: texto(cuenta?.correo),
      codPersona: codigo,
      idRol: Number(cuenta?.idRol),
      password: texto(cuenta?.password),
    }
    datos().personas.push(persona)
    datos().usuarios.push(usuario)
    const rol = rolPorId(usuario.idRol)
    return HttpResponse.json(
      {
        mensaje: 'Persona guardada con éxito.',
        persona: entidadPersona(persona),
        usuario: {
          id: usuario.id,
          username: usuario.username,
          correo: usuario.correo,
          rol: rol && { id: rol.id, nombre: rol.nombre },
        },
      },
      { status: 201 },
    )
  }),
  http.get(`${API}/api/personas/alumno/:tipo`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Groups')
    if (permitido instanceof Response) return permitido
    const alumnos = datos().personas.filter((persona) => persona.tipo === String(params.tipo) && persona.idGrupo === null)
    if (alumnos.length === 0) return textoNoEncontrado('No existen personas disponibles.')
    return HttpResponse.json(
      alumnos.map((persona) => ({
        codigo: persona.codigo,
        nombre: persona.nombre,
        aPaterno: persona.aPaterno,
        aMaterno: persona.aMaterno,
      })),
    )
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
