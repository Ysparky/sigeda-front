import { describe, expect, it } from 'vitest'
import { DECLARACION_JURADA, esMayorDeEdad, modeloDeclaracionJurada } from './schemas'

const datos = {
  nombres: 'Lucía',
  aPaterno: 'Paredes',
  aMaterno: 'Rojas',
  tipoDocumento: 'DNI',
  numeroDocumento: '76543210',
  direccion: 'Av. Arequipa 1234, Lima',
  convocatoria: 'Admisión 2026-I',
  fecha: '08/11/2026',
}

describe('modelo de declaración jurada', () => {
  it('sale prellenado con los datos del postulante y todos los ítems', () => {
    const html = modeloDeclaracionJurada(datos)
    expect(html).toContain('<strong>Lucía Paredes Rojas</strong>')
    expect(html).toContain('DNI N.º <strong>76543210</strong>')
    expect(html).toContain('Admisión 2026-I')
    for (const item of DECLARACION_JURADA) expect(html).toContain(item)
    expect(html).toContain('Huella digital')
  })

  it('escapa lo que escribe el postulante', () => {
    const html = modeloDeclaracionJurada({ ...datos, direccion: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})

describe('mayoría de edad', () => {
  it('cuenta 18 años cumplidos al día', () => {
    expect(esMayorDeEdad('2008-11-08', '2026-11-08')).toBe(true)
    expect(esMayorDeEdad('2008-11-09', '2026-11-08')).toBe(false)
  })
})
