import type { PuntoDeTendencia } from '../api'

type Props = {
  puntos: PuntoDeTendencia[]
  escala: { floor: number; ceiling: number }
  cortes: { optimo: number; regular: number }
}

const ANCHO = 720
const ALTO = 300
const IZQ = 40
const DER = 16
const ARRIBA = 16
const ABAJO = 36
const PLOT_ANCHO = ANCHO - IZQ - DER
const PLOT_ALTO = ALTO - ARRIBA - ABAJO

// La serie trae puntos reales (kind 'real') y proyectados (kind 'predicted'). El gráfico es una sola
// línea en el tiempo: tramo sólido sobre lo ya evaluado, tramo punteado sobre lo proyectado, y la
// banda de confianza (lowerBound..upperBound) sombreada sólo donde hay proyección.
export function GraficoDeTendencia({ puntos, escala, cortes }: Props) {
  const conValor = puntos.filter((punto) => punto.value !== null)
  if (conValor.length < 2) return null

  const n = puntos.length
  const x = (sequence: number) => {
    const indice = puntos.findIndex((punto) => punto.sequence === sequence)
    return IZQ + (n === 1 ? 0 : (indice / (n - 1)) * PLOT_ANCHO)
  }
  const y = (valor: number) => {
    const rango = escala.ceiling - escala.floor || 1
    const acotado = Math.max(escala.floor, Math.min(escala.ceiling, valor))
    return ARRIBA + (1 - (acotado - escala.floor) / rango) * PLOT_ALTO
  }

  const reales = puntos.filter((punto) => punto.kind === 'real' && punto.value !== null)
  const ultimoReal = reales[reales.length - 1]
  // La proyección arranca desde el último punto real para que la línea no quede cortada.
  const proyectados = puntos.filter((punto) => punto.kind === 'predicted' && punto.value !== null)
  const tramoProyectado = ultimoReal ? [ultimoReal, ...proyectados] : proyectados

  const linea = (serie: PuntoDeTendencia[]) =>
    serie.map((punto) => `${x(punto.sequence).toFixed(1)},${y(punto.value as number).toFixed(1)}`).join(' ')

  const conBanda = proyectados.filter(
    (punto) => punto.lowerBound !== undefined && punto.upperBound !== undefined,
  )
  const banda =
    ultimoReal && conBanda.length > 0
      ? [
          `${x(ultimoReal.sequence).toFixed(1)},${y(ultimoReal.value as number).toFixed(1)}`,
          ...conBanda.map((punto) => `${x(punto.sequence).toFixed(1)},${y(punto.upperBound as number).toFixed(1)}`),
          ...conBanda
            .slice()
            .reverse()
            .map((punto) => `${x(punto.sequence).toFixed(1)},${y(punto.lowerBound as number).toFixed(1)}`),
        ].join(' ')
      : null

  const marcasY = marcas(escala.floor, escala.ceiling)
  // Con muchas evaluaciones las etiquetas del eje X se enciman: se rotulan todos los proyectados y,
  // de los reales, uno de cada N más el primero y el último, para que no se solapen.
  const salto = Math.max(1, Math.ceil(reales.length / 8))
  const indiceReal = new Map(reales.map((punto, indice) => [punto.sequence, indice]))
  const conEtiqueta = (punto: PuntoDeTendencia) => {
    if (punto.kind === 'predicted') return true
    const indice = indiceReal.get(punto.sequence) ?? 0
    return indice % salto === 0 || indice === reales.length - 1
  }

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label="Tendencia de los puntajes del alumno con su proyección"
      >
        {marcasY.map((valor) => (
          <g key={`y-${valor}`}>
            <line
              x1={IZQ}
              x2={ANCHO - DER}
              y1={y(valor)}
              y2={y(valor)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text x={IZQ - 8} y={y(valor) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
              {valor}
            </text>
          </g>
        ))}

        {[cortes.regular, cortes.optimo].map((corte) => (
          <line
            key={`corte-${corte}`}
            x1={IZQ}
            x2={ANCHO - DER}
            y1={y(corte)}
            y2={y(corte)}
            className="stroke-muted-foreground/40"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        ))}

        {banda && <polygon points={banda} className="fill-primary/10" />}

        <polyline points={linea(reales)} fill="none" className="stroke-primary" strokeWidth={2.5} />
        {tramoProyectado.length >= 2 && (
          <polyline
            points={linea(tramoProyectado)}
            fill="none"
            className="stroke-primary/70"
            strokeWidth={2.5}
            strokeDasharray="5 4"
          />
        )}

        {puntos
          .filter((punto) => punto.value !== null)
          .map((punto) => (
            <g key={punto.label}>
              <circle
                cx={x(punto.sequence)}
                cy={y(punto.value as number)}
                r={punto.kind === 'real' ? 4 : 3.5}
                className={punto.kind === 'real' ? 'fill-primary' : 'fill-background stroke-primary/70'}
                strokeWidth={punto.kind === 'real' ? 0 : 2}
              />
              {conEtiqueta(punto) && (
                <text
                  x={x(punto.sequence)}
                  y={ALTO - ABAJO + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {punto.label}
                </text>
              )}
            </g>
          ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-primary" aria-hidden /> Evaluado
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5 bg-primary/70"
            style={{ backgroundImage: 'repeating-linear-gradient(90deg,currentColor 0 5px,transparent 5px 9px)' }}
            aria-hidden
          />{' '}
          Proyectado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-primary/10" aria-hidden /> Banda de confianza
        </span>
      </figcaption>
    </figure>
  )
}

// Marcas enteras y parejas del eje: los extremos más un par de cortes internos, sin saturar.
function marcas(floor: number, ceiling: number): number[] {
  const valores: number[] = []
  const paso = Math.max(1, Math.round((ceiling - floor) / 4))
  for (let valor = floor; valor <= ceiling; valor += paso) valores.push(valor)
  if (valores[valores.length - 1] !== ceiling) valores.push(ceiling)
  return valores
}
