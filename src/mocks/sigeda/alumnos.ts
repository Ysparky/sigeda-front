import { http, HttpResponse } from 'msw'
import { criterioDeFase } from '@/lib/dominio/seguimiento'
import { API, autorizar, textoNoEncontrado } from './comun'
import { buscarPersona, datos, usuarioDePersona, type PersonaMock } from './datos'
import { criterioCumplido, esRegularAlternado, ramaCumplida } from './desaprobados'

export const D2_PERSONA_NO_EXISTE = 'Persona especificada no existe.'

function cuenta(codigo: string) {
  const usuario = usuarioDePersona(codigo)
  return usuario ? { nombre: usuario.username, correo: usuario.correo } : null
}

function ultimaEvaluacion(codigo: string) {
  const suyas = datos()
    .evaluaciones.filter((evaluacion) => evaluacion.codPersona === codigo)
    .toSorted((izquierda, derecha) => izquierda.fecha.localeCompare(derecha.fecha) || izquierda.codigo.localeCompare(derecha.codigo))
  const ultima = suyas.at(-1)
  return ultima
    ? {
        codigo: ultima.codigo,
        fecha: ultima.fecha,
        clasificacion: ultima.clasificacion,
        estadoAlumno: ultima.estadoAlumno,
      }
    : null
}

function plural(cantidad: number, singular: string, muchos: string) {
  return `${cantidad} ${cantidad === 1 ? singular : muchos}`
}

function bloqueDeChequeo(persona: PersonaMock) {
  const fase = faseDeLaUltima(persona.codigo)
  const criterio = criterioDeFase(fase)
  const cumplido = criterioCumplido(criterio, persona.contMalo, persona.contRegular)
  return {
    fase,
    criterio,
    criterioCumplido: cumplido,
    detalle:
      ramaCumplida(criterio, persona.contMalo, persona.contRegular) ??
      `Lleva ${plural(persona.contMalo, 'Malo', 'Malos')} y ${plural(persona.contRegular, 'Regular', 'Regulares')}`,
    regularAlternado: esRegularAlternado(persona.contRegular),
    cuentaConEsteEstado: persona.estado === 'Apto',
  }
}

function faseDeLaUltima(codigo: string): string {
  const suyas = datos()
    .evaluaciones.filter((evaluacion) => evaluacion.codPersona === codigo)
    .toSorted((izquierda, derecha) => izquierda.fecha.localeCompare(derecha.fecha) || izquierda.codigo.localeCompare(derecha.codigo))
  return suyas.at(-1)?.fase ?? ''
}

export const handlersAlumnos = [
  http.get(`${API}/api/personas/:cod/alumno`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    return HttpResponse.json({
      dni: persona.dni,
      nombre: persona.nombre,
      aPaterno: persona.aPaterno,
      aMaterno: persona.aMaterno,
      rango: persona.rango,
      estado: persona.estado,
      usuario: cuenta(persona.codigo),
    })
  }),
  http.get(`${API}/api/personas/:cod/legajo`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const persona = buscarPersona(String(params.cod))
    if (!persona) return textoNoEncontrado(D2_PERSONA_NO_EXISTE)
    const grupo = datos().grupos.find((candidato) => candidato.id === persona.idGrupo)
    return HttpResponse.json({
      codigo: persona.codigo,
      nombre: persona.nombre,
      aPaterno: persona.aPaterno,
      aMaterno: persona.aMaterno,
      dni: persona.dni,
      rango: persona.rango,
      tipo: persona.tipo,
      estado: persona.estado,
      grupo: grupo ? { id: grupo.id, nombre: grupo.nombre, programa: grupo.programa } : null,
      usuario: cuenta(persona.codigo),
      contadores: {
        chequeo: persona.contChequeo,
        evaluaciones: persona.contEval,
        malos: persona.contMalo,
        regulares: persona.contRegular,
      },
      chequeo: bloqueDeChequeo(persona),
      ultimaEvaluacion: ultimaEvaluacion(persona.codigo),
    })
  }),
]
