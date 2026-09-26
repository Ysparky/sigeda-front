import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { hoyIso, sumarDias } from '@/lib/dominio/calendario'
import { iniciarComo } from '@/test/render'
import { datos } from './datos'
import { D10_SIN_ALERTAS, D17_GRUPO_FUERA_DE_ALCANCE, D18_GRUPO_NO_EXISTE } from './seguimiento'

type Alerta = {
  id: string
  tipo: string
  severidad: string
  codAlumno: string
  alumno: string
  idGrupo: number | null
  grupo: string
  programa: string
  fecha: string | null
  detalle: string
  codEvaluacion: string | null
  idSubfase: number | null
  idMateria: number | null
  idCuestionario: number | null
  causal: string | null
}

async function alertas(consulta = 'programa=PDI&page=0&size=20') {
  return sigeda.get<{ content: Alerta[]; totalElements: number; totalPages: number }>(
    `/api/seguimiento/alertas?${consulta}`,
  )
}

describe('GET /api/seguimiento/alertas', () => {
  it('contrato §9.7 deriva trece alertas con una ALTA, seis MEDIA y seis BAJA', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    expect(pagina.totalElements).toBe(13)
    const porSeveridad = (severidad: string) => pagina.content.filter((alerta) => alerta.severidad === severidad).length
    expect([porSeveridad('ALTA'), porSeveridad('MEDIA'), porSeveridad('BAJA')]).toEqual([1, 6, 6])
    expect(pagina.content.filter((alerta) => alerta.tipo === 'VUELO_DESAPROBADO')).toHaveLength(6)
    expect(pagina.content.filter((alerta) => alerta.tipo === 'CAUSAL_TEORICO')).toHaveLength(4)
  })

  it('contrato §9.7 la clave sintética separa dos causales del mismo código en asignaturas distintas', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    const causales = pagina.content.filter((alerta) => alerta.tipo === 'CAUSAL_TEORICO')
    expect(causales.map((alerta) => alerta.id)).toEqual([
      'CAUSAL_TEORICO:111111:PERIODICOS_GENERALES:2',
      'CAUSAL_TEORICO:111111:TRES_ASIGNATURAS:',
      'CAUSAL_TEORICO:111111:PROMEDIO_ASIGNATURA:3',
      'CAUSAL_TEORICO:111111:PROMEDIO_ASIGNATURA:2',
    ])
    expect(new Set(pagina.content.map((alerta) => alerta.id)).size).toBe(13)
  })

  it('contrato §2.1 la severidad viaja como etiqueta del enum y el ordinal no se serializa', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    expect(new Set(pagina.content.map((alerta) => alerta.severidad))).toEqual(new Set(['ALTA', 'MEDIA', 'BAJA']))
    expect(pagina.content[0]).not.toHaveProperty('ordinal')
  })

  it('contrato §2.1 el orden por defecto es por severidad y, dentro de ella, por fecha descendente', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    expect(pagina.content[0]).toMatchObject({ tipo: 'SUBSANACION_PENDIENTE', codAlumno: '666666' })
    expect(pagina.content.at(-1)?.tipo).toBe('VUELO_DESAPROBADO')
    const medias = pagina.content.filter((alerta) => alerta.severidad === 'MEDIA').map((alerta) => alerta.fecha ?? '')
    expect(medias).toEqual([...medias].sort().reverse())
  })

  it('contrato §9.7 777777 tiene cuatro alertas y ninguna es CHEQUEO_PENDIENTE; la de 999999 sí', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    const suyas = pagina.content.filter((alerta) => alerta.codAlumno === '777777')
    expect(suyas.map((alerta) => alerta.tipo).toSorted()).toEqual([
      'ESTADO_CRITICO',
      'VUELO_DESAPROBADO',
      'VUELO_DESAPROBADO',
      'VUELO_DESAPROBADO',
    ])
    expect(pagina.content.find((alerta) => alerta.tipo === 'CHEQUEO_PENDIENTE')).toMatchObject({
      codAlumno: '999999',
      severidad: 'MEDIA',
      idSubfase: 1,
    })
  })

  it('contrato §2.1 un instructor sin View All Groups solo ve los grupos con los que voló', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await alertas()
    expect(pagina.totalElements).toBe(7)
    expect(new Set(pagina.content.map((alerta) => alerta.idGrupo))).toEqual(new Set([1, 3]))
    expect(pagina.content.map((alerta) => alerta.codAlumno)).not.toContain('777777')
  })

  it('contrato §2.1 cada alerta lleva el nombre real del grupo, no uno armado con su id', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas('programa=PDI&idGrupo=6&page=0&size=20')
    expect(pagina.content.map((alerta) => alerta.grupo)).toContain('Promoción 2026-A')
    expect(pagina.content.map((alerta) => alerta.grupo)).not.toContain('Grupo 6')
  })

  it('contrato §2.1 filtra por grupo, por tipo y por rango de fechas', async () => {
    await iniciarComo('comandante.aguirre')
    expect((await alertas('programa=PDI&idGrupo=4&page=0&size=20')).totalElements).toBe(4)
    expect((await alertas('programa=PDI&tipo=VUELO_DESAPROBADO&page=0&size=20')).totalElements).toBe(6)
    expect((await alertas(`programa=PDI&fechaPre=${sumarDias(hoyIso(), -15)}&page=0&size=20`)).totalElements).toBe(8)
    expect(
      (await alertas(`programa=PDI&fechaPost=${sumarDias(hoyIso(), -25)}&page=0&size=20`)).totalElements,
    ).toBe(3)
    expect((await alertas('programa=PDI&tipo=NO_EXISTE&page=0&size=20')).totalElements).toBe(13)
  })

  it('contrato §2.1 una alerta sin fecha queda al final de su banda de severidad', async () => {
    const sinEvaluaciones = datos().personas.find((persona) => persona.codigo === '222222')
    if (!sinEvaluaciones) throw new Error('la persona 222222 no está en los datos de prueba')
    sinEvaluaciones.estado = 'En Complementación'
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas('programa=PDI&page=0&size=20')
    const medias = pagina.content.filter((alerta) => alerta.severidad === 'MEDIA')
    expect(medias.at(-1)).toMatchObject({ codAlumno: '222222', fecha: null })
    expect(medias.slice(0, -1).every((alerta) => alerta.fecha !== null)).toBe(true)
  })

  it('contrato §2.1 un rango de fechas deja fuera la alerta sin fecha por los dos extremos', async () => {
    const sinEvaluaciones = datos().personas.find((persona) => persona.codigo === '222222')
    if (!sinEvaluaciones) throw new Error('la persona 222222 no está en los datos de prueba')
    sinEvaluaciones.estado = 'En Complementación'
    await iniciarComo('comandante.aguirre')
    const sinFiltro = await alertas('programa=PDI&page=0&size=20')
    const conFecha = (pagina: { content: Alerta[] }) => pagina.content.some((alerta) => alerta.codAlumno === '222222')
    expect(conFecha(sinFiltro)).toBe(true)
    const desde = await alertas(`programa=PDI&fechaPre=${sumarDias(hoyIso(), -15)}&page=0&size=20`)
    const hasta = await alertas(`programa=PDI&fechaPost=${hoyIso()}&page=0&size=20`)
    expect(conFecha(desde)).toBe(false)
    expect(conFecha(hasta)).toBe(false)
  })

  it('contrato §2.1 un grupo inexistente responde 404 D18 y uno fuera de alcance 403 D17', async () => {
    await iniciarComo('instructor.perez')
    await expect(alertas('programa=PDI&idGrupo=99')).rejects.toMatchObject({ status: 404, message: D18_GRUPO_NO_EXISTE })
    await expect(alertas('programa=PDI&idGrupo=4')).rejects.toMatchObject({
      status: 403,
      message: D17_GRUPO_FUERA_DE_ALCANCE,
    })
    await expect(alertas('programa=PDI&idGrupo=2')).rejects.toMatchObject({ status: 404, message: D10_SIN_ALERTAS })
  })

  it('contrato §2.1 una lista vacía responde 404 D10 y el endpoint pide View Disapproved', async () => {
    await iniciarComo('comandante.aguirre')
    await expect(alertas('programa=PDE')).rejects.toMatchObject({ status: 404, message: D10_SIN_ALERTAS })
    await iniciarComo('jefe.operaciones')
    await expect(alertas()).rejects.toMatchObject({ status: 403, message: MENSAJE_SIN_PERMISO })
  })

  it('contrato §2.1 cada tipo lleva los punteros que su enlace necesita y ninguno más', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await alertas()
    const porTipo = (tipo: string) => pagina.content.find((alerta) => alerta.tipo === tipo)
    expect(porTipo('VUELO_DESAPROBADO')).toMatchObject({ codEvaluacion: expect.any(String), idSubfase: expect.any(Number) })
    expect(porTipo('SUBSANACION_PENDIENTE')).toMatchObject({ idMateria: 3, idCuestionario: 2, codEvaluacion: null })
    expect(porTipo('CAUSAL_TEORICO')).toMatchObject({ causal: 'PERIODICOS_GENERALES', idMateria: 2 })
    expect(porTipo('ESTADO_CRITICO')).toMatchObject({ codEvaluacion: null, idSubfase: null, causal: null })
    expect(porTipo('CHEQUEO_PENDIENTE')?.detalle).toContain('criterio de chequeo')
  })
})
