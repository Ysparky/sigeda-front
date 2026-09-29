import { describe, expect, it } from 'vitest'
import {
  INDICES,
  SEVERIDADES,
  TEXTO_ALERTAS_SIN_SERVIDOR,
  TEXTO_ALUMNOS_SIN_COINCIDENCIAS,
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
  TEXTO_ORDEN_MERITO_SIN_NFPI,
  TEXTO_MEDIA_SIMPLE_SUBFASE,
  TEXTO_MITAD_PRACTICA,
  TEXTO_MITAD_TEORICA,
  TEXTO_NOTA_QUE_NO_CUENTA,
  TEXTO_NOTA_QUE_PREVALECE,
  TEXTO_ORDEN_MERITO_SIN_SERVIDOR,
  TEXTO_PREVALECE_LA_PRIMERA_NOTA,
  TEXTO_REQUIERE_ATENCION,
  TEXTO_SIN_ALERTAS,
  TEXTO_SIN_ALUMNOS_ASIGNADOS,
  TEXTO_SIN_ALUMNOS_CON_INDICES,
  TEXTO_SIN_ALUMNOS_EN_PROGRAMA,
  TEXTO_SIN_CAUSALES,
  TEXTO_SIN_CHEQUEOS,
  TEXTO_SIN_COEFICIENTE_APLICADO,
  TEXTO_SIN_DATOS_SUFICIENTES,
  TEXTO_SIN_DESAPROBADOS,
  TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE,
  TEXTO_SIN_EXAMENES_DEL_ALUMNO,
  TEXTO_SIN_GRUPO,
  TEXTO_SIN_PROMEDIOS_PONDERADOS,
  TEXTO_SIN_SEGUNDA_NOTA,
  TEXTO_SIN_SUBFASE_ELEGIDA,
  TEXTO_SIN_TURNOS_DEL_ALUMNO,
  TEXTO_TURNO_SIN_CANTIDAD,
  TIPOS_ALERTA,
  coincideTexto,
  criterioDeFase,
  etiquetaDeCausal,
  etiquetaDeGrupo,
  etiquetaDeGrupoConNombre,
  etiquetaDePonderacion,
  etiquetaDeSeveridad,
  etiquetaDeTipoAlerta,
  formulaDeIndice,
  mediaSimple,
  ordinalDeSeveridad,
  ramasDeCriterio,
  requiereAtencion,
  resumirEstados,
  textoCriterioCumplido,
  textoDeCobertura,
  textoOrdenDeMeritoConsultado,
  textoSinNfpi,
} from './seguimiento'

