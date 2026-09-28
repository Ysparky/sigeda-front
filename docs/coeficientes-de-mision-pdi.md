# Coeficientes de misión del PDI EA-510 — la tabla que faltaba (dependencia 62)

> **Estado: IMPLEMENTADA** — servidor en la tanda H y frontend el 28 sep 2026. Cómo quedó, y las
> cinco decisiones que se tomaron, al final del documento.

**Esta tabla desbloquea la dependencia 62.** Se daba por perdida: la nota de este proyecto decía que
«el PDI promete una tabla de coeficientes por misión y nunca la publica, y el cuaderno de trabajo
tampoco la tiene». **La segunda mitad era falsa.** La tabla está en `PCPH 2024xlsx.xlsx`, hoja
`ESTRUCTURA (2024)`, expresada como **horas por misión** — no con la palabra «coeficiente», que es
por lo que no se encontró antes.

## De dónde sale y por qué se puede confiar

La hoja lista, por sub-fase, sus misiones con las horas de cada una, y aparte el total de horas de la
sub-fase. **La verificación es que las dos cosas cuadran: la suma de las horas por misión da
exactamente el total que la propia hoja declara, en las 16 sub-fases, sin una sola excepción.** Eso
es lo que convierte la extracción en dato y no en interpretación.

El coeficiente es entonces `horas de la misión ÷ horas de la sub-fase`, y con él
`NSF = Σ(nota de misión × coef misión)`, que es la fórmula que el PDI enuncia y para la que faltaba
el insumo. Lo de arriba ya estaba publicado y ya está implementado: `NIA = NFAD·0.40 + NFOH·0.35 +
NFOA·0.25` y `NFPI = NIT·0.2 + NIA·0.8`.

**Y los coeficientes NO son uniformes**, que es lo que hace que esto importe de verdad: si lo fueran,
un promedio simple habría dado el mismo número y no haría falta la tabla. `PS-15` y `PS-16` valen
0.5 h contra 1.0 del resto de Presolo; `N-3` a `N-7` valen 0.8 contra 1.0 de `N-1`/`N-2`; `N/I-7`
vale 1.0 contra 1.5; `NTD-6`, `NTD-7` y `NTD-8` valen 1.0 contra 1.2.

## La tabla


### PS · Presolo — 15 h en 16 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| PS-1 | 1 | 0.0667 |
| PS-2 | 1 | 0.0667 |
| PS-3 | 1 | 0.0667 |
| PS-4 | 1 | 0.0667 |
| PS-5 | 1 | 0.0667 |
| PS-6 | 1 | 0.0667 |
| PS-7 | 1 | 0.0667 |
| PS-8 | 1 | 0.0667 |
| PS-9 | 1 | 0.0667 |
| PS-10 | 1 | 0.0667 |
| PS-11 | 1 | 0.0667 |
| PS-12 | 1 | 0.0667 |
| PS-13 | 1 | 0.0667 |
| PS-14 | 1 | 0.0667 |
| PS-15 | 0.5 | 0.0333 |
| PS-16 | 0.5 | 0.0333 |
| **Σ** | **15** | **1.0000** |

### C · Contacto — 7 h en 7 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| C-1 | 1 | 0.1429 |
| C-2 | 1 | 0.1429 |
| C-3 | 1 | 0.1429 |
| C-4 | 1 | 0.1429 |
| C-5 | 1 | 0.1429 |
| C-6 | 1 | 0.1429 |
| C-7 | 1 | 0.1429 |
| **Σ** | **7** | **1.0000** |

### N/I · Navegación e Instrumentos — 10 h en 7 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| N/I-1 | 1.5 | 0.1500 |
| N/I-2 | 1.5 | 0.1500 |
| N/I-3 | 1.5 | 0.1500 |
| N/I-4 | 1.5 | 0.1500 |
| N/I-5 | 1.5 | 0.1500 |
| N/I-6 | 1.5 | 0.1500 |
| N/I-7 | 1 | 0.1000 |
| **Σ** | **10** | **1.0000** |

### F · Formación — 5 h en 5 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| F-1 | 1 | 0.2000 |
| F-2 | 1 | 0.2000 |
| F-3 | 1 | 0.2000 |
| F-4 | 1 | 0.2000 |
| F-5 | 1 | 0.2000 |
| **Σ** | **5** | **1.0000** |

### N · Nocturno — 6 h en 7 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| N-1 | 1 | 0.1667 |
| N-2 | 1 | 0.1667 |
| N-3 | 0.8 | 0.1333 |
| N-4 | 0.8 | 0.1333 |
| N-5 | 0.8 | 0.1333 |
| N-6 | 0.8 | 0.1333 |
| N-7 | 0.8 | 0.1333 |
| **Σ** | **6** | **1.0000** |

