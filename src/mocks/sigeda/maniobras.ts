import { http, HttpResponse } from 'msw'
import { API, autorizar, erroresDeDescripcion, erroresDeNombre, errorResponse, paginarConOrden, texto } from './comun'
import {
  buscarSubfase,
  datos,
  estandaresDeManiobra,
  siguienteId,
  subfasesDeManiobra,
  type EstandarMock,
  type ManiobraMock,
} from './datos'

type SubfaseDelCuerpo = { idSubfase?: unknown }

type CuerpoManiobra = { nombre?: unknown; descripcion?: unknown; subfases?: SubfaseDelCuerpo[] | null }

type EstandarDelCuerpo = { id?: unknown; nombre?: unknown; descripcion?: unknown }

type CuerpoEstandares = { estandares?: EstandarDelCuerpo[] | null }

function descripcionNueva(valor: unknown, anterior: string | null): string | null {
  const nueva = texto(valor).trim()
  return nueva === '' ? anterior : nueva
}

function erroresDeManiobra(cuerpo: CuerpoManiobra): string[] {
  const errores = [
    ...erroresDeNombre(cuerpo.nombre, 'nombre'),
    ...erroresDeDescripcion(cuerpo.descripcion, 'descripcion'),
  ]
  const subfases = cuerpo.subfases ?? []
  if (subfases.length === 0) errores.push("'subfases': La asignación de subfases es requerida")
  subfases.forEach((subfase, indice) => {
    if (!(Number(subfase.idSubfase) > 0)) errores.push(`'subfases[${indice}].idSubfase': La subfase es requerida.`)
  })
  return errores
}

function idsDeSubfases(cuerpo: CuerpoManiobra): number[] {
  return [...new Set((cuerpo.subfases ?? []).map((subfase) => Number(subfase.idSubfase)))]
}

function enlazar(idManiobra: number, ids: number[]) {
  datos().maniobrasSubfase = datos().maniobrasSubfase.filter((enlace) => enlace.idManiobra !== idManiobra)
  for (const idSubfase of ids) datos().maniobrasSubfase.push({ idSubfase, idManiobra })
}

function detalleManiobra(maniobra: ManiobraMock) {
  return {
    id: maniobra.id,
    nombre: maniobra.nombre,
    descripcion: maniobra.descripcion,
    estandares: estandaresDeManiobra(maniobra.id).map(({ id, nombre, descripcion }) => ({ id, nombre, descripcion })),
    subfases: subfasesDeManiobra(maniobra.id).map(({ id, nombre }) => ({ id, nombre })),
  }
}

function resumen(maniobra: ManiobraMock) {
  return { id: maniobra.id, nombre: maniobra.nombre, descripcion: maniobra.descripcion }
}

function enUso(idManiobra: number): boolean {
  return (
    datos().turnos.some((turno) => turno.maniobras.some((item) => item.idManiobra === idManiobra)) ||
    datos().evaluaciones.some((evaluacion) =>
      evaluacion.calificaciones.some((calificacion) => calificacion.idManiobra === idManiobra),
    )
  )
}

