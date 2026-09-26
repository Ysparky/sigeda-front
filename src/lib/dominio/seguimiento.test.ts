import { describe, expect, it } from 'vitest'
import {
  INDICES,
  SEVERIDADES,
  TEXTO_ALERTAS_SIN_SERVIDOR,
  TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR,
  TEXTO_CHEQUEO_SIN_SERVIDOR,
  TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR,
  TEXTO_DESEMPATE,
  TEXTO_ESTADO_TEORICO_EN_LOTE,
  TEXTO_ESTADO_TEORICO_SIN_SERVIDOR,
  TEXTO_ESTADO_YA_CAMBIO,
  TEXTO_EVALUADOR_SIN_CODIGO,
  TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR,
  TEXTO_INDICES_SIN_SERVIDOR,
  TEXTO_INDICES_SOLO_MOCK,
  TEXTO_MEDIA_SIMPLE_SUBFASE,
  TEXTO_NOTA_QUE_PREVALECE,
  TEXTO_NO_REEMPLAZA_LA_NOTA,
  TEXTO_ORDEN_MERITO_SIN_SERVIDOR,
  TEXTO_PREVALECE_LA_PRIMERA_NOTA,
  TEXTO_REQUIERE_ATENCION,
  TEXTO_SIN_ALERTAS,
  TEXTO_SIN_ALUMNOS_ASIGNADOS,
  TEXTO_SIN_ALUMNOS_CON_INDICES,
  TEXTO_SIN_ALUMNOS_EN_PROGRAMA,
  TEXTO_SIN_DATOS_SUFICIENTES,
  TEXTO_SIN_GRUPO,
  TEXTO_SIN_SUBFASE_ELEGIDA,
  TEXTO_TURNO_SIN_CANTIDAD,
  TIPOS_ALERTA,
  coincideTexto,
  criterioDeFase,
  etiquetaDeCausal,
  etiquetaDeGrupo,
  etiquetaDeSeveridad,
  etiquetaDeTipoAlerta,
  formulaDeIndice,
  mediaSimple,
  ordinalDeSeveridad,
  ramasDeCriterio,
  requiereAtencion,
  resumirEstados,
  textoCriterioCumplido,
  textoOrdenDeMeritoConsultado,
  textoRegularAlternado,
  textoSinNfpi,
} from './seguimiento'

describe('vocabulario de seguimiento', () => {
  it('M5-20 etiqueta los cinco tipos de alerta del contrato', () => {
    expect(TIPOS_ALERTA.map((tipo) => tipo.valor)).toEqual([
      'VUELO_DESAPROBADO',
      'ESTADO_CRITICO',
      'CHEQUEO_PENDIENTE',
      'SUBSANACION_PENDIENTE',
      'CAUSAL_TEORICO',
    ])
    expect(etiquetaDeTipoAlerta('VUELO_DESAPROBADO')).toBe('Vuelo desaprobado')
    expect(etiquetaDeTipoAlerta('SUBSANACION_PENDIENTE')).toBe('Subsanación pendiente')
    expect(etiquetaDeTipoAlerta('OTRO')).toBe('OTRO')
  })

  it('M5-20 ordena las severidades por ordinal y no por su etiqueta', () => {
    expect(SEVERIDADES.map((severidad) => severidad.valor)).toEqual(['ALTA', 'MEDIA', 'BAJA'])
    expect(etiquetaDeSeveridad('ALTA')).toBe('Alta')
    expect([ordinalDeSeveridad('ALTA'), ordinalDeSeveridad('MEDIA'), ordinalDeSeveridad('BAJA')]).toEqual([1, 2, 3])
    expect(['ALTA', 'MEDIA', 'BAJA'].toSorted()).toEqual(['ALTA', 'BAJA', 'MEDIA'])
    expect(['ALTA', 'MEDIA', 'BAJA'].toSorted((a, b) => ordinalDeSeveridad(a) - ordinalDeSeveridad(b))).toEqual([
      'ALTA',
      'MEDIA',
      'BAJA',
    ])
  })

  it('M5-20 etiqueta los siete códigos de causal del PDI', () => {
    expect(etiquetaDeCausal('PROMEDIO_ASIGNATURA')).toBe('Promedio de asignatura bajo 13')
    expect(etiquetaDeCausal('TRES_ASIGNATURAS')).toBe('Tres asignaturas desaprobadas')
    expect(etiquetaDeCausal('DOS_EXAMENES')).toBe('Dos exámenes desaprobados')
    expect(etiquetaDeCausal('SEGUNDA_SUBSANACION')).toBe('Segunda subsanación desaprobada')
    expect(etiquetaDeCausal('PERIODICOS_CRITICOS')).toBe('Periódicos de emergencias y límites')
    expect(etiquetaDeCausal('PERIODICOS_GENERALES')).toBe('Periódicos generales')
    expect(etiquetaDeCausal('INOPINADOS')).toBe('Inopinados desaprobados')
    expect(etiquetaDeCausal('OTRA')).toBe('OTRA')
  })
})

