# Coeficientes de misión del PDI EA-510 — la tabla que faltaba (dependencia 62)

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

## Lo que falta decidir antes de implementarla

La estructura de SIGEDA **se desvía del documento a propósito** (decisión registrada): no usa
Pre-Solo, Contacto es la primera sub-fase, y Nav/Ins del documento van combinadas. Así que antes de
cablear esto hay que resolver **el mapeo entre las sub-fases del PDI y las de SIGEDA**, y **cómo se
identifica una misión**: hoy un turno no lleva código de misión (`PS-1`, `C-3`), así que no hay dónde
colgar el coeficiente. Eso es modelado, no dato, y el dato ya está acá.
