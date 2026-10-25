# Evaluación práctica asistida por simulador — Diseño

**Fecha:** 2026-10-25
**Estado:** Borrador para revisión (builder-check pendiente)
**Autor:** Claude (decisiones tomadas por delegación del usuario — "dale tú mismo")

---

## 1. Intención y por qué

Hoy la evaluación práctica de vuelo en SIGEDA es **enteramente manual**: en un turno de
vuelo el instructor observa cada maniobra, la compara mentalmente contra el estándar PDI
EA-510 (que en el sistema es solo texto libre) y teclea una **letra** por maniobra
(I/R/B/E) en `POST /evaluaciones/turno/{id}/persona/{cod}`. A partir de esas letras,
`CalculoNota` deriva el `promedio` (0–20) y el paquete `indices` calcula NSF → fase → NIA →
NFPI (Tabla 4).

La propuesta **automatiza el primer eslabón** —la letra por maniobra— cuando el
entrenamiento ocurre en un **simulador de vuelo** que puede exportar telemetría. El
simulador entrega los parámetros objetivos realmente volados (desvío de altitud, rumbo,
velocidad, etc.); SIGEDA los contrasta contra una **tolerancia numérica** por maniobra y
**propone** la letra. El instructor revisa, corrige si hace falta y firma.

**Por qué ahora:** (1) es doctrinalmente legítimo — RAP 141 y los FSTD/FNPT de helicóptero
admiten un tramo de horas de instrucción en simulador; (2) convierte una calificación
subjetiva en una medición trazable contra estándar; (3) para la tesis es un diferenciador
fuerte y se apoya en estructuras que ya existen (maniobras, estándares, turno, Calificacion)
sin rehacer el motor de notas.

## 2. Alcance

### Goals
- Registrar que un turno de vuelo se realizó **en simulador** (nuevo `medio`).
- Ingerir una **sesión de simulador** con mediciones por maniobra y parámetro.
- Definir **tolerancias numéricas** por maniobra (altitud, rumbo, velocidad, tiempo, …) con
  unidad y bandas, que es lo que hoy no existe.
- **Autoproponer** la letra por maniobra comparando medición vs. tolerancia, de forma
  **determinista** (no IA).
- Entregar esas letras **prellenadas** al flujo de evaluación existente, para que el
  instructor confirme/corrija y firme.

### Non-goals
- **No** construir un simulador de vuelo. SIGEDA ingiere telemetría de un simulador externo.
- **No** calificar de forma 100% autónoma. El instructor siempre confirma y firma.
- **No** tocar las fórmulas de `CalculoNota`, NSF, NIA ni NFPI (Tabla 4). El simulador
  solo produce la letra de entrada que hoy es manual.
- **No** reemplazar la evaluación en aeronave real; el simulador la complementa.
- **No** telemetría en tiempo real (streaming/socket) en la v1 — es *stretch goal*.

### Anti-goals (qué haría fracasar la feature aunque funcione técnicamente)
- Que la nota auto-propuesta **no sea editable** por el instructor → inaceptable por doctrina
  y defendibilidad regulatoria.
- Amarrar el diseño a un simulador concreto (p. ej. solo X-Plane) → debe ser agnóstico.
- Que las horas de simulador se mezclen con las de aeronave real **sin control**, alterando
  silenciosamente la ponderación de Tabla 4 (ver §6, decisión abierta del usuario).

## 3. Estado actual (confirmado en código)

- `turno.entities.Turno` (`turnos`): `fechaEval`, `aeronave` (FK `id_aeronave`, **nullable**),
  `codInstructor`, `maniobrasTurno` (join `Maniobra_Turno` con `nota_min` letra por maniobra),
  `alumnosTurno`. **No hay concepto de medio ni de simulador.**
- `maniobra.entities.Maniobra` (`maniobras`): `id, nombre, descripcion`.
- `maniobra.entities.Estandar` (`estandares`): `id, nombre, descripcion, idManiobra` — **texto
  libre, sin tolerancias numéricas ni unidades.**
- `evaluacion.entities.EvaluacionPractica` (`evaluaciones_practicas`): keyed por
  `codigo = codAlumno + "-" + idTurno`; `promedio` (String), `clasificacion` (Malo/Regular/
  Bueno/Excelente), lista de `Calificacion`.
