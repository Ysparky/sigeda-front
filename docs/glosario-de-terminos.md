# Glosario de términos de SIGEDA

Las siglas, escalas y entidades del dominio, con su significado y de dónde salen en el código. El
programa es el **PDI EA-510** adaptado al Aeroclub Sudamericano de los Andes (escuela civil, RAP 141,
94 h). Las fórmulas citan el PDI (`pdi:NNN`) y viven en `sigeda-back` `indices/utils/`
(`PesosDelPdi`, `CalculoDeIndices`, `NotaDeSubfase`).

---

## 1. Índices (las notas que se calculan)

Dos ramas —**técnica** (en el aire) y **teórica** (en tierra)— que convergen arriba en el NFPI.

| Sigla | Nombre | Qué es | Fórmula |
|---|---|---|---|
| **NFPI** | Nota Final del Programa de Instrucción | La nota del programa; ordena el mérito | `NIA·0.8 + NIT·0.2` |
| **NIA** | Nota de Instrucción en el Aire | La mitad **práctica** | `Σ (NF × peso de la fase)` |
| **NF** | Nota de Fase | Una por fase (ver siglas abajo) | `Σ (NSF × peso de sub fase)` |
| **NSF** | Nota de Sub Fase | Promedio ponderado de las misiones de la sub fase | `Σ (NMI × coef de misión)` |
| **NMI** | Nota de Misión | La nota de un vuelo evaluado | 12 / 15 / 17 / 20 (ver DIRBE) |
| **NIT** | Nota de Instrucción Teórica | La mitad **teórica** | `NCT·0.8 + NEI·0.2` |
| **NCT** | Nota del Curso en Tierra | Asignaturas ponderadas por su coeficiente | `Σ (NA × coef de asignatura)` |
| **NA** | Nota de Asignatura | Una por materia (Adoctrinamiento, etc.) | `PE·0.6 + PT·0.4` |
| **PE** | Promedio de Exámenes | Promedio de los de tipo `EXAMEN` de la asignatura | promedio simple |
| **PT** | Promedio de Tests | Promedio de los de tipo `TEST` de la asignatura | promedio simple |
| **NEI** | Evaluaciones periódicas e inopinadas | Promedio **simple** (sin coeficiente) de periódicos + inopinados | `Σ (notas) ÷ cantidad rendida` |

**Notas de fase (NF) de la Tabla 4**, cada una pesa por sus horas sobre las 94 del programa:

| Sigla | Fase | Horas | Sub fases |
|---|---|---|---|
| **NFAD** | Adaptación | 26 h | Control Básico (CB), Circuitos y Maniobras (CM), Control Preciso (CP) |
| **NFNV** | Navegación Visual | 22 h | Navegación Local (NL), Navegación en Ruta (NR), Navegación Compleja (NC) |
| **NFEM** | Emergencias y Maniobras Avanzadas | 15 h | Autorrotación (AU), Falla Sistemas y Maniobras (FS) |
| **NFVN** | Vuelo Nocturno | 15 h | Adaptación y Navegación (AN), Emergencias (EM) |
| **NFVI** | Vuelo por Instrumentos | 16 h | Proc. y Aproximación IFR (PA), Emergencias IFR y Recuperación (ER) |

**Renormalización:** si una sub fase (o el curso en tierra) está incompleta, la nota se recalcula
sobre los coeficientes de lo que **sí** tiene nota, no sobre el total. Por eso el legajo dice
"calculada sobre el 44 % de la sub fase".

**Coeficiente de misión** = `horas de la misión ÷ Σ horas de la sub fase`. No se guarda; se deriva
(fuente: `PCPH 2024.xlsx`, hoja `ESTRUCTURA (2024)`). Ver `coeficientes-de-mision-pdi.md`.

---

## 2. Calificación de un vuelo

### DIRBE — la escala por maniobra
Fuente autoritativa: `utils/Dirbe.java`.

| Letra | Significado |
|---|---|
| **D** | Demostrativo (el instructor demuestra; maniobra nueva) |
| **I** | Insuficiente (bajo el estándar) |
| **R** | Regular |
| **B** | Bueno |
| **E** | Excelente |

