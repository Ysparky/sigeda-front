# La estructura del programa en el aire (Tabla 4)

Cinco fases, doce sub fases, **73 misiones** y **94.0 h**. Es la estructura que el sistema implementa
desde la migración `019-estructura-tabla-4.sql`, y **sustituye** a las tres fases y diez sub fases del
PCPH 2024 que estaban antes (`coeficientes-de-mision-pdi.md`, ahora derogado). Son currículas
distintas, no un ajuste: ningún nombre de sub fase coincide.

Este documento existe por lo mismo que el anterior: el coeficiente de misión **no se guarda** en la
base —`misiones` guarda `horas`— y el peso de fase **tampoco**. Los dos se derivan, así que si alguien
mueve una hora, cambia silenciosamente el peso de todo lo que cuelga de ella. Acá están los números y
de dónde sale cada uno.

## Los dos denominadores, que NO son el mismo

Hay dos divisiones distintas y confundirlas es el error que este documento previene:

| | numerador | denominador | dónde vive |
|---|---|---|---|
| **Peso de fase** (en el NIA) | horas DECLARADAS de la fase | las **94.0 h** del programa | `PesosDelPdi` |
| **Peso de sub fase** (en la nota de fase) | horas DECLARADAS de la sub fase | horas declaradas de su fase | `PesosDelPdi` |
| **Coeficiente de misión** (en el NSF) | horas de la misión | **suma REAL** de las horas de las misiones de su sub fase | derivado de `misiones.horas` |

Las dos primeras usan lo **declarado**; la tercera, la **suma real**. Coinciden en diez de las doce sub
fases y difieren en dos, por un defecto de la Tabla 4 que se explica más abajo.

## Las cinco fases y su peso en el NIA

| # | Fase | Sigla | Sub fases | Horas | Peso (horas / 94.0) |
|---|---|---|---:|---:|---|
| 1 | Adaptación | `NFAD` | 3 | 26.0 | `0.2766` |
| 2 | Navegación Visual | `NFNV` | 3 | 22.0 | `0.2340` |
| 3 | Emergencias y Maniobras Avanzadas | `NFEM` | 2 | 15.0 | `0.1596` |
| 4 | Vuelo Nocturno | `NFVN` | 2 | 15.0 | `0.1596` |
| 5 | Vuelo por Instrumentos | `NFVI` | 2 | 16.0 | `0.1702` |
| | **Total** | | **12** | **94.0** | **`1.0000`** |

Los pesos de fase **no los publica la Tabla 4**: el PDI EA-510 sólo publica pesos para las tres fases
del PCPH (NFAD 0.40 · NFOH 0.35 · NFOA 0.25), que ya no existen. Son **proporcionales a las horas**, que
es el mismo criterio que la propia tabla aplica dentro de la sub fase. Es una **decisión registrada**, no
una lectura de la norma.

**Y no se pueden sumar para comprobarlos.** A cuatro decimales los de las sub fases de Adaptación dan
`0.4231 + 0.3462 + 0.2308 = 1.0001`. Por eso el cálculo **no los usa como operandos**: pondera por HORAS
y divide UNA sola vez al final (`CalculoDeIndices.ponderadoPorHoras`). Los pesos de este documento son la
cifra que la respuesta **publica**, no la que multiplica.

## Las doce sub fases

| # | Sub fase | Sigla | Fase | Misiones | Horas declaradas | Σ horas de sus misiones | Peso en su fase |
|---|---|---|---|---:|---:|---:|---|
| 1 | Control Básico | `CB` | NFAD | 9 | 11.0 | 10.4 ⚠ | `0.4231` |
| 2 | Circuitos y Maniobras | `CM` | NFAD | 7 | 9.0 | 8.5 ⚠ | `0.3462` |
| 3 | Control Preciso | `CP` | NFAD | 5 | 6.0 | 6.0 | `0.2308` |
| 4 | Navegación Local | `NL` | NFNV | 6 | 7.0 | 7.0 | `0.3182` |
| 5 | Navegación en Ruta | `NR` | NFNV | 7 | 9.0 | 9.0 | `0.4091` |
| 6 | Navegación Compleja | `NC` | NFNV | 4 | 6.0 | 6.0 | `0.2727` |
| 7 | Autorrotación | `AU` | NFEM | 5 | 6.0 | 6.0 | `0.4000` |
| 8 | Falla Sistemas y Maniobras | `FS` | NFEM | 7 | 9.0 | 9.0 | `0.6000` |
| 9 | Adaptación y Navegación | `AN` | NFVN | 5 | 7.0 | 7.0 | `0.4667` |
| 10 | Emergencias | `EM` | NFVN | 6 | 8.0 | 8.0 | `0.5333` |
| 11 | Procedimientos y Aproximación IFR | `PA` | NFVI | 6 | 9.0 | 9.0 | `0.5625` |
| 12 | Emergencias IFR y Recuperación | `ER` | NFVI | 6 | 7.0 | 7.0 | `0.4375` |