- `evaluacion.entities.Calificacion` (`calificaciones`, PK `codEvaluacion`+`idManiobra`):
  `notaMin` (letra estándar requerida), `nota` (letra otorgada), `causa`, `observacion`,
  `recomendacion`.
- Scoring: `evaluacion.utils.CalculoNota` (letras → promedio 0–20, solo Ponderada/
  ChequeoSubFase) y `indices` (`PesosDelPdi`, `NotaDeSubfase`, `IndiceServiceImpl`) para
  NSF/NIA/NFPI, con pesos derivados de horas (`HORAS_DEL_PROGRAMA = 94.0`).
- Creación de la evaluación: `EvaluacionController.create` carga el turno
  (`turnoService.findByIdWithManiobra`), itera `maniobrasTurno`, compone `notaComp = notaMin +
  nota` y corre `CalculoNota`.
- Roles: `Comandante` tiene `MANAGE_MANEUVERS` (crea maniobras); `Operaciones` (Jefe de
  Operaciones) tiene `MANAGE_STANDARDS` (asigna estándares).
- Migraciones: `src/main/resources/migraciones/NNN-*.sql`, última **028**; `schema_prod.sql`,
  `data_prod.sql`.

## 4. Diseño — decisiones tomadas

### 4.1 Medio del turno
`Turno` gana `medio` (`Estado... ` → nuevo enum `Medio = AERONAVE | SIMULADOR`). Default
`AERONAVE` (retrocompatible con todos los turnos existentes). Cuando `medio = SIMULADOR`,
`aeronave` puede ser nulo (la columna ya lo permite) y el turno puede referenciar
opcionalmente un identificador de dispositivo de simulación (string libre, p. ej. "FNPT II
H135"); no se modela como entidad en v1.

### 4.2 Tolerancia numérica por maniobra (el hueco principal)
Se introduce la noción de **parámetro medible con tolerancia**, que hoy no existe. Decisión:
colgarla de la **maniobra** (no del estándar de texto libre, que se conserva como descripción
cualitativa). Nueva entidad:

- `ParametroManiobra` (tabla `parametros_maniobra`): `id`, `idManiobra` (FK), `clave`
  (p. ej. `ALTITUD`, `RUMBO`, `VELOCIDAD`, `TIEMPO`), `unidad` (`ft`, `deg`, `kt`, `s`),
  `objetivo` (numérico), y **bandas de desvío** que mapean a letra:
  `tolExcelente`, `tolBueno`, `tolRegular` (desvío absoluto máximo para cada letra; fuera de
  `tolRegular` ⇒ Insuficiente). Se permiten parámetros de tipo rango (objetivo + banda) o de
  tipo límite (solo máximo/mínimo) — el builder elige la representación idiomática mientras
  cubra "medido → letra".

Quién define estos parámetros: el **Jefe de Operaciones** (`MANAGE_STANDARDS`), coherente con
que hoy asigna estándares. Se añaden endpoints análogos a `addEstandares`.

### 4.3 Sesión de simulador y mediciones
Nuevo agregado para la telemetría ingerida:

- `SesionSimulador` (tabla `sesiones_simulador`): `id`, `idTurno`, `codAlumno`, `fecha`,
  `dispositivo` (string), `fuente` (string, p. ej. "x-plane-csv-v1"), estado de
  procesamiento. Una sesión por (turno, alumno), espejando la clave de la evaluación.
- `MedicionManiobra` (tabla `mediciones_maniobra`): `idSesion` (FK), `idManiobra`, `clave`
  (= `ParametroManiobra.clave`), `valorMedido` (numérico), `desvio` (numérico, derivado),
  `letra` (resultado por parámetro). El agregado por maniobra (varias mediciones → una letra)
  se calcula en el motor (§4.4).

**Re-ingesta / idempotencia.** Hay **una** sesión por (turno, alumno). Re-ingerir el mismo par
**reemplaza** la sesión previa (telemetría corregida o re-volada) **mientras no exista aún una
`EvaluacionPractica` para ese par** (es decir, el instructor no ha firmado). Una vez firmada, la
ingesta se rechaza (ver §4.5). La unicidad `(idTurno, codAlumno)` se materializa como constraint
en la migración 029.

### 4.4 Motor de autocalificación (determinista, en `sigeda-back`)
Nuevo servicio `AutocalificacionSimuladorService` (paquete `simulador`):
1. Ingesta: recibe el archivo/estructura de telemetría (contrato §5), lo valida contra las
   maniobras del turno (`maniobrasTurno`) y persiste `SesionSimulador` + `MedicionManiobra`.
2. Para cada maniobra: por cada `ParametroManiobra`, calcula el desvío respecto al `objetivo`
   (o contra límite), lo ubica en la banda (E/B/R/I) → letra del parámetro. El desvío es
   `|valorMedido - objetivo|` para claves lineales (ALTITUD, VELOCIDAD, TIEMPO) y **distancia
   angular** `min(|d|, 360-|d|)` para claves angulares (RUMBO), para no romper en el borde
   0/360°. El tipo de distancia es propiedad de la clave, no un caso especial en código.
   La **letra de la maniobra** es la **peor** de sus parámetros (criterio conservador, PDI: una
   maniobra se degrada por su componente más débil). Hardcodeado a "peor" en v1.
3. **Propuesta por maniobra, no todo-o-nada.** Una maniobra recibe letra auto-propuesta **solo
   si** tiene ≥1 `ParametroManiobra` definido **y** la sesión trae medición para **todos** sus
   parámetros definidos. Si falta la medición de un parámetro definido (dato ausente), la
   maniobra queda **sin proponer** (`null`) para que el instructor la califique a mano — nunca
   se infiere "Excelente" ignorando un parámetro no volado, ni se castiga con "Insuficiente"
   por un hueco de datos. Igual queda `null` toda maniobra del turno sin `ParametroManiobra`
   (no simulable). Así la propuesta puede ser **parcial**.
4. Produce una propuesta `{ idManiobra → letra | null }` para **todas** las maniobras del turno
   (`maniobrasTurno`), que alimenta las `calificaciones` prellenadas de la evaluación; las
   `null` llegan en blanco a la pantalla.

Es **lógica de tolerancias, no predicción** → vive en `sigeda-back`. El backend IA
(`sigeda_chat_status`) **no se toca**: la proyección sigue separada.

### 4.5 Instructor en el bucle
El simulador **propone**; no crea la evaluación por sí solo. Flujo:
- `GET /turnos/{id}/persona/{cod}/propuesta-simulador` → devuelve la evaluación prellenada
  (letras propuestas por maniobra —o `null`, §4.4— con el desvío medido como justificación en
  `observacion`).
- El instructor abre la pantalla de registrar evaluación con esos valores ya cargados,
  corrige las letras que considere y **firma** usando el flujo existente
  `POST /evaluaciones/turno/{id}/persona/{cod}`. **No se añade una ruta de calificación
  autónoma.** La evaluación final pasa por `CalculoNota` igual que hoy.

**Máquina de estados de la ingesta** (resuelve asimetrías que el revisor señaló):
- Ingerir una sesión exige `turno.medio = SIMULADOR` → si no, 409.
- Se puede ingerir / regenerar la propuesta mientras **no exista** `EvaluacionPractica` para
  (turno, alumno). Una vez firmada la evaluación, la ingesta y la regeneración se rechazan
  (409) — la propuesta es un borrador previo a la firma, no reescribe trabajo firmado.

### 4.6 Qué NO cambia
`CalculoNota`, `PesosDelPdi`, `NotaDeSubfase`, `IndiceServiceImpl`, `OrdenDeMeritoServiceImpl`
quedan intactos. El simulador solo cambia **de dónde salen las letras** de `Calificacion.nota`
antes de que el instructor las confirme.

## 5. Contrato de telemetría (simulador-agnóstico)
SIGEDA ingiere un documento de sesión independiente del simulador. Forma mínima (JSON):

```jsonc
{
  "idTurno": 20,
  "codAlumno": "S92ZFX",
  "dispositivo": "FNPT II H135",
  "fuente": "x-plane-csv-v1",
  "maniobras": [
    { "idManiobra": 3,
      "mediciones": [
        { "clave": "ALTITUD", "valor": 1012, "unidad": "ft" },
        { "clave": "RUMBO",   "valor": 358,  "unidad": "deg" }
      ] }
  ]
}
```

Un **adaptador por simulador** (plugin de X-Plane, export CSV de un FSTD, etc.) que produzca
este documento queda **fuera de alcance** de SIGEDA; es responsabilidad del operador del
simulador o de un puente externo. Para el demo de tesis se usa un archivo de telemetría
generado/mockeado con esta forma.

## 6. Constraints

- Retrocompatibilidad total: `medio` default `AERONAVE`; todos los turnos y evaluaciones
  actuales siguen funcionando sin cambios.
- Migración nueva `029-*` (y las que haga falta), `schema_prod.sql` + `data_prod.sql`
  actualizados; semilla verificada en PostgreSQL (H2 es ciego a varios defectos de PG).
- Pilas y convenciones existentes: Spring Boot 3 / Java 17; letras de nota y `promedio` como
  String se conservan (no se numerizan las notas existentes).
- La nota auto-propuesta debe ser siempre editable antes de firmar.
- Permisos: definir parámetros/tolerancias ⇒ `MANAGE_STANDARDS` (Jefe de Operaciones);
  ingerir sesión de simulador ⇒ a decidir (propuesta: `WRITE`, el mismo que evalúa).

## 7. Qué queda al builder

- Representación idiomática exacta de las bandas de tolerancia (rango vs. límite) y su mapeo a
  letra, mientras cumpla "medido → E/B/R/I".
- Formato de persistencia de `valorMedido`/`objetivo` (numeric con escala adecuada).
- Validaciones de ingesta (maniobra fuera del turno, clave sin parámetro definido, unidad
  inconsistente) — ver §8 Review Focus en el plan.
- Si la ingesta es multipart (archivo) o JSON en el cuerpo.
- UI web: dónde se marca el `medio` al crear el turno y cómo se visualiza el desvío medido
  junto a cada letra propuesta en la pantalla de evaluación.

## 8. Decisiones del usuario (resueltas, 2026-10-25)

1. **Horas de simulador vs. Tabla 4 — cuentan igual.** Las horas voladas en simulador cuentan
   como las de aeronave real para `HORAS_DEL_PROGRAMA = 94.0`. **Confirma que `medio` NO toca la
   ponderación** (NSF/NIA/NFPI intactos). Sin tope en alcance; un eventual cap de horas-sim es
   follow-on, no v1.
2. **Maniobras simulables — subconjunto, data-driven.** No todas. "Simulable" se decide por tres
   ejes: **progresión** (el novato entrena primero en sim), **seguridad** (maniobras peligrosas de
   repetir en aeronave real) y **telemetría limpia** (maniobras definidas por parámetros numéricos
   claros, que el motor puede autocalificar bien). En el modelo, "simulable" = la maniobra tiene
   `ParametroManiobra` cargados (lo define el Jefe de Operaciones). Para el demo se siembra una
   **terna**, una maniobra por eje, para demostrar el motor con parámetros de distinta naturaleza:
   - **Adaptación (NFAD)** — eje progresión (p. ej. vuelo estacionario/hover): altitud, deriva, rumbo.
   - **Emergencias (NFEM), autorrotación** — eje seguridad: RPM de rotor, régimen de descenso, velocidad.
   - **Instrumentos (NFVI), aproximación ILS** — eje telemetría: senda (desvío de GS/LOC), altitud, rumbo, velocidad.

   Navegación visual y nocturno quedan fuera (telemetría pobre, dependen de referencias externas).
   Las maniobras no simulables del turno llegan en blanco a la propuesta (§4.4).
3. **Simulador real.** ASA usa un dispositivo de simulación real (modelo/formato de export por
   confirmar). La ingesta se implementa **agnóstica** vía el contrato JSON (§5); para el demo se
   alimenta con un archivo de telemetría con esa forma. El **adaptador** del dispositivo real
   concreto (su export → contrato JSON) es follow-on, fuera de v1.
4. **Aceptación regulatoria — proceder.** Se construye con el instructor como **firmante único**
   de la evaluación (postura conservadora, defendible). Sin ruta de calificación autónoma.
