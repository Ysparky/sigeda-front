import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PERMISO } from '@/lib/api/errors'
import { sigeda } from '@/lib/api/sigeda'
import { tokens } from '@/lib/auth/tokens'
import { jwtDePrueba } from '@/mocks/sigeda/auth'
import { iniciarComo } from '@/test/render'

type Indices = {
  nfpi: number | null
  nit: { valor: number | null; nct: number | null; nei: number | null; asignaturasSinNota: string[]; reduccionPorRezagadoAplicada: boolean }
  nia: {
    valor: number | null
    motivo: string | null
    fases: {
      sigla: string
      peso: number
      valor: number | null
      subfases: {
        idSubfase: number
        peso: number
        nsf: number | null
        misiones: number
        ponderacion: string | null
        cobertura: number | null
        motivo: string | null
      }[]
    }[]
  }
}

type Merito = {
  content: { puesto: number | null; codigo: string; grupo: string; nfpi: number | null; nia: number | null; motivoSinNfpi: string | null }[]
  totalElements: number
  totalPages: number
}

const ESPERADOS: Record<string, [nfpi: number | null, nit: number | null, nia: number | null]> = {
  '222222': [17.16, 17.2, 17.15],
  '555555': [16.44, 17.6, 16.15],
  '999999': [15.28, 14.8, 15.4],
  '111111': [15.28, 15.8, 15.15],
  '777777': [12.96, 13.8, 12.75],
  '666666': [null, 12.8, null],
  '654321': [null, null, null],
}

describe('contrato §3.1: el legajo ajeno', () => {
  // §3.1 restringe el legajo ajeno con 403 D11. El mock no lo comprobaba y el servidor sí lo hace
  // desde la tanda D1, así que este caso pasaba de 200 contra el mock a 403 contra el servidor.
  it('un alumno no puede pedir los índices de otro', async () => {
    await iniciarComo('alumno.lopez')
    await expect(sigeda.get<Indices>('/api/personas/666666/indices')).rejects.toThrow()
  })

  it('un alumno sí puede pedir los propios', async () => {
    await iniciarComo('alumno.lopez')
    const propios = await sigeda.get<Indices>('/api/personas/111111/indices')
    expect(propios.nia.fases).toHaveLength(3)
  })
})

