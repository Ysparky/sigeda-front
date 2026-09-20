import { http, HttpResponse } from 'msw'
import { API, autorizar, errorResponse, paginarConOrden } from './comun'
import { buscarSubfase, datos, maniobrasDeSubfase, siguienteId, type FaseMock, type SubfaseMock } from './datos'

type SubfaseDelCuerpo = { id?: unknown; nombre?: unknown; descripcion?: unknown }

type CuerpoFase = { nombre?: unknown; descripcion?: unknown; subfases?: SubfaseDelCuerpo[] | null }

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function erroresDeNombre(valor: unknown, campo: string): string[] {
  const nombre = texto(valor)
  if (nombre.trim() === '') return [`'${campo}': El nombre es obligatorio`]
  return nombre.length < 3 || nombre.length > 35
    ? [`'${campo}': El nombre debe tener entre 3 y 35 caracteres.`]
    : []
}

function erroresDeDescripcion(valor: unknown, campo: string): string[] {
  return texto(valor).length > 255 ? [`'${campo}': La descripción no puede superar los 255 caracteres.`] : []
}

function erroresDeFase(cuerpo: CuerpoFase): string[] {
  const errores = [...erroresDeNombre(cuerpo.nombre, 'nombre'), ...erroresDeDescripcion(cuerpo.descripcion, 'descripcion')]
  const subfases = cuerpo.subfases ?? []
  if (subfases.length === 0) errores.push("'subfases': La asignación de subfases es requerida")
  subfases.forEach((subfase, indice) => {
    errores.push(...erroresDeNombre(subfase.nombre, `subfases[${indice}].nombre`))
    errores.push(...erroresDeDescripcion(subfase.descripcion, `subfases[${indice}].descripcion`))
  })
  return errores
}

function descripcionNueva(valor: unknown, anterior: string | null): string | null {
  const nueva = texto(valor).trim()
  return nueva === '' ? anterior : nueva
}

function subfaseEnUso(subfase: SubfaseMock): boolean {
  return (
    maniobrasDeSubfase(subfase.id).length > 0 ||
    datos().turnos.some((turno) => turno.idSubfase === subfase.id) ||
    datos().evaluaciones.some((evaluacion) => evaluacion.idSubFase === subfase.id)
  )
}

function subfasesDeFase(idFase: number): SubfaseMock[] {
  return datos().subfases.filter((subfase) => subfase.idFase === idFase)
}

function detalleFase(fase: FaseMock) {
  return {
    id: fase.id,
    nombre: fase.nombre,
    descripcion: fase.descripcion,
    subfases: subfasesDeFase(fase.id).map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion })),
  }
}

function entidadFase(fase: FaseMock) {
  return {
    id: fase.id,
    nombre: fase.nombre,
    descripcion: fase.descripcion,
    subfases: subfasesDeFase(fase.id).map((subfase) => ({
      id: subfase.id,
      nombre: subfase.nombre,
      descripcion: subfase.descripcion,
      idFase: subfase.idFase,
    })),
  }
}

function existenteDe(enviada: SubfaseDelCuerpo, conIds: boolean): SubfaseMock | undefined {
  const id = conIds ? Number(enviada.id) : 0
  return id > 0 ? buscarSubfase(id) : undefined
}

function subfaseOmitidaEnUso(fase: FaseMock, subfases: SubfaseDelCuerpo[]): SubfaseMock | null {
  const conservados = new Set(
    subfases.map((enviada) => existenteDe(enviada, true)?.id).filter((id) => id !== undefined),
  )
  const omitidas = subfasesDeFase(fase.id).filter((subfase) => !conservados.has(subfase.id))
  return omitidas.find(subfaseEnUso) ?? null
}