describe('ciclo de chequeo', () => {
  it('M5-20 el criterio 1 rige Adaptación y Helitransportadas y el 2 Aerotácticas', () => {
    expect(criterioDeFase('Adaptación')).toBe(1)
    expect(criterioDeFase('Operaciones HeliTransportadas')).toBe(1)
    expect(criterioDeFase('Operaciones AeroTácticas')).toBe(2)
    expect(criterioDeFase('')).toBe(1)
  })

  it('M5-20 cada criterio nombra las ramas que el PDI define', () => {
    expect(ramasDeCriterio(1)).toEqual([
      '3 vuelos Malos',
      '2 Malos y 2 Regulares alternados',
      '1 Malo y 4 Regulares alternados',
      '6 Regulares alternados',
    ])
    expect(ramasDeCriterio(2)).toEqual(['2 vuelos Malos', '1 Malo y 2 Regulares alternados', '4 Regulares alternados'])
  })

  it('M5-20 la regla del Regular alternado se dice en los dos sentidos', () => {
    expect(textoRegularAlternado(true)).toBe('El próximo calificativo Regular contará para el criterio.')
    expect(textoRegularAlternado(false)).toBe(
      'El próximo calificativo Regular no contará: solo cuentan los Regulares alternados.',
    )
  })
})

describe('estados del escuadrón', () => {
  it('M5-24 requiereAtencion marca todo estado distinto de Apto', () => {
    expect(requiereAtencion('Apto')).toBe(false)
    expect(requiereAtencion('En Chequeo')).toBe(true)
    expect(requiereAtencion('En Observación')).toBe(true)
    expect(requiereAtencion('No Apto')).toBe(true)
  })

  it('M5-24 resume los estados en el orden del vocabulario y omite los vacíos', () => {
    expect(resumirEstados(['En Chequeo', 'Apto', 'Apto', 'No Apto'])).toEqual([
      { estado: 'Apto', cantidad: 2 },
      { estado: 'En Chequeo', cantidad: 1 },
      { estado: 'No Apto', cantidad: 1 },
    ])
    expect(resumirEstados([])).toEqual([])
  })

  it('M5-23 coincideTexto ignora mayúsculas y tildes', () => {
    expect(coincideTexto('Lucía Mendoza Ríos', 'lucia')).toBe(true)
    expect(coincideTexto('Lucía Mendoza Ríos', 'RIOS')).toBe(true)
    expect(coincideTexto('Lucía Mendoza Ríos', 'torres')).toBe(false)
    expect(coincideTexto('Lucía Mendoza Ríos', '')).toBe(true)
  })
})

describe('la única cifra derivada de M5', () => {
  it('M5-4 mediaSimple promedia los promedios del servidor y no inventa nada', () => {
    expect(mediaSimple([12, 12, 12, 12, 17])).toBe(13)
    expect(mediaSimple([14, 15])).toBe(14.5)
    expect(mediaSimple([15, 17])).toBe(16)
    expect(mediaSimple([16.5])).toBe(16.5)
    expect(mediaSimple([])).toBeNull()
  })

  it('M5-2 cada índice lleva su fórmula como texto y ninguna se evalúa', () => {
    expect(INDICES.map((indice) => indice.clave)).toEqual(['NFPI', 'NIT', 'NCT', 'NEI', 'NIA'])
    expect(formulaDeIndice('NFPI')).toBe('NIT (0.2) + NIA (0.8)')
    expect(formulaDeIndice('NIA')).toBe('NFAD (0.40) + NFOH (0.35) + NFOA (0.25)')
    expect(formulaDeIndice('NSF')).toBe('')
  })
})