Cada maniobra de un turno tiene una **nota mínima exigida**. El mínimo **acota** lo que se puede
poner (combinaciones `ID`, `IB`, `IE`, `RD`, `RE`, `BD`, `ED` son inválidas): con mínimo `R` se puede
calificar `I·R·B`; con mínimo `D` sólo `D`. Una nota **bajo el estándar** (p. ej. `I` donde se pedía
`R`) exige causa, observación y recomendación.

### Clasificación y nota de la misión (NMI)

| Clasificación | Cuándo | Nota |
|---|---|---|
| **Malo** | ≥1 tarea `I` bajo estándar, o ≥5 `R` donde se pedía `B` | **12** |
| **Regular** | 4 tareas `R` donde se pedía `B` | **15** |
| **Bueno** | cumple el estándar | **17** (base, con ajustes) |
| **Excelente** | varias tareas sobre el estándar | hasta **20** |

Nota base 17.50; 20.00 si todo es `D`. Se suma por tarea **sobre** el estándar (VTSE) y se resta por
tarea **bajo** (VTBE); un `I` donde se pedía `B` vale doble. Las misiones de **Complementación** no
entran al promedio.

---

## 3. Categorías de evaluación práctica
Enum `Categoria` (`evaluacion/entities/Categoria.java`).

| Categoría | Qué es |
|---|---|
| **Ponderada** | La evaluación normal de un turno; la rinde el instructor del turno |
| **Chequeo** | Chequeo de fin de ciclo; lo rinde **otro** instructor |
| **Chequeo Sub Fase** | Chequeo de la última misión de una sub fase |
| **Complementación** | Misión de recuperación; no cuenta para el promedio |

---

## 4. Estados del alumno y ciclo de chequeo

### Estados
Enum `Estado`. Progresión por acumulación de vuelos bajo el estándar:

`Apto → En Chequeo / En Observación → En Deliberación → No Apto`

- **Apto**: puede ser evaluado y volar.
- **En Chequeo**: alcanzó un criterio de chequeo; debe rendirlo con otro instructor.
- **En Observación**: aprobó el chequeo; sigue bajo seguimiento.
- **En Deliberación**: caso en el Consejo de Evaluación.
- **No Apto**: separado del programa.

### Ciclo de chequeo — los criterios
Se calcula sobre `cont_malo` / `cont_regular`. La rama que aplica depende de la **fase** de la última
evaluación:

| | Ramas que disparan el chequeo |
|---|---|
| **Criterio 1** · primeras cuatro fases | 3 Malos · 2M+2R · 1M+4R · 6R |
| **Criterio 2** · Vuelo por Instrumentos | 2 Malos · 1M+2R · 4R |

**«Alternados» = en cualquier orden** (conteo simple, no una condición de posición). Los contadores
no cuadran con el historial a la fuerza: miden la regla de chequeo, no son un recuento de notas.

---

## 5. Instrucción teórica

| Término | Qué es |
|---|---|
| **Materia** | Asignatura del curso en tierra, con `nombre`, `nota_minima`, `coeficiente` y `parte`. Entra al NCT/NIT |
| **`parte`** | `PRIMERA_PARTE` (antes de volar), `SEGUNDA_PARTE` (durante los vuelos), `CULTURA_AERONAUTICA` |
| **Banco de preguntas** | Preguntas (materia, dificultad, tipo, origen `MANUAL`/`IA`) con sus alternativas |
| **Turno teórico** | Un examen programado para un grupo: materia, `tipo_examen`, fecha, ventana, preguntas con puntaje (suman 20) |
| **Cuestionario** | El intento de **un** alumno en un turno teórico (su examen) |
| **Calificación teórica** | El resultado de una pregunta dentro de un cuestionario (auto-corregida) |
| **Subsanación** | Segunda oportunidad tras desaprobar (24 h). Prevalece la primera nota; **bloquea volar** hasta aprobarla |
| **Rezagado** | Quien no rindió; injustificado = 50 % de la nota |

### `tipo_examen` → dónde pesa en el NIT
- **`EXAMEN`, `TEST`** → arman el **NCT** (vía NA por asignatura).
- **`MENSUAL`, `SEMESTRAL`, `SEMANAL`, `QUINCENAL`, `INOPINADO`** → arman el **NEI**.
- `PRE_SOLO` (nota mínima 18), `SUBSANACION`, `REZAGADO`, `BALOTAS` → casos especiales.