describe('GET /api/personas/{cod}/indices', () => {
  it('contrato §9.5 las siete fijaciones son exactamente las del contrato', async () => {
    await iniciarComo('instructor.perez')
    for (const [codigo, [nfpi, nit, nia]] of Object.entries(ESPERADOS)) {
      const indices = await sigeda.get<Indices>(`/api/personas/${codigo}/indices`)
      expect([indices.nfpi, indices.nit.valor, indices.nia.valor]).toEqual([nfpi, nit, nia])
    }
  })

  it('contrato §9.5 el desglose baja a las cinco subfases de NFAD y sus pesos suman 1.00', async () => {
    await iniciarComo('instructor.perez')
    const indices = await sigeda.get<Indices>('/api/personas/777777/indices')
    const [adaptacion, helitransportadas, aerotacticas] = indices.nia.fases
    expect(indices.nia.fases.map((fase) => fase.sigla)).toEqual(['NFAD', 'NFOH', 'NFOA'])
    expect(indices.nia.fases.reduce((suma, fase) => suma + fase.peso, 0)).toBeCloseTo(1, 10)
    expect(adaptacion?.subfases.map((subfase) => subfase.idSubfase)).toEqual([1, 2, 3, 5, 4])
    expect(adaptacion?.subfases.reduce((suma, subfase) => suma + subfase.peso, 0)).toBeCloseTo(1, 10)
    expect(helitransportadas?.subfases).toEqual([])
    expect(aerotacticas?.subfases).toEqual([])
    expect(adaptacion?.subfases.find((subfase) => subfase.idSubfase === 3)?.misiones).toBe(5)
    expect(adaptacion?.subfases.find((subfase) => subfase.idSubfase === 1)?.misiones).toBe(0)
  })

  // Tanda H. Las tres formas nuevas se comprobaron contra la respuesta del servidor vivo:
  // GET /api/personas/555555/indices da Contacto con nsf 14.75, ponderacion "PDI", cobertura 0.5714
  // y su motivo, y las cuatro sub fases sin misiones calificadas con los tres campos en null salvo
  // el motivo. El mock reproduce ese estado mixto, que es el que la pantalla tiene que sostener.
  it('contrato §3.1 cada sub fase declara su ponderación, su cobertura y su motivo', async () => {
    await iniciarComo('instructor.perez')
    const indices = await sigeda.get<Indices>('/api/personas/555555/indices')
    const subfases = indices.nia.fases.find((fase) => fase.sigla === 'NFAD')?.subfases ?? []
    const contacto = subfases.find((subfase) => subfase.idSubfase === 1)
    const navegacion = subfases.find((subfase) => subfase.idSubfase === 2)
    expect([contacto?.ponderacion, contacto?.cobertura]).toEqual(['PDI', 0.5714])
    expect(contacto?.motivo).toContain('0.5714 de 1.0000')
    // `cobertura` sólo tiene sentido con la ponderación del PDI: sin coeficientes no hay suma que
    // cubrir, y el servidor la manda en null junto a `ponderacion: "uniforme"`.
    expect([navegacion?.ponderacion, navegacion?.cobertura]).toEqual(['uniforme', null])
    expect(subfases.every((subfase) => (subfase.nsf === null) === (subfase.ponderacion === null))).toBe(true)
  })

  it('contrato §3.1 el motivo del NIA puede venir con un NIA que NO es null', async () => {
    await iniciarComo('instructor.perez')
    const indices = await sigeda.get<Indices>('/api/personas/555555/indices')
    expect(indices.nia.valor).toBe(16.15)
    expect(indices.nia.motivo).toBe(
      'El NIA no está ponderado con los coeficientes de misión del PDI: hay sub fases calculadas como promedio simple.',
    )
  })

  it('contrato §3.1 la frase que culpaba a los coeficientes de misión ya no la manda nadie', async () => {
    await iniciarComo('instructor.perez')
    for (const codigo of ['222222', '555555', '666666', '654321']) {
      const indices = await sigeda.get<Indices>(`/api/personas/${codigo}/indices`)
      expect(indices.nia.motivo ?? '').not.toContain('Falta la tabla de coeficientes de misión')
    }
    const merito = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&page=0&size=10')
    for (const fila of merito.content) {
      expect(fila.motivoSinNfpi ?? '').not.toContain('Falta la tabla de coeficientes de misión')
    }
  })

  it('contrato §9.5 666666 tiene NIT sin NIA, y 654321 llega todo en null con 200', async () => {
    await iniciarComo('instructor.perez')
    const incompleto = await sigeda.get<Indices>('/api/personas/666666/indices')
    expect(incompleto.nit.valor).toBe(12.8)
    expect(incompleto.nia.valor).toBeNull()
    expect(incompleto.nia.motivo).toBe('Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.')
    expect(incompleto.nia.fases.find((fase) => fase.sigla === 'NFAD')?.valor).toBe(14)
    const sinDatos = await sigeda.get<Indices>('/api/personas/654321/indices')
    expect([sinDatos.nfpi, sinDatos.nit.valor, sinDatos.nia.valor]).toEqual([null, null, null])
    expect(sinDatos.nia.motivo).not.toBeNull()
  })

  it('contrato §9.5 asignaturasSinNota nunca está vacío y ninguna nota está reducida', async () => {
    await iniciarComo('instructor.perez')
    for (const codigo of ['222222', '555555', '111111']) {
      const indices = await sigeda.get<Indices>(`/api/personas/${codigo}/indices`)
      expect(indices.nit.asignaturasSinNota.length).toBeGreaterThan(0)
      expect(indices.nit.reduccionPorRezagadoAplicada).toBe(false)
    }
  })

  it('contrato §3.1 pide Read y un código inexistente responde 404 D2', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/personas/000000/indices')).rejects.toMatchObject({
      status: 404,
      message: 'Persona especificada no existe.',
    })
    tokens.guardar(jwtDePrueba('raul.paredes'), '')
    await expect(sigeda.get('/api/personas/777777/indices')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })
})