### E · Emergencias — 12 h en 8 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| E-1 | 1.5 | 0.1250 |
| E-2 | 1.5 | 0.1250 |
| E-3 | 1.5 | 0.1250 |
| E-4 | 1.5 | 0.1250 |
| E-5 | 1.5 | 0.1250 |
| E-6 | 1.5 | 0.1250 |
| E-7 | 1.5 | 0.1250 |
| E-8 | 1.5 | 0.1250 |
| **Σ** | **12** | **1.0000** |

### CX · Campos Extraños — 12 h en 8 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| CX-1 | 1.5 | 0.1250 |
| CX-2 | 1.5 | 0.1250 |
| CX-3 | 1.5 | 0.1250 |
| CX-4 | 1.5 | 0.1250 |
| CX-5 | 1.5 | 0.1250 |
| CX-6 | 1.5 | 0.1250 |
| CX-7 | 1.5 | 0.1250 |
| CX-8 | 1.5 | 0.1250 |
| **Σ** | **12** | **1.0000** |

### CE · Carga Externa — 6 h en 7 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| CE-1 | 1 | 0.1667 |
| CE-2 | 1 | 0.1667 |
| CE-3 | 0.8 | 0.1333 |
| CE-4 | 0.8 | 0.1333 |
| CE-5 | 0.8 | 0.1333 |
| CE-6 | 0.8 | 0.1333 |
| CE-7 | 0.8 | 0.1333 |
| **Σ** | **6** | **1.0000** |

### SAR · Búsqueda y Rescate — 6 h en 6 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| SAR-1 | 1 | 0.1667 |
| SAR-2 | 1 | 0.1667 |
| SAR-3 | 1 | 0.1667 |
| SAR-4 | 1 | 0.1667 |
| SAR-5 | 1 | 0.1667 |
| SAR-6 | 1 | 0.1667 |
| **Σ** | **6** | **1.0000** |

### OEH · Operaciones Especiales — 6 h en 6 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| OEH-1 | 1 | 0.1667 |
| OEH-2 | 1 | 0.1667 |
| OEH-3 | 1 | 0.1667 |
| OEH-4 | 1 | 0.1667 |
| OEH-5 | 1 | 0.1667 |
| OEH-6 | 1 | 0.1667 |
| **Σ** | **6** | **1.0000** |

### NVG · Visores Nocturnos — 8 h en 7 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| NVG-1 | 1 | 0.1250 |
| NVG-2 | 1 | 0.1250 |
| NVG-3 | 1.2 | 0.1500 |
| NVG-4 | 1.2 | 0.1500 |
| NVG-5 | 1.2 | 0.1500 |
| NVG-6 | 1.2 | 0.1500 |
| NVG-7 | 1.2 | 0.1500 |
| **Σ** | **8** | **1.0000** |

### FT · Formación Táctica — 5 h en 5 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| FT-1 | 1 | 0.2000 |
| FT-2 | 1 | 0.2000 |
| FT-3 | 1 | 0.2000 |
| FT-4 | 1 | 0.2000 |
| FT-5 | 1 | 0.2000 |
| **Σ** | **5** | **1.0000** |

### NTD · Nav Táctica Diurna — 9 h en 8 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| NTD-1 | 1.2 | 0.1333 |
| NTD-2 | 1.2 | 0.1333 |
| NTD-3 | 1.2 | 0.1333 |
| NTD-4 | 1.2 | 0.1333 |
| NTD-5 | 1.2 | 0.1333 |
| NTD-6 | 1 | 0.1111 |
| NTD-7 | 1 | 0.1111 |
| NTD-8 | 1 | 0.1111 |
| **Σ** | **9** | **1.0000** |

### NTN · Nav Táctica NVG — 7 h en 7 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| NTN-1 | 1 | 0.1429 |
| NTN-2 | 1 | 0.1429 |
| NTN-3 | 1 | 0.1429 |
| NTN-4 | 1 | 0.1429 |
| NTN-5 | 1 | 0.1429 |
| NTN-6 | 1 | 0.1429 |
| NTN-7 | 1 | 0.1429 |
| **Σ** | **7** | **1.0000** |

### O/O · Orden de Operaciones — 1 h en 1 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| O/O-1 | 1 | 1.0000 |
| **Σ** | **1** | **1.0000** |

### CF · Complemento de Fase — 3 h en 3 misiones

| Misión | Horas | Coeficiente |
|---|---:|---:|
| CF-1 | 1 | 0.3333 |
| CF-2 | 1 | 0.3333 |
| CF-3 | 1 | 0.3333 |
| **Σ** | **3** | **1.0000** |

## Cómo quedó implementada — tanda H, 28 sep 2026

Ya no falta decidir nada: el servidor la implementó (tabla `misiones`, columna `turnos.id_mision`,
migración 016) y el frontend la consume. Las decisiones que se tomaron, con su motivo, porque son
las que hay que defender si alguien pregunta:

**1. El coeficiente NO se guarda: se guardan las horas y el cociente se deriva.** Guardar
`horas / Σ horas` además de las horas obligaría a reescribir la columna entera cada vez que una
sub-fase gana o pierde una misión, y las dos fuentes se separarían en el primer olvido.
`GET /api/subfases/{id}/misiones` lo devuelve derivado y redondeado a 4 decimales **solo para
mostrarlo**: el NSF se calcula sobre la división exacta.

