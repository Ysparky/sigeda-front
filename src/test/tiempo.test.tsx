import { screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { buscarDocumento, consultar, datosIa } from '@/mocks/ia/datos'
import { server } from '@/mocks/server'
import { buscarTurnoTeorico } from '@/mocks/sigeda/datos'
import { ID_TURNO_ABIERTO } from '@/mocks/sigeda/semilla-teoria'
import { estadoDeVentana, milisegundosRestantes } from '@/lib/dominio/teoria'
import { iniciarComo, renderApp } from './render'
import { abrirVentanaDeExamen, relojFalso } from './tiempo'

const RUTA_PRUEBA = `${config.iaApiUrl}/prueba-de-reloj`

const ID_LENTO = 'd0c00000-0000-4000-8000-000000000004'
const ID_ETERNO = 'd0c00000-0000-4000-8000-000000000006'

describe('reloj falso', () => {
  it('M3-17 una respuesta demorada llega solo al avanzar el reloj', async () => {
    const { avanzar } = relojFalso()
    server.use(
      http.get(RUTA_PRUEBA, async () => {
        await delay(3000)
        return HttpResponse.json({ listo: true })
      }),
    )
    let recibido: unknown = null
    const peticion = fetch(RUTA_PRUEBA)
      .then((respuesta) => respuesta.json())
      .then((cuerpo) => {
        recibido = cuerpo
      })
    await avanzar(2900)
    expect(recibido).toBeNull()
    await avanzar(100)
    await peticion
    expect(recibido).toEqual({ listo: true })
  })

  it('M3-17 una petición que nunca responde se corta con AbortController', async () => {
    const { avanzar } = relojFalso()
    server.use(http.get(RUTA_PRUEBA, async () => { await delay('infinite') }))
    const control = new AbortController()
    setTimeout(() => control.abort(), 120_000)
    let cortada = false
    const peticion = fetch(RUTA_PRUEBA, { signal: control.signal }).catch(() => {
      cortada = true
    })
    await avanzar(119_000)
    expect(cortada).toBe(false)
    await avanzar(1000)
    await peticion
    expect(cortada).toBe(true)
  })

  it('M3-17 userEvent avanza el reloj falso y abre un diálogo de la aplicación', async () => {
    const { usuario } = relojFalso()
    await iniciarComo('comandante.aguirre')
    renderApp('/programa/materias', usuario)
    await screen.findByRole('table', { name: 'Materias del curso' })
    await usuario.click(screen.getByRole('button', { name: 'Registrar materia' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('contador de consultas de los documentos', () => {
  it('contrato §7.1 el documento lento queda listo en su tercera consulta y el eterno nunca', () => {
    const lento = buscarDocumento(ID_LENTO)
    const eterno = buscarDocumento(ID_ETERNO)
    expect(lento?.status).toBe('processing')
    expect(consultar(lento!).status).toBe('processing')
    expect(consultar(lento!).status).toBe('processing')
    expect(consultar(lento!).status).toBe('ready')
    expect(lento?.tags).toEqual(['aerodinámica'])
    expect(lento?.consultas).toBe(3)
    for (let vuelta = 0; vuelta < 40; vuelta += 1) consultar(eterno!)
    expect(eterno?.status).toBe('processing')
    expect(eterno?.consultas).toBe(40)
  })

  it('M3-17 reiniciarIaMock devuelve los documentos y sus contadores al estado inicial', () => {
    expect(buscarDocumento(ID_LENTO)?.status).toBe('processing')
    expect(buscarDocumento(ID_LENTO)?.consultas).toBe(0)
    expect(buscarDocumento(ID_LENTO)?.tags).toEqual([])
    expect(buscarDocumento(ID_ETERNO)?.consultas).toBe(0)
    expect(datosIa().sesiones).toEqual([])
  })
})

describe('ventana del examen en las pruebas', () => {
  it('M4-19 abre la ventana del turno 3 alrededor del reloj falso', () => {
    relojFalso()
    const turno = abrirVentanaDeExamen({ transcurridos: 5, restantes: 25 })
    expect(turno.horaInicio).toBe('08:55')
    expect(turno.horaFin).toBe('09:25')
    expect(estadoDeVentana(turno.fechaExamen, turno.horaInicio, turno.horaFin)).toBe('EN_CURSO')
    expect(milisegundosRestantes(turno.fechaExamen, turno.horaFin)).toBe(25 * 60_000)
  })

  it('M4-19 avanzar el reloj los minutos restantes cierra la ventana', async () => {
    const { avanzar } = relojFalso()
    const turno = abrirVentanaDeExamen({ restantes: 10 })
    await avanzar(10 * 60_000 + 1000)
    expect(estadoDeVentana(turno.fechaExamen, turno.horaInicio, turno.horaFin)).toBe('FINALIZADO')
    expect(milisegundosRestantes(turno.fechaExamen, turno.horaFin)).toBe(0)
  })

  it('M4-19 exige el reloj falso y deja el turno en 00:00–23:59 después de reiniciar', () => {
    expect(() => abrirVentanaDeExamen()).toThrow('abrirVentanaDeExamen se llama despues de relojFalso()')
    const turno = buscarTurnoTeorico(ID_TURNO_ABIERTO)
    expect([turno?.horaInicio, turno?.horaFin]).toEqual(['00:00', '23:59'])
  })
})
