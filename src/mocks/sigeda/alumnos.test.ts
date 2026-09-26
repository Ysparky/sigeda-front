import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { tokens } from '@/lib/auth/tokens'
import { jwtDePrueba } from '@/mocks/sigeda/auth'
import { iniciarComo } from '@/test/render'

describe('GET /api/personas/{cod}/alumno', () => {
  it('contrato §9.9 devuelve DetallePersona con las claves raras del backend', async () => {
    await iniciarComo('instructor.perez')
    const detalle = await sigeda.get<Record<string, unknown>>('/api/personas/777777/alumno')
    expect(detalle).toEqual({
      dni: '78901234',
      nombre: 'Carlos',
      APaterno: 'Ramirez',
      AMaterno: 'Sanchez',
      rango: 'Mayor',
      estado: 'En Chequeo',
      usuario: { nombre: 'alumno.ramirez', correo: 'alumno5@sigeda.com' },
    })
    expect(detalle).not.toHaveProperty('aPaterno')
    expect(detalle).not.toHaveProperty('codigo')
  })

  it('contrato §9.9 un alumno sin cuenta llega con usuario null y un código inexistente da 404 D2', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get<{ usuario: unknown }>('/api/personas/654321/alumno')).resolves.toMatchObject({ usuario: null })
    await expect(sigeda.get('/api/personas/000000/alumno')).rejects.toMatchObject({
      status: 404,
      message: 'Persona especificada no existe.',
    })
  })
})

describe('GET /api/personas/{cod}/legajo', () => {
  it('contrato §6.1 trae la cabecera con el nombre real del grupo y su programa', async () => {
    await iniciarComo('instructor.perez')
    const legajo = await sigeda.get<{
      codigo: string
      tipo: string
      estado: string
      grupo: { id: number; nombre: string; programa: string } | null
      contadores: Record<string, number>
      ultimaEvaluacion: { codigo: string; estadoAlumno: string } | null
    }>('/api/personas/999999/legajo')
    expect(legajo).toMatchObject({
      codigo: '999999',
      tipo: 'Alumno',
      estado: 'Apto',
      grupo: { id: 6, nombre: 'Promoción 2026-A', programa: 'PDI' },
      contadores: { chequeo: 3, evaluaciones: 7, malos: 2, regulares: 2 },
    })
    expect(legajo.ultimaEvaluacion).toMatchObject({ codigo: '999999-2', estadoAlumno: 'Apto' })
  })

  it('contrato §6.1 el bloque chequeo dice qué criterio aplica, si se cumplió y si los contadores se mueven', async () => {
    await iniciarComo('instructor.perez')
    const cumplidoYMovido = await sigeda.get<{ chequeo: Record<string, unknown> }>('/api/personas/777777/legajo')
    expect(cumplidoYMovido.chequeo).toEqual({
      fase: 'Adaptación',
      criterio: 1,
      criterioCumplido: true,
      detalle: '3 vuelos Malos',
      regularAlternado: true,
      cuentaConEsteEstado: false,
    })
    const cumplidoYApto = await sigeda.get<{ chequeo: Record<string, unknown> }>('/api/personas/999999/legajo')
    expect(cumplidoYApto.chequeo).toMatchObject({
      criterioCumplido: true,
      detalle: '2 Malos y 2 Regulares alternados',
      cuentaConEsteEstado: true,
    })
    const sinCumplir = await sigeda.get<{ chequeo: Record<string, unknown> }>('/api/personas/555555/legajo')
    expect(sinCumplir.chequeo).toMatchObject({
      criterioCumplido: false,
      detalle: 'Lleva 1 Malo y 2 Regulares',
      regularAlternado: true,
      cuentaConEsteEstado: true,
    })
  })

  it('contrato §6.1 un alumno sin grupo ni cuenta llega con los dos en null', async () => {
    await iniciarComo('instructor.perez')
    const legajo = await sigeda.get<{ grupo: unknown; usuario: unknown; ultimaEvaluacion: unknown }>(
      '/api/personas/654321/legajo',
    )
    expect(legajo).toMatchObject({ grupo: null, usuario: null, ultimaEvaluacion: null })
  })

  it('contrato §6.1 los dos endpoints piden Read y un código inexistente da 404 D2', async () => {
    await iniciarComo('alumno.ramirez')
    await expect(sigeda.get('/api/personas/777777/legajo')).resolves.toBeTruthy()
    await expect(sigeda.get('/api/personas/777777/alumno')).resolves.toBeTruthy()
    await expect(sigeda.get('/api/personas/000000/legajo')).rejects.toMatchObject({ status: 404 })
    await expect(sigeda.get('/api/personas/000000/alumno')).rejects.toMatchObject({ status: 404 })
    tokens.guardar(jwtDePrueba('raul.paredes'), '')
    await expect(sigeda.get('/api/personas/777777/legajo')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
    await expect(sigeda.get('/api/personas/777777/alumno')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })
})
