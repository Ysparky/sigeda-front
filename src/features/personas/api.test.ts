import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { server } from '@/mocks/server'
import { iniciarComo } from '@/test/render'
import { aPersonaFila, apellidosYNombres, listarPersonas, obtenerPersona } from './api'

const PAGINA = { page: 0, size: 10, direction: 'ASC' as const }

describe('api de personas', () => {
  it('CA-PER-01 lista las personas paginadas con su tipo', async () => {
    await iniciarComo('admin.sistema')
    const pagina = await listarPersonas({ ...PAGINA, property: 'codigo' })
    expect(pagina).toMatchObject({ page: 0, size: 10, total: 13 })
    expect(pagina.items[1]).toEqual({
      codigo: '111111',
      nombre: 'Oscar',
      aPaterno: 'Lopez',
      aMaterno: 'Chaparro',
      rango: 'Cadete',
      tipo: 'Alumno',
    })
  })

  it('dependencia 27 tolera una fila sin tipo ni rango', () => {
    const fila = aPersonaFila({ codigo: '123ABC', nombre: 'Rosa', aPaterno: 'Quispe' })
    expect(fila).toEqual({ codigo: '123ABC', nombre: 'Rosa', aPaterno: 'Quispe', aMaterno: '', rango: null, tipo: null })
    expect(apellidosYNombres(fila)).toBe('Quispe, Rosa')
  })

  it('CA-PER-06 trae el detalle con su cuenta, estado y grupo', async () => {
    await iniciarComo('admin.sistema')
    await expect(obtenerPersona('111111')).resolves.toEqual({
      codigo: '111111',
      nombre: 'Oscar',
      aPaterno: 'Lopez',
      aMaterno: 'Chaparro',
      dni: '12345678',
      rango: 'Cadete',
      tipo: 'Alumno',
      estado: 'Apto',
      grupo: { id: 1, nombre: 'Grupo 1' },
      cuenta: { id: 3, username: 'alumno.lopez', correo: 'alumno1@sigeda.com', rol: { id: 1, nombre: 'Alumno' } },
    })
  })

  it('dependencia 26 toma el id de la cuenta de la persona cuando el detalle no lo trae', async () => {
    const consultadas: string[] = []
    await iniciarComo('admin.sistema')
    server.use(
      http.get(`${config.sigedaApiUrl}/api/personas/:cod/usuario`, () =>
        HttpResponse.json({
          codigo: '111111',
          nombre: 'Oscar',
          aPaterno: 'Lopez',
          aMaterno: 'Chaparro',
          dni: '12345678',
          rango: 'Cadete',
          tipo: 'Alumno',
          usuario: { nombre: 'alumno.lopez', correo: 'alumno1@sigeda.com', rol: { id: 1, nombre: 'Alumno' } },
        }),
      ),
      http.get(`${config.sigedaApiUrl}/api/personas/:nom`, ({ params }) => {
        consultadas.push(String(params.nom))
        return HttpResponse.json({
          codigo: '111111',
          nombre: 'Oscar',
          aPaterno: 'Lopez',
          aMaterno: 'Chaparro',
          idGrupo: 1,
          usuario: { nombre: 'alumno.lopez', correo: 'alumno1@sigeda.com', id: 3, rol: { id: 1, nombre: 'Alumno' } },
        })
      }),
    )
    const persona = await obtenerPersona('111111')
    expect(persona.cuenta).toMatchObject({ id: 3, username: 'alumno.lopez' })
    expect(persona.estado).toBeNull()
    expect(consultadas).toEqual(['alumno.lopez'])
  })
})