## Las dos sub fases que no cuadran, y qué se hizo

**Es un defecto de la Tabla 4, no de la extracción.** En diez de las doce, la suma de las horas por
sesión da EXACTAMENTE el total que la fila declara. En dos no:

| Sub fase | Σ sesiones | declara | falta |
|---|---:|---:|---:|
| Control Básico | **10.4** | 11.0 | 0.6 |
| Circuitos y Maniobras | **8.5** | 9.0 | 0.5 |

Los totales por fase y el **94.0** del programa cuadran con lo **declarado**, así que manda lo declarado.
La decisión, registrada:

- **Los pesos del NIA usan lo declarado** (11.0 y 9.0). Es lo que hace que las cinco fases sumen 94.0.
- **El coeficiente de misión usa la suma REAL** (10.4 y 8.5). Es lo único que hace que cada sub fase
  cierre en `1.0000` **sin inventarle horas a ninguna sesión**, que era la otra salida y habría sido dato
  fabricado.

Las dos cifras conviven a propósito. `unit_test.SemillaSubfasesDelNiaTest` afirma **10.4 y 8.5** —las
reales— y `PesosDelPdi` tiene **11.0 y 9.0**; si alguien las «arregla» para que coincidan, rompe una de
las dos propiedades.

## Los coeficientes de misión, sub fase por sub fase

El coeficiente es `horas de la misión / Σ horas de las misiones de la sub fase`, y **no se guarda**.

### `CB` · Control Básico — 9 misiones, 10.4 h (la tabla declara 11.0)

| Misión | Horas | Coeficiente |
|---|---:|---|
| `CB-1` | 1.0 | `0.0962` |
| `CB-2` | 1.2 | `0.1154` |
| `CB-3` | 1.2 | `0.1154` |
| `CB-4` | 1.3 | `0.1250` |
| `CB-5` | 1.3 | `0.1250` |
| `CB-6` | 1.2 | `0.1154` |
| `CB-7` | 1.2 | `0.1154` |
| `CB-8` | 1.0 | `0.0962` |
| `CB-9` | 1.0 | `0.0962` |
| | **10.4** | **`1.0002`** |

### `CM` · Circuitos y Maniobras — 7 misiones, 8.5 h (la tabla declara 9.0)

| Misión | Horas | Coeficiente |
|---|---:|---|
| `CM-1` | 1.0 | `0.1176` |
| `CM-2` | 1.2 | `0.1412` |
| `CM-3` | 1.3 | `0.1529` |
| `CM-4` | 1.5 | `0.1765` |
| `CM-5` | 1.3 | `0.1529` |
| `CM-6` | 1.2 | `0.1412` |
| `CM-7` | 1.0 | `0.1176` |
| | **8.5** | **`0.9999`** |

### `CP` · Control Preciso — 5 misiones, 6.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `CP-1` | 1.2 | `0.2000` |
| `CP-2` | 1.2 | `0.2000` |
| `CP-3` | 1.2 | `0.2000` |
| `CP-4` | 1.2 | `0.2000` |
| `CP-5` | 1.2 | `0.2000` |
| | **6.0** | **`1.0000`** |

### `NL` · Navegación Local — 6 misiones, 7.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `NL-1` | 1.0 | `0.1429` |
| `NL-2` | 1.2 | `0.1714` |
| `NL-3` | 1.2 | `0.1714` |
| `NL-4` | 1.2 | `0.1714` |
| `NL-5` | 1.2 | `0.1714` |
| `NL-6` | 1.2 | `0.1714` |
| | **7.0** | **`0.9999`** |

### `NR` · Navegación en Ruta — 7 misiones, 9.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `NR-1` | 1.0 | `0.1111` |
| `NR-2` | 1.0 | `0.1111` |
| `NR-3` | 1.5 | `0.1667` |
| `NR-4` | 1.5 | `0.1667` |
| `NR-5` | 1.5 | `0.1667` |
| `NR-6` | 1.5 | `0.1667` |
| `NR-7` | 1.0 | `0.1111` |
| | **9.0** | **`1.0001`** |