### Notas mínimas por materia (las más citadas)
Adoctrinamiento **18** · Emergencias **20** · Límites de Operación **20** · Ingeniería **16** · el
resto **16**. Evaluación Pre-Solo **18**.

### Causales de bajo rendimiento académico
Enum `CausalTeorico`. **Ninguna bloquea volar por sí misma** (sólo la subsanación lo hace):
`PROMEDIO_ASIGNATURA` (<13) · `TRES_ASIGNATURAS` · `DOS_EXAMENES` · `SEGUNDA_SUBSANACION` ·
`PERIODICOS_CRITICOS` · `PERIODICOS_GENERALES` · `INOPINADOS`.

---

## 6. Estructura del programa (práctica)

`Fase → Sub fase → Misión → Maniobra`. Tabla 4 (vigente desde 29 sep 2026): **5 fases, 12 sub fases,
73 misiones, 94.0 h**. Cada maniobra tiene un estándar (`nota_min`) y pertenece a **una** sub fase.

| Término | Qué es |
|---|---|
| **Fase** | El nivel mayor (las 5 de la tabla NF de arriba) |
| **Sub fase** | Subdivisión de una fase (las 12; cada una con sus misiones y maniobras) |
| **Misión** | La unidad del PDI que un turno cubre; tiene horas → de ahí su coeficiente |
| **Maniobra** | La tarea concreta que se califica con DIRBE |
| **Turno (práctico)** | Un vuelo programado: sub fase, misión, instructor, aeronave, alumno(s), maniobras |
| **Estándar / `nota_min`** | La nota DIRBE exigida en una maniobra |

---

## 7. Personas y cuentas

| Rol | Para qué |
|---|---|
| **Administrador Web** | Todo; matrícula (alumnos y grupos) |
| **Comandante de Escuadrón** | Materias, seguimiento, legajo, orden de mérito |
| **Jefe de Operaciones** | Turnos prácticos, estándares |
| **Instructor** | Banco de preguntas, turnos teóricos, evaluar **sus** turnos |
| **Alumno** | Sus turnos, sus exámenes, su legajo, el módulo de aprendizaje |

Contadores de `Persona`: `cont_malo`, `cont_regular`, `cont_chequeo` (alimentan el ciclo) y
`cont_eval` (el correlativo con que se sufija el código de ciertas evaluaciones; también es el
"Evaluaciones" que muestra el panel del ciclo).

---

## 8. ¿Las materias se relacionan con las sub fases?

**No. Son dos mundos separados en el modelo de datos, a propósito.**

- Una **materia** es de la **instrucción teórica** (curso en tierra): su columna `parte` dice
  `PRIMERA_PARTE` / `SEGUNDA_PARTE` / `CULTURA_AERONAUTICA`, **no** una fase de vuelo. La referencian
  `preguntas`, `turnos_teoricos` y `cuestionarios` por `id_materia`.
- Una **sub fase** es de la **instrucción práctica** (en el aire): cuelga de una `fase` (`id_fase`) y
  la referencian `maniobras`, `misiones`, `turnos` y `evaluaciones` por `id_subfase`.

En el esquema (`schema_prod.sql`) **no hay ninguna clave ajena ni columna que cruce una materia con
una sub fase (ni con una fase)**: `materias` no tiene `id_subfase`/`id_fase`, y `subfases` no tiene
`id_materia`. Se tocan sólo **arriba del todo**, cuando sus dos índices se combinan en el NFPI
(`NIA·0.8 + NIT·0.2`).

> Matiz del PDI: la 2ª parte del curso en tierra es "adoctrinamiento **por fase**", o sea
> conceptualmente la teoría de esa etapa acompaña a los vuelos de esa fase. SIGEDA **no** modela ese
> vínculo: `materia.parte` sólo marca en qué tramo del curso va, no a qué fase pertenece.

---

Relacionado: `guion-de-la-demostracion.md` (recorrido), `coeficientes-de-mision-pdi.md` (los
coeficientes), `cuentas-de-la-demo.md` (las cuentas).