describe('textos fijos de la spec §17.3', () => {
  it('M5-9 los textos sin parámetros son los de la spec, byte a byte', () => {
    expect(TEXTO_INDICES_SOLO_MOCK).toBe(
      'Los índices del PDI y el orden de mérito todavía no existen en el servidor: se muestran solo en modo mock.',
    )
    expect(TEXTO_SIN_ALUMNOS_ASIGNADOS).toBe(
      'No tiene alumnos asignados en este programa: aparecen aquí cuando haya volado un turno con ellos.',
    )
    expect(TEXTO_SIN_GRUPO).toBe('Sin grupo')
    expect(TEXTO_ESTADO_TEORICO_EN_LOTE).toBe('No se pudo comprobar el estado teórico de estos alumnos.')
    expect(TEXTO_SIN_ALUMNOS_EN_PROGRAMA).toBe('Todavía no hay alumnos en este programa.')
    expect(TEXTO_SIN_ALERTAS).toBe('No hay alertas abiertas en los grupos que usted ve.')
    expect(TEXTO_ALERTAS_SIN_SERVIDOR).toBe(
      'El listado de alertas del escuadrón todavía no existe en el servidor. Consulte los vuelos desaprobados de cada alumno en su legajo.',
    )
    expect(TEXTO_MEDIA_SIMPLE_SUBFASE).toBe(
      'Promedio simple de las evaluaciones Ponderada y Chequeo Sub Fase de esta subfase. No es la nota de sub fase del PDI, que pondera cada misión por su coeficiente.',
    )
    expect(TEXTO_EVALUADOR_SIN_CODIGO).toBe('El servidor guarda el nombre del evaluador, no su código.')
    expect(TEXTO_TURNO_SIN_CANTIDAD).toBe(
      'La cantidad de alumnos del turno no está disponible: el servidor informa otro campo.',
    )
    expect(TEXTO_CHEQUEO_LO_DECIDE_EL_SERVIDOR).toBe('El cambio de estado lo decide el servidor en la próxima evaluación.')
    expect(TEXTO_ESTADO_YA_CAMBIO).toBe('El estado ya cambió: los contadores no se moverán hasta que vuelva a Apto.')
    expect(TEXTO_CHEQUEO_SIN_SERVIDOR).toBe('El historial de chequeos y los contadores todavía no existen en el servidor.')
    expect(TEXTO_SIN_DATOS_SUFICIENTES).toBe('Sin datos suficientes')
    expect(TEXTO_INDICES_SIN_SERVIDOR).toBe('El servidor todavía no calcula los índices del PDI.')
    expect(TEXTO_HISTORIAL_TEORICO_SIN_SERVIDOR).toBe(
      'El historial de exámenes teóricos todavía no existe en el servidor.',
    )
    expect(TEXTO_SIN_ALUMNOS_CON_INDICES).toBe('Todavía no hay alumnos con índices calculados en este programa.')
    expect(TEXTO_ORDEN_MERITO_SIN_SERVIDOR).toBe('El servidor todavía no calcula el orden de mérito.')
    expect(TEXTO_PREVALECE_LA_PRIMERA_NOTA).toBe(
      'Prevalece la primera nota: es la que entra en el promedio. La subsanación levanta el bloqueo para volar y queda como evidencia.',
    )
    expect(TEXTO_DESEMPATE).toBe('Desempate: mayor NIA y, si persiste, menor código.')
    expect(TEXTO_REQUIERE_ATENCION).toBe('Requiere atención')
    expect(TEXTO_DESAPROBADOS_LOS_VE_SU_INSTRUCTOR).toBe('Los vuelos desaprobados los consulta su instructor.')
  })

  it('M5-9 los dos textos que la spec no fija quedan igual de anclados, con su origen dicho', () => {
    expect(TEXTO_ESTADO_TEORICO_SIN_SERVIDOR).toBe(
      'El estado teórico y sus causales todavía no existen en el servidor.',
    )
    expect(TEXTO_SIN_SUBFASE_ELEGIDA).toBe('Elija una sub fase para ver su reporte y sus promedios.')
    expect(TEXTO_NOTA_QUE_PREVALECE).toBe('Esta nota es la que cuenta')
    expect(TEXTO_NO_REEMPLAZA_LA_NOTA).toBe('No reemplaza la nota anterior')
  })

  it('M5-9 los cuatro textos con parámetros los interpolan como la spec los escribe', () => {
    expect(etiquetaDeGrupo(6)).toBe('Grupo 6')
    expect(etiquetaDeGrupo(null)).toBe('Sin grupo')
    expect(textoCriterioCumplido('Adaptación', '3 vuelos Malos')).toBe(
      'Alcanzó el criterio de chequeo de Adaptación: 3 vuelos Malos.',
    )
    expect(textoOrdenDeMeritoConsultado('26/09/2026', '09:15')).toBe(
      'Orden de mérito consultado el 26/09/2026 a las 09:15. El servidor lo calcula en cada consulta.',
    )
    expect(textoSinNfpi('Sin nota en Operaciones AeroTácticas')).toBe('Sin NFPI: Sin nota en Operaciones AeroTácticas.')
  })
})