function aplicarSubfases(fase: FaseMock, subfases: SubfaseDelCuerpo[], conIds: boolean) {
  const conservados = new Set<number>()
  for (const enviada of subfases) {
    const existente = existenteDe(enviada, conIds)
    if (existente) {
      existente.nombre = texto(enviada.nombre)
      existente.descripcion = descripcionNueva(enviada.descripcion, existente.descripcion)
      existente.idFase = fase.id
      conservados.add(existente.id)
    } else {
      const nueva: SubfaseMock = {
        id: siguienteId('subfase'),
        nombre: texto(enviada.nombre),
        descripcion: texto(enviada.descripcion) === '' ? null : texto(enviada.descripcion),
        idFase: fase.id,
      }
      datos().subfases.push(nueva)
      conservados.add(nueva.id)
    }
  }
  const omitidas = subfasesDeFase(fase.id).filter((subfase) => !conservados.has(subfase.id))
  datos().subfases = datos().subfases.filter((subfase) => !omitidas.includes(subfase))
}

export const handlersFases = [
  http.get(`${API}/api/fases`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    return paginarConOrden(datos().fases, new URL(request.url), { nombreLista: 'fases' })
  }),
  http.post(`${API}/api/fases`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Phases')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoFase
    const errores = erroresDeFase(cuerpo)
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    const fase: FaseMock = {
      id: siguienteId('fase'),
      nombre: texto(cuerpo.nombre),
      descripcion: texto(cuerpo.descripcion) === '' ? null : texto(cuerpo.descripcion),
    }
    datos().fases.push(fase)
    aplicarSubfases(fase, cuerpo.subfases ?? [], false)
    return HttpResponse.json(entidadFase(fase))
  }),
  http.get(`${API}/api/fases/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const fase = datos().fases.find((candidata) => candidata.id === Number(params.id))
    if (!fase) return errorResponse(404, 'Recurso no encontrado', 'No existe información de fase.')
    return HttpResponse.json(detalleFase(fase))
  }),
  http.put(`${API}/api/fases/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Phases')
    if (permitido instanceof Response) return permitido
    const fase = datos().fases.find((candidata) => candidata.id === Number(params.id))
    if (!fase) return errorResponse(404, 'Recurso no encontrado', 'No existe información de fase.')
    const cuerpo = (await request.json()) as CuerpoFase
    const errores = erroresDeFase(cuerpo)
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    const subfases = cuerpo.subfases ?? []
    const enUso = subfaseOmitidaEnUso(fase, subfases)
    if (enUso) {
      return errorResponse(
        410,
        'Acción expirada',
        `La subfase ${enUso.nombre} no se puede quitar, tiene maniobras, turnos o evaluaciones.`,
      )
    }
    fase.nombre = texto(cuerpo.nombre)
    fase.descripcion = descripcionNueva(cuerpo.descripcion, fase.descripcion)
    aplicarSubfases(fase, subfases, true)
    return HttpResponse.json(entidadFase(fase))
  }),
  http.delete(`${API}/api/fases/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Phases')
    if (permitido instanceof Response) return permitido
    const fase = datos().fases.find((candidata) => candidata.id === Number(params.id))
    if (!fase) return errorResponse(404, 'Recurso no encontrado', 'No existe información de fase.')
    if (subfasesDeFase(fase.id).some(subfaseEnUso)) {
      return errorResponse(
        410,
        'Acción expirada',
        'La fase no se puede eliminar, sus subfases tienen maniobras, turnos o evaluaciones.',
      )
    }
    const suyas = new Set(subfasesDeFase(fase.id).map((subfase) => subfase.id))
    datos().subfases = datos().subfases.filter((subfase) => !suyas.has(subfase.id))
    datos().fases = datos().fases.filter((candidata) => candidata.id !== fase.id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/api/subfases/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const subfase = buscarSubfase(Number(params.id))
    if (!subfase) return errorResponse(404, 'Recurso no encontrado', 'No existe información de subfase.')
    return HttpResponse.json({
      id: subfase.id,
      nombre: subfase.nombre,
      descripcion: subfase.descripcion,
      maniobrasSubfase: maniobrasDeSubfase(subfase.id).map((maniobra) => ({ maniobra: { ...maniobra } })),
    })
  }),
]
