import type { EventoCabina, Muestra, TelemetriaCabina } from './api'

/**
 * Una cabina FNPT II simulada para demostrar la integración: genera la telemetría que el adaptador real enviaría
 * (una muestra por segundo y los eventos del ejercicio). Es determinista por semilla, así que el mismo alumno y
 * la misma sesión dan el mismo vuelo; distintos alumnos dan desempeños distintos.
 */
function aleatorio(semilla: string) {
  let h = 2166136261
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

const redondear = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d

export function esImc(escenario: string) {
  return /IMC|referencias/i.test(escenario)
}

export function generarTelemetria(escenario: string, semilla: string): TelemetriaCabina {
  const azar = aleatorio(semilla)
  const imc = esImc(escenario)
  const falla = 10
  const reaccion = 1.2 + azar() * 3.2
  const respuesta = falla + reaccion
  const declara = falla + 2.5 + azar() * 9
  const listas = 2 + Math.floor(azar() * 3)
  const final = 50
  const vsFinal = -(180 + Math.floor(azar() * 520))
  const inestable = azar() < 0.35
  const muestras: Muestra[] = []

  let altitud = imc ? 2500 : 1500
  for (let t = 0; t <= final; t++) {
    let rpm = 100 + (azar() - 0.5)
    let velocidad = imc ? 90 : 80
    let vs = (azar() - 0.5) * 60
    if (t >= falla && t < respuesta) {
      rpm = imc ? 100 + (azar() - 0.5) * 2 : 100 - (t - falla + 1) * (4 + azar() * 2)
      vs = imc ? -400 - azar() * 600 : -300
      velocidad -= imc ? 5 : 8
    } else if (t >= respuesta) {
      rpm = 101 + (azar() - 0.4) * 7 - (inestable && t % 9 === 0 ? 14 : 0)
      const restante = final - t
      if (imc) {
        vs = restante <= 4 ? vsFinal : -150 + (azar() - 0.5) * 200
        velocidad = 85 + (azar() - 0.5) * 6
      } else {
        vs = restante <= 4 ? vsFinal - restante * 250 : -2300 + (azar() - 0.5) * 200
        velocidad = restante <= 4 ? 40 + restante * 6 : 65 + (azar() - 0.5) * 6
      }
    }
    if (t > 0) altitud = Math.max(0, altitud + vs / 60)
    if (!imc && t === final) altitud = 0
    muestras.push({ t, altitud: redondear(altitud), velocidad: redondear(velocidad), rpmRotor: redondear(rpm, 1), velocidadVertical: redondear(vs) })
  }

  const detallesListas = imc
    ? ['Actitud, rumbo y potencia', 'Lista de IMC inadvertido', 'Coordinación con control', 'Lista de recuperación']
    : ['Lista de falla de motor', 'Selección de zona de toma', 'Verificación de RPM del rotor', 'Lista antes de la toma']
  const eventos: EventoCabina[] = [
    { t: falla, tipo: 'FALLA', detalle: imc ? 'Entrada inadvertida en nubes (IMC)' : 'Falla de motor' },
    { t: redondear(respuesta, 1), tipo: 'RESPUESTA', detalle: imc ? 'Transición a instrumentos' : 'Entrada en autorrotación' },
    ...detallesListas.slice(0, listas).map((detalle, i) => ({ t: redondear(respuesta + 3 + i * 6, 1), tipo: 'CHECKLIST' as const, detalle })),
    { t: redondear(declara, 1), tipo: 'DECLARA_EMERGENCIA', detalle: imc ? 'PAN-PAN a control' : 'MAYDAY' },
    { t: final, tipo: 'FINAL', detalle: imc ? 'Recuperación de condiciones visuales' : 'Toma en autorrotación', valor: vsFinal },
  ]
  eventos.sort((a, b) => a.t - b.t)
  return { muestras, eventos }
}