describe('GET /api/reportes/orden-merito', () => {
  it('contrato §9.6 con View All Groups da cinco puestos y un alumno sin puesto al final', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&page=0&size=10')
    expect(pagina.content.map((fila) => [fila.puesto, fila.codigo])).toEqual([
      [1, '222222'],
      [2, '555555'],
      [3, '999999'],
      [4, '111111'],
      [5, '777777'],
      [null, '666666'],
    ])
    expect(pagina.totalElements).toBe(6)
    expect(pagina.content.map((fila) => fila.codigo)).not.toContain('654321')
    expect(pagina.content.at(-1)?.motivoSinNfpi).toBe(
      'Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas.',
    )
    expect(pagina.content.find((fila) => fila.codigo === '999999')?.grupo).toBe('Promoción 2026-A')
  })

  it('contrato §9.6 el empate de NFPI se rompe por NIA', async () => {
    await iniciarComo('comandante.aguirre')
    const pagina = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&page=0&size=10')
    const empatados = pagina.content.filter((fila) => fila.nfpi === 15.28)
    expect(empatados.map((fila) => [fila.codigo, fila.nia, fila.puesto])).toEqual([
      ['999999', 15.4, 3],
      ['111111', 15.15, 4],
    ])
  })

  it('contrato §4.1 sin View All Groups el alcance se limita a los grupos del instructor', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&page=0&size=10')
    expect(pagina.content.map((fila) => [fila.puesto, fila.codigo])).toEqual([
      [1, '222222'],
      [2, '555555'],
      [3, '111111'],
      [null, '666666'],
    ])
    expect(pagina.totalElements).toBe(4)
    expect(pagina.content.map((fila) => fila.codigo)).not.toContain('999999')
    expect(pagina.content.map((fila) => fila.codigo)).not.toContain('777777')
  })

  it('contrato §9.6 con idGrupo los puestos empiezan en 1 dentro del alcance pedido', async () => {
    await iniciarComo('instructor.perez')
    const pagina = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&idGrupo=3&page=0&size=10')
    expect(pagina.content.map((fila) => [fila.puesto, fila.codigo])).toEqual([
      [1, '555555'],
      [null, '666666'],
    ])
  })

  it('contrato §4.1 un idGrupo fuera del alcance del instructor responde 403 D17', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/reportes/orden-merito?programa=PDI&idGrupo=4')).rejects.toMatchObject({
      status: 403,
      message: 'No tiene permiso para ver este grupo.',
    })
  })

  it('contrato §4.1 un idGrupo inexistente responde 404 D18', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/reportes/orden-merito?programa=PDI&idGrupo=999')).rejects.toMatchObject({
      status: 404,
      message: 'Grupo especificada no existe.',
    })
  })

  it('contrato §9.6 el puesto no se reinicia por página', async () => {
    await iniciarComo('comandante.aguirre')
    const segunda = await sigeda.get<Merito>('/api/reportes/orden-merito?programa=PDI&page=1&size=2')
    expect(segunda.content.map((fila) => fila.puesto)).toEqual([3, 4])
    expect(segunda.totalPages).toBe(3)
  })

  it('contrato §9.6 pide Create Reports y PDE responde 404 D12', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/reportes/orden-merito?programa=PDE')).rejects.toMatchObject({
      status: 404,
      message: 'No existen alumnos con índices disponibles.',
    })
    await iniciarComo('jefe.operaciones')
    await expect(sigeda.get('/api/reportes/orden-merito?programa=PDI')).rejects.toMatchObject({
      status: 403,
      message: MENSAJE_SIN_PERMISO,
    })
  })

  it('contrato §4.1 un paginado con argumentos inválidos responde 400', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/reportes/orden-merito?programa=PDI&page=-1')).rejects.toMatchObject({
      status: 400,
      message: 'Argumento incorrecto',
    })
  })

  it('contrato §4.1 una propiedad de orden inválida responde 400', async () => {
    await iniciarComo('instructor.perez')
    await expect(sigeda.get('/api/reportes/orden-merito?programa=PDI&property=grupo')).rejects.toMatchObject({
      status: 400,
      message: 'Argumento incorrecto',
    })
  })
})