### `NC` · Navegación Compleja — 4 misiones, 6.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `NC-1` | 1.5 | `0.2500` |
| `NC-2` | 1.5 | `0.2500` |
| `NC-3` | 1.5 | `0.2500` |
| `NC-4` | 1.5 | `0.2500` |
| | **6.0** | **`1.0000`** |

### `AU` · Autorrotación — 5 misiones, 6.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `AU-1` | 1.0 | `0.1667` |
| `AU-2` | 1.0 | `0.1667` |
| `AU-3` | 1.5 | `0.2500` |
| `AU-4` | 1.5 | `0.2500` |
| `AU-5` | 1.0 | `0.1667` |
| | **6.0** | **`1.0001`** |

### `FS` · Falla Sistemas y Maniobras — 7 misiones, 9.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `FS-1` | 1.0 | `0.1111` |
| `FS-2` | 1.0 | `0.1111` |
| `FS-3` | 1.5 | `0.1667` |
| `FS-4` | 1.5 | `0.1667` |
| `FS-5` | 1.5 | `0.1667` |
| `FS-6` | 1.5 | `0.1667` |
| `FS-7` | 1.0 | `0.1111` |
| | **9.0** | **`1.0001`** |

### `AN` · Adaptación y Navegación — 5 misiones, 7.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `AN-1` | 1.5 | `0.2143` |
| `AN-2` | 1.5 | `0.2143` |
| `AN-3` | 1.5 | `0.2143` |
| `AN-4` | 1.5 | `0.2143` |
| `AN-5` | 1.0 | `0.1429` |
| | **7.0** | **`1.0001`** |

### `EM` · Emergencias — 6 misiones, 8.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `EM-1` | 1.0 | `0.1250` |
| `EM-2` | 1.5 | `0.1875` |
| `EM-3` | 1.5 | `0.1875` |
| `EM-4` | 1.5 | `0.1875` |
| `EM-5` | 1.5 | `0.1875` |
| `EM-6` | 1.0 | `0.1250` |
| | **8.0** | **`1.0000`** |

### `PA` · Procedimientos y Aproximación IFR — 6 misiones, 9.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `PA-1` | 1.5 | `0.1667` |
| `PA-2` | 1.5 | `0.1667` |
| `PA-3` | 1.5 | `0.1667` |
| `PA-4` | 1.5 | `0.1667` |
| `PA-5` | 1.5 | `0.1667` |
| `PA-6` | 1.5 | `0.1667` |
| | **9.0** | **`1.0002`** |

### `ER` · Emergencias IFR y Recuperación — 6 misiones, 7.0 h

| Misión | Horas | Coeficiente |
|---|---:|---|
| `ER-1` | 1.2 | `0.1714` |
| `ER-2` | 1.2 | `0.1714` |
| `ER-3` | 1.2 | `0.1714` |
| `ER-4` | 1.2 | `0.1714` |
| `ER-5` | 1.2 | `0.1714` |
| `ER-6` | 1.0 | `0.1429` |
| | **7.0** | **`0.9999`** |

## Por qué la suma de coeficientes da `1.0001` en algunas

Por el redondeo a cuatro decimales de las tablas de arriba, no por el cálculo. El servidor **nunca suma
coeficientes redondeados**: divide con 20 dígitos de precisión y renormaliza sobre las misiones que el
alumno voló (`NotaDeSubfase`), así que el NSF queda en la escala de una nota sin que el residuo exista.
La columna de coeficientes de este documento es para leerla, no para sumarla.

## Qué protege esto, y dónde

- `unit_test.SemillaSubfasesDelNiaTest` — las horas de las doce sub fases sobre `data_prod.sql`, y la
  cadena NSF → nota de fase → NIA → NFPI recalculada con las MISMAS clases que el servicio.
- `unit_test.CalculoDeIndicesTest` — que las horas cierren en los dos niveles, y que ponderar **no
  cambie la escala**: cinco notas de 17.00 tienen que dar un NIA de 17.00 exacto.
- `integration_test.IndicesConMisionesTest` — la cadena entera contra el endpoint, con las cinco notas
  de fase distintas entre sí.
- `integration_test.IndicesRedondeoUnicoTest` — que el redondeo sea uno solo y al final.