describe('la ponderación y la cobertura del NSF', () => {
  it('distingue el NSF del PDI del promedio simple, que es lo que no se puede confundir', () => {
    expect(etiquetaDePonderacion('PDI')).toBe('Ponderada por el PDI')
    expect(etiquetaDePonderacion('uniforme')).toBe('Promedio simple')
    expect(etiquetaDePonderacion(null)).toBeNull()
    expect(etiquetaDePonderacion('otra')).toBeNull()
  })

  it('la sub fase terminada no dice nada, la incompleta dice su porcentaje y la repetida se delata', () => {
    expect(textoDeCobertura(1)).toBeNull()
    expect(textoDeCobertura(null)).toBeNull()
    expect(textoDeCobertura(0.5714)).toBe('Calculada sobre el 57 % de la sub fase, que está incompleta.')
    expect(textoDeCobertura(1.1429)).toBe('Cobertura 1.1429: hay misiones calificadas más de una vez.')
  })
})

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
  // El criterio 2 en la fase FINAL del programa es una DECISIÓN registrada y no una lectura del PDI, que
  // sólo reparte los dos criterios entre las tres fases del PCPH. Está explicada en `criterioDeFase` y en
  // `EvaluacionPractica.esCriterio2()` del servidor, que es la copia que tiene que decir lo mismo.
  it('M5-20 el criterio 1 rige las cuatro primeras fases y el 2 Vuelo por Instrumentos', () => {
    expect(criterioDeFase('Adaptación')).toBe(1)
    expect(criterioDeFase('Navegación Visual')).toBe(1)
    expect(criterioDeFase('Emergencias y Maniobras Avanzadas')).toBe(1)
    expect(criterioDeFase('Vuelo Nocturno')).toBe(1)
    expect(criterioDeFase('Vuelo por Instrumentos')).toBe(2)
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
    // CAMBIÓ RESPECTO DE LA SPEC §17.3 dos veces el 28 sep 2026, y la segunda vez enseña algo. El
    // texto original culpaba a la tabla de coeficientes de misión, que ya existe y el servidor usa
    // (el NSF de Control Básico de 555555 da 14.70 ponderado por horas). Se reemplazó por «ningún alumno
    // tiene NFPI porque solo hay sub fases de Adaptación», y **ese texto duró unas horas**: la
    // semilla del servidor pasó a tener las diez sub fases del PDI y 555555 apareció con NFPI 16.47 y
    // puesto 1. Moraleja, y es por lo que el texto de ahora habla de la dependencia y no de los
    // datos: un aviso que cuenta el estado de la base envejece con la próxima migración.
    expect(TEXTO_ORDEN_MERITO_SIN_NFPI).toBe(
      'El orden de mérito ordena por el índice final del PDI, y el servidor todavía lo calcula sobre notas de vuelo guardadas como texto (dependencia 62): ordenar y promediar texto es lexicográfico. Se muestra solo en modo mock.',
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

  it('M5-9 los textos que la spec no fija quedan igual de anclados, con su origen dicho', () => {
    expect(TEXTO_ESTADO_TEORICO_SIN_SERVIDOR).toBe(
      'El estado teórico y sus causales todavía no existen en el servidor.',
    )
    expect(TEXTO_SIN_SUBFASE_ELEGIDA).toBe('Elija una sub fase para ver su reporte y sus promedios.')
    expect(TEXTO_NOTA_QUE_PREVALECE).toBe('Esta nota es la que cuenta')
    expect(TEXTO_NOTA_QUE_NO_CUENTA).toBe('Esta nota no cuenta para el promedio')
    expect(TEXTO_MITAD_TEORICA).toBe('Mitad teórica (NIT)')
    expect(TEXTO_MITAD_PRACTICA).toBe('Mitad práctica (NIA)')
    expect(TEXTO_SIN_COEFICIENTE_APLICADO).toBe('Sin coeficiente aplicado por falta de nota:')
  })

  it('M5-9 los nueve textos que ninguna S-id nombra también quedan anclados byte a byte', () => {
    expect(TEXTO_ALUMNOS_SIN_COINCIDENCIAS).toBe('Ningún alumno coincide con los filtros.')
    expect(TEXTO_SIN_PROMEDIOS_PONDERADOS).toBe('Esta sub fase no tiene evaluaciones ponderadas.')
    expect(TEXTO_SIN_CHEQUEOS).toBe('Todavía no rindió ningún chequeo.')
    expect(TEXTO_SIN_CAUSALES).toBe('No tiene causales de bajo rendimiento académico.')
    expect(TEXTO_SIN_DESAPROBADOS).toBe('No tiene vuelos desaprobados.')
    expect(TEXTO_SIN_TURNOS_DEL_ALUMNO).toBe('Todavía no tiene turnos de vuelo registrados.')
    expect(TEXTO_SIN_EXAMENES_DEL_ALUMNO).toBe('Todavía no rindió exámenes teóricos.')
    expect(TEXTO_SIN_EVALUACIONES_EN_LA_SUBFASE).toBe('No tiene evaluaciones en esta sub fase.')
    expect(TEXTO_SIN_SEGUNDA_NOTA).toBe('Sin segunda nota: la subsanación está pendiente.')
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
    expect(textoSinNfpi('Sin nota en Emergencias y Maniobras Avanzadas')).toBe('Sin NFPI: Sin nota en Emergencias y Maniobras Avanzadas.')
  })

  it('M5-9 la etiqueta de grupo con nombre lleva siempre el id con que filtra la pantalla', () => {
    expect(etiquetaDeGrupoConNombre(6, 'Promoción 2026-A')).toBe('Grupo 6 · Promoción 2026-A')
    expect(etiquetaDeGrupoConNombre(3, 'Grupo 3')).toBe('Grupo 3')
    expect(etiquetaDeGrupoConNombre(4, '  ')).toBe('Grupo 4')
    expect(etiquetaDeGrupoConNombre(4, null)).toBe('Grupo 4')
    expect(etiquetaDeGrupoConNombre(null, 'Promoción 2026-A')).toBe(TEXTO_SIN_GRUPO)
  })
})

describe('textoSinNfpi', () => {
  // Las pruebas de pantalla llaman a textoSinNfpi en los dos lados de la aserción, así que el
  // punto doble les pasaba inadvertido. Acá se fija el literal.
  it('no duplica el punto cuando el motivo ya termina en uno', () => {
    expect(textoSinNfpi('Sin nota en Navegación Visual ni en Emergencias y Maniobras Avanzadas.')).toBe(
      'Sin NFPI: Sin nota en Navegación Visual ni en Emergencias y Maniobras Avanzadas.',
    )
  })

  it('agrega el punto cuando el motivo no lo trae', () => {
    expect(textoSinNfpi('No tiene evaluaciones registradas')).toBe('Sin NFPI: No tiene evaluaciones registradas.')
  })

  it('sin motivo no deja un punto huérfano', () => {
    expect(textoSinNfpi('')).toBe('Sin NFPI.')
  })
})