**2. El bloque `N/I` está en las DOS sub-fases de SIGEDA, no repartido entre ellas.** El PDI tiene
**una** sub-fase combinada «Navegación e Instrumentos» con 7 misiones y 10 h; SIGEDA la tiene
**partida en dos**, y **cada mitad lleva el bloque completo** y normaliza sobre sus propias 10 h.

Repartir las 7 misiones exigiría decidir cuáles son de navegación y cuáles de instrumentos, y **el
documento no lo dice**: cualquier corte sería un dato inventado con apariencia de dato del PDI. Con
el bloque completo en las dos, los coeficientes que salen son **exactamente los de la tabla de
arriba** —`0.1500` seis veces y `0.1000` una— y se pueden verificar línea por línea contra ella. Un
corte 4/3 habría dado `0.2500`, `0.3750` y `0.2500`, cifras que no aparecen en ninguna página del
PDI y que nadie puede comprobar contra la fuente.

**Lo que se pierde, dicho:** sumadas, las dos mitades dan **20 h donde el PDI da 10**, así que esta
tabla **no sirve para un informe de horas de vuelo totales** (no existe hoy). Y `N/I-3` existe dos
veces, una por sub-fase, por lo que la clave única es `(id_subfase, codigo)` y no `codigo`. La
asignación no es ambigua: un turno pertenece a una sola sub-fase, así que su `id_mision` apunta a la
misión de esa sub-fase y a ninguna otra.

**3. El NSF se renormaliza dentro de la sub-fase:** `NSF = Σ(NMI × COEF) / Σ COEF`. El PDI enuncia
`Σ(NMI × COEF)` para una sub-fase **terminada**, donde los coeficientes suman `1.0000` y dividir no
cambia nada, así que esto coincide con la norma en el dominio de la norma y solo la extiende fuera de
él. Sin renormalizar, un alumno con 4 de las 7 misiones de Contacto tendría un NSF de **8.43 sobre
20** por no haber terminado todavía, y ese número entraría en la nota de fase, en el NIA y en el
orden de mérito. No es «un poco bajo»: es sistemáticamente difamatorio.

La renormalización **no es invisible**: la respuesta lleva `cobertura`, la Σ de los coeficientes que
entraron, con 4 decimales. `1.0000` es la sub-fase terminada, menos es una nota calculada sobre lo
volado, y **más de `1.0000` significa misiones calificadas dos veces** (no se deduplica: el PDI no da
regla de prevalencia para la instrucción aérea, y descartar notas en silencio es peor que mostrar la
cobertura).

**4. Un turno SIN misión asignada cae a promedio simple, y la respuesta lo declara.** Si alguna
misión calificada de la sub-fase no resuelve a una misión con coeficiente, toda la sub-fase se
calcula como promedio simple y viaja con `ponderacion: "uniforme"`. **La pantalla lo etiqueta como
promedio simple**, no como nota de sub-fase del PDI: presentarlo como la ponderación de la norma
sería mentir. No es un número fabricado —en las sub-fases cuyas misiones valen las mismas horas es
literalmente la fórmula del PDI—, pero tampoco es la ponderación, y la diferencia se dice.

**5. Qué bloques se sembraron, y qué queda sin sembrar.** Solo las cinco sub-fases que SIGEDA tiene:

| id sub-fase | sub-fase SIGEDA | bloque PDI | misiones | horas | coeficientes |
|---|---|---|---:|---:|---|
| 1 | Contacto | `C` | 7 | 7.0 | `0.1429` ×7 |
| 2 | Navegación | `N/I` | 7 | 10.0 | `0.1500` ×6 + `0.1000` |
| 3 | Instrumentos | `N/I` | 7 | 10.0 | `0.1500` ×6 + `0.1000` |
| 4 | Campos Extraños | `CX` | 8 | 12.0 | `0.1250` ×8 |
| 5 | Formación | `FT` | 5 | 5.0 | `0.2000` ×5 |

Las **once sub-fases restantes** de esta tabla —76 de los 110 coeficientes— siguen sin misiones,
porque `misiones.id_subfase` tiene FK a `subfases` y sembrarlas exigiría inventar las sub-fases que
el proyecto decidió no tener.

**Y una contradicción que esta tanda NO resolvió:** la sub-fase 5 de SIGEDA se llama «Formación» y se
sembró con los códigos `FT-1`…`FT-5` (Formación Táctica), mientras los pesos del PDI la ponderan como
`F` (Formación) dentro de `NFAD`. **No cambia ningún coeficiente** —`F` son 5 misiones de 1.0 h y `FT`
también, las dos dan `0.2000`— así que lo único que cambia es el código que se muestra. Reconciliarlo
mueve los pesos del NIA y es una decisión de otra tanda.