export const handlersManiobras = [
  http.get(`${API}/api/maniobras`, ({ request }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    return paginarConOrden(datos().maniobras, new URL(request.url), { nombreLista: 'maniobras', proyectar: resumen })
  }),
  http.post(`${API}/api/maniobras`, async ({ request }) => {
    const permitido = autorizar(request, 'Manage Maneuvers')
    if (permitido instanceof Response) return permitido
    const cuerpo = (await request.json()) as CuerpoManiobra
    const errores = erroresDeManiobra(cuerpo)
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    const ids = idsDeSubfases(cuerpo)
    if (ids.some((id) => !buscarSubfase(id))) {
      return errorResponse(404, 'Recurso no encontrado', 'No existe información de subfase.')
    }
    const maniobra: ManiobraMock = {
      id: siguienteId('maniobra'),
      nombre: texto(cuerpo.nombre),
      descripcion: texto(cuerpo.descripcion) === '' ? null : texto(cuerpo.descripcion),
    }
    datos().maniobras.push(maniobra)
    enlazar(maniobra.id, ids)
    return HttpResponse.json(resumen(maniobra))
  }),
  http.get(`${API}/api/maniobras/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Read')
    if (permitido instanceof Response) return permitido
    const maniobra = datos().maniobras.find((candidata) => candidata.id === Number(params.id))
    if (!maniobra) return errorResponse(404, 'Recurso no encontrado', 'No existe información de maniobra')
    return HttpResponse.json(detalleManiobra(maniobra))
  }),
  http.put(`${API}/api/maniobras/:id/estandar`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Standards')
    if (permitido instanceof Response) return permitido
    const maniobra = datos().maniobras.find((candidata) => candidata.id === Number(params.id))
    if (!maniobra) return errorResponse(404, 'Recurso no encontrado', 'No existe información de maniobra.')
    const cuerpo = (await request.json()) as CuerpoEstandares
    const estandares = cuerpo.estandares ?? []
    const errores: string[] = []
    if (estandares.length === 0) errores.push("'estandares': La asignación de estandares es requerida")
    estandares.forEach((estandar, indice) => {
      errores.push(...erroresDeNombre(estandar.nombre, `estandares[${indice}].nombre`))
      errores.push(...erroresDeDescripcion(estandar.descripcion, `estandares[${indice}].descripcion`))
    })
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    // El estándar que llega con un `id` que EXISTE pero es de otra maniobra se rechaza con 410, no se
    // muda: apropiárselo dejaba a la maniobra de origen con CERO estándares. Un `id` que no existe se
    // sigue creando.
    for (const enviado of estandares) {
      const id = Number(enviado.id)
      const ajeno = id > 0 ? datos().estandares.find((candidato) => candidato.id === id) : undefined
      if (ajeno && ajeno.idManiobra !== maniobra.id) {
        return errorResponse(410, 'Acción expirada', `El estándar ${ajeno.nombre} es de otra maniobra y no se puede mover.`)
      }
    }
    for (const enviado of estandares) {
      const id = Number(enviado.id)
      const existente = id > 0 ? datos().estandares.find((candidato) => candidato.id === id) : undefined
      if (existente) {
        existente.nombre = texto(enviado.nombre)
        existente.descripcion = descripcionNueva(enviado.descripcion, existente.descripcion)
        existente.idManiobra = maniobra.id
      } else {
        const nuevo: EstandarMock = {
          id: siguienteId('estandar'),
          nombre: texto(enviado.nombre),
          descripcion: texto(enviado.descripcion) === '' ? null : texto(enviado.descripcion),
          idManiobra: maniobra.id,
        }
        datos().estandares.push(nuevo)
      }
    }
    return HttpResponse.json(resumen(maniobra))
  }),
  http.put(`${API}/api/maniobras/:id`, async ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Maneuvers')
    if (permitido instanceof Response) return permitido
    const maniobra = datos().maniobras.find((candidata) => candidata.id === Number(params.id))
    if (!maniobra) return errorResponse(404, 'Recurso no encontrado', 'No existe información de maniobra.')
    const cuerpo = (await request.json()) as CuerpoManiobra
    const errores = erroresDeManiobra(cuerpo)
    if (errores.length > 0) return errorResponse(400, 'Error al validar el modelo', null, errores)
    const ids = idsDeSubfases(cuerpo)
    if (ids.some((id) => !buscarSubfase(id))) {
      return errorResponse(404, 'Recurso no encontrado', 'No existe información de subfase.')
    }
    maniobra.nombre = texto(cuerpo.nombre)
    maniobra.descripcion = descripcionNueva(cuerpo.descripcion, maniobra.descripcion)
    enlazar(maniobra.id, ids)
    return HttpResponse.json(resumen(maniobra))
  }),
  http.delete(`${API}/api/maniobras/:id`, ({ request, params }) => {
    const permitido = autorizar(request, 'Manage Maneuvers')
    if (permitido instanceof Response) return permitido
    const maniobra = datos().maniobras.find((candidata) => candidata.id === Number(params.id))
    if (!maniobra) return errorResponse(404, 'Recurso no encontrado', 'No existe información de maniobra.')
    if (estandaresDeManiobra(maniobra.id).length > 0) {
      return errorResponse(410, 'Acción expirada', 'La maniobra no se pudo eliminar, tiene estándares asignados.')
    }
    if (enUso(maniobra.id)) {
      return errorResponse(410, 'Acción expirada', 'La maniobra no se pudo eliminar, está presente en un turno.')
    }
    datos().maniobrasSubfase = datos().maniobrasSubfase.filter((enlace) => enlace.idManiobra !== maniobra.id)
    datos().maniobras = datos().maniobras.filter((candidata) => candidata.id !== maniobra.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
