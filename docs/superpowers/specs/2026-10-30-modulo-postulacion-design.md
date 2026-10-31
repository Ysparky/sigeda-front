# Módulo de postulación (admisión) — Diseño

**Fecha:** 2026-10-30
**Estado:** Borrador para revisión (builder-check pendiente)
**Fuente:** doc del cliente `Postulacion y simulador (1).docx` (módulo de postulación) + feature existente "tramo de entrada".
**Autor:** Claude (decisiones de reconciliación marcadas como llamadas propias).

---

## 1. Intención y por qué

Hoy la admisión en SIGEDA ("tramo de entrada") es mínima: una `Matricula` pública con comprobante, y
el Coordinador la **valida** (que promueve de inmediato a Alumno) o la **rechaza** (con reenvío). El doc
del cliente formaliza un **proceso de admisión** más completo, el que la institución realmente usa:

- Las postulaciones se abren por **convocatoria** (con vacantes, fechas y documentos requeridos).
- El Coordinador **filtra**: revisa la documentación y, si falta o está mal, **observa** para que el
  postulante **subsane** y reintente — un ciclo que hoy no existe (hoy solo se puede rechazar).
- La validación documental **habilita** al postulante para la **evaluación presencial** (fuera del
  sistema); recién después el Coordinador registra el **resultado de admisión** (admitido / no admitido).
- El admitido queda listo para **incorporarse como alumno**; el no admitido se cierra conservando el
  historial.

**Por qué ahora:** es "el filtro de postulación" que el usuario priorizó. Formaliza la admisión real
(convocatoria → revisión documental con observación → habilitación → resultado) sobre lo que ya existe,
sin duplicar.

## 2. Alcance

### Goals
- **`Convocatoria`** como contenedor del proceso (vacantes, fechas, documentos requeridos, estado).
- Postular **contra una convocatoria** (no solo contra un curso).
- **Ciclo de observación/subsanación**: estado `OBSERVADA` + `observaciones`; el postulante subsana y
  vuelve a revisión.
- **Separar las dos compuertas** del doc: validación documental (habilita) vs. **resultado de admisión**
  (admitido/no admitido) tras la evaluación presencial.
- **`Resultado_Admisión`** como desenlace formal; el admitido se promueve a alumno **en ese paso**.
- Pantallas: admin de convocatorias (Coordinador), landing pública por convocatoria, bandeja del
  Coordinador con observar + registrar resultado, vista del postulante con sus observaciones.

### Non-goals
- **No** se construye almacenamiento multi-documento / MinIO. El único archivo sigue siendo el
  `comprobante` (bytea); `documentosRequeridos` es una **lista declarativa** en la convocatoria (qué
  debe presentar), y la observación opera **a nivel de matrícula** (texto), no por documento.
- **No** se separa `Persona` de `Alumno` (refactor transversal del doc, §8). Se difiere.
- **No** se modela facturación ni montos (sigue fuera de alcance, como la matrícula actual).
- **No** se duplica un módulo paralelo: se **extiende** `Matricula` (que ya ES la postulación).

### Anti-goals
- Que `validar` siga promoviendo a alumno de inmediato: rompería la separación revisión-documental vs.
  admisión que es el núcleo del doc.
- Convocatorias sin control de estado (una postulación contra una convocatoria cerrada/borrador).

## 3. Estado actual (confirmado en código)

- `matricula.entities.Matricula` (`matriculas`): `idCurso`, dni, nombres/apellidos, correo, contacto,
  idHorario, fecha, `estado` (enum `EstadoMatricula{PENDIENTE,VALIDADA,RECHAZADA}`), `comprobante`
  (bytea ≤5 MB) + `comprobanteTipo`, `motivoRechazo`, `codPersona`. La matrícula **ES** la postulación;
  no hay entidad `Postulacion`.
- Postulante = `Persona`(tipo=null, estado="Pendiente") + `Usuario`(rol **Postulante**, id 7) + `Matricula`.
- Público: `POST /api/public/matriculas` (multipart datos+comprobante), `GET /api/public/cursos`.
  Coordinador: `GET /api/matriculas?estado=`, `/{id}`, `/{id}/comprobante`, `PUT /{id}/validar`,
  `PUT /{id}/rechazar`. Postulante: `GET/PUT /api/matriculas/mia` (reenviar comprobante → vuelve PENDIENTE).
- `validar` HOY: persona.tipo="Alumno", estado="Apto"; usuario rol Alumno(1); matrícula VALIDADA — es
  decir **promueve de inmediato**. `rechazar`: estado RECHAZADA + motivoRechazo (no toca persona/usuario).
- **No existe**: `Convocatoria`, vacantes, `Resultado_Admisión`, estado OBSERVADA, documentos requeridos,
  entidad `Alumno`, MinIO.
- Permisos: Coordinador Académico (id 6) tiene `Manage Enrollments`; Postulante (id 7) `View My Enrollment`.
- Migraciones: matrícula = 025 (cursos/horarios + roles 6/7), 026 (matriculas), 028 (cuenta coordinador).
  Última migración: **031**.
- Web: `features/inscripcion` (landing + matrícula + mi-matrícula) y `features/matriculas` (bandeja +
  detalle validar/rechazar). Permiso `Manage Enrollments` en `pantallas.ts`.

## 4. Diseño — decisiones tomadas

### 4.1 Convocatoria (entidad nueva)
`convocatoria.entities.Convocatoria` (tabla `convocatorias`):
`id`, `idCurso` (FK cursos), `nombre`, `descripcion`, `fechaInicio`, `fechaFin`, `vacantes` (int),
`documentosRequeridos` (texto; lista declarativa de lo que el postulante debe presentar),
`estado` (`EstadoConvocatoria{BORRADOR, PUBLICADA, CERRADA, FINALIZADA}`).
- Un curso tiene 0..N convocatorias en el tiempo. Una convocatoria recibe 0..N matrículas.
- Pública solo si `estado=PUBLICADA` y hoy ∈ [fechaInicio, fechaFin].
- Transiciones: BORRADOR → PUBLICADA → CERRADA → FINALIZADA (el Coordinador las mueve; no se postula a
  una que no esté PUBLICADA y vigente).

### 4.2 Matrícula extendida
- Nuevo FK `idConvocatoria` en `matriculas`. El formulario público postula **a una convocatoria**
  (de la cual el servidor deriva el `idCurso`). `idCurso` se conserva poblado (derivado) para no romper
  lo existente; las matrículas históricas quedan con `idConvocatoria` null.
- `EstadoMatricula` gana **`OBSERVADA`** y **`NO_ADMITIDO`**: `{PENDIENTE, OBSERVADA, VALIDADA, RECHAZADA, NO_ADMITIDO}`.
  - PENDIENTE = "en revisión". OBSERVADA = "observada" (re-enviable). VALIDADA = documentación conforme,
    habilitado para la evaluación presencial. RECHAZADA = **rechazo documental re-enviable** (como hoy).
    **NO_ADMITIDO** = resultado de admisión negativo, **terminal** (no re-postula; conserva historial).
  - Re-envío (subsanación, `/api/matriculas/mia`): permitido desde **RECHAZADA y OBSERVADA** → vuelve a
    PENDIENTE. **Bloqueado** desde VALIDADA y NO_ADMITIDO. Esto evita que un no-admitido re-entre al flujo.
- Nuevo campo `observaciones` (texto) en `matriculas` (lo que el Coordinador pide subsanar).
- **Guard de duplicados** pasa de `(dni, idCurso)` a **`(dni, idConvocatoria)`** con "vivas" =
  `{PENDIENTE, OBSERVADA, VALIDADA}` (índice parcial único + `dniYaPostulado(dni, idConvocatoria)`). Así una
  persona puede re-postular a OTRA convocatoria (doc: "1..N postulaciones"), pero no duplicar en la misma
  mientras tenga una viva.

### 4.3 Las dos compuertas (fiel al doc)
El cambio de comportamiento central: **`validar` deja de promover a alumno.**
- `observar(id, observaciones)` → estado `OBSERVADA` + `observaciones` + `fechaRevision`. Solo desde PENDIENTE.
- Subsanación: el postulante reenvía (ruta `/api/matriculas/mia` existente, extendida) → estado PENDIENTE,
  **limpia** `observaciones`/`motivoRechazo`. Desde RECHAZADA u OBSERVADA.
- `validar(id)` → estado `VALIDADA` = **documentación conforme, habilitado para la evaluación presencial**.
  **Ya NO** toca Persona/Usuario. Desde PENDIENTE u OBSERVADA.
- `rechazar(id, motivo)` → `RECHAZADA` + motivo (rechazo documental, re-enviable como hoy). Desde PENDIENTE u OBSERVADA.
- `registrarResultado(id, resultado, observaciones)` → crea `Resultado_Admisión`. Solo desde **VALIDADA**.
  - `ADMITIDO` → matrícula sigue VALIDADA (con resultado) y **promueve**: persona.tipo="Alumno",
    estado="Apto"; usuario rol Alumno(1) — **la promoción que hoy hace `validar` se mueve acá**. Impone
    **vacantes**: si los admitidos de la convocatoria ya llegaron al cupo → 409 (conteo+inserción en una
    transacción).
  - `NO_ADMITIDO` → matrícula `NO_ADMITIDO` (terminal, conserva historial); no promueve.

### 4.4 Resultado_Admisión (entidad nueva)
`matricula.entities.ResultadoAdmision` (tabla `resultados_admision`):
`id`, `idMatricula` (FK, **único** — 1 matrícula → 0..1 resultado), `resultado`
(`Resultado{ADMITIDO, NO_ADMITIDO}`), `fechaResultado`, `observaciones`, `responsableRegistro`
(codPersona del Coordinador). Se consulta junto al detalle de la matrícula.

### 4.5 Endpoints nuevos / cambiados
- `convocatoria.controllers.ConvocatoriaController` (`Manage Enrollments`):
  `GET/POST /api/convocatorias`, `GET/PUT /api/convocatorias/{id}`, `PUT /api/convocatorias/{id}/estado`.
- Público: `GET /api/public/convocatorias` (solo PUBLICADAS vigentes) + `GET /api/public/convocatorias/{id}`.
- `MatriculaController` gana: `PUT /api/matriculas/{id}/observar` (body `{observaciones}`),
  `POST /api/matriculas/{id}/resultado` (body `{resultado, observaciones}`). `validar`/`rechazar` se
  conservan con la semántica nueva de §4.3.
- `POST /api/public/matriculas` ahora **exige `idConvocatoria`** (valida PUBLICADA+vigente); el servidor
  **deriva `idCurso`** de la convocatoria (el cliente ya no lo manda). `idHorario` se conserva: el postulante
  elige un horario del curso de la convocatoria. El landing pasa a catálogo de convocatorias; **toda nueva
  postulación requiere una convocatoria abierta** (no queda el camino de postular a un curso "pelado").

### 4.6 Qué NO cambia
- El comprobante (bytea) y su subida/descarga, la cuenta Postulante, el flujo público base, la promoción
  a Alumno (misma lógica, solo se mueve de `validar` a `registrarResultado` ADMITIDO).

## 5. Flujo (del doc)
1. **Invitado** consulta convocatorias PUBLICADAS vigentes y sus requisitos → postula (datos + comprobante)
   contra una convocatoria → `Matricula` PENDIENTE.
2. **Coordinador** revisa. Si falta/está mal → `observar` (OBSERVADA + observaciones). El postulante
   subsana (reenvía) → PENDIENTE.
3. Documentación conforme → `validar` (VALIDADA = habilitado para la evaluación presencial, **sin** promover).
4. Tras la evaluación presencial → `registrarResultado`: ADMITIDO (promueve a alumno) o NO_ADMITIDO (cierra).

## 6. Web
- **Convocatorias (Coordinador):** lista + alta/edición + cambio de estado (publicar/cerrar/finalizar).
- **Landing pública:** lista convocatorias PUBLICADAS vigentes con sus documentos requeridos; postular elige
  convocatoria.
- **Bandeja del Coordinador:** filtro por convocatoria + estado; acciones Observar / Validar / Rechazar /
  Registrar resultado según el estado.
- **Mi postulación (Postulante):** ve estado, observaciones a subsanar, y resultado de admisión cuando exista.

## 7. Constraints
- Retrocompat: matrículas existentes sin `idConvocatoria`/`observaciones` siguen válidas (columnas nullable;
  la de convocatoria puede quedar null para las históricas).
- Migración nueva `032-…` (+ las que hagan falta), `schema_prod.sql` + `data_prod.sql` + verificación PG
  (una convocatoria PUBLICADA de demo para el curso 1). Guard de orden de FK como en la lección del simulador.
- Spring Boot 3 / Java 17; pnpm; Conventional Commits sin trailer.
- Permisos: todo el filtro bajo `Manage Enrollments` (mismo Coordinador). Convocatorias también.

## 8. Decisiones del usuario (pendientes — requieren su respuesta)

Resueltas por mí y ya reflejadas arriba (del builder-check): estados RECHAZADA re-enviable vs NO_ADMITIDO
terminal (§4.2), guard de duplicados por convocatoria (§4.2), vacantes impuestas en la admisión (§4.3),
`idConvocatoria` obligatorio en la postulación pública (§4.5), `validar` desde PENDIENTE/OBSERVADA. Quedan
para ti:

1. **`validar` deja de promover a alumno** (la promoción se mueve a `registrarResultado` ADMITIDO). Es el
   núcleo del doc, pero **cambia el comportamiento actual** y obliga a actualizar los tests de validación
   existentes. ¿Confirmas la separación de las dos compuertas?
2. **Alcance documental y de subsanación.** Propongo: un solo archivo (`comprobante`) +
   `documentosRequeridos` como lista declarativa en la convocatoria; la observación es texto a nivel de
   matrícula. Y al **subsanar**, el postulante puede **re-subir el comprobante y corregir sus datos**
   (nombres, apellidos, dni, contacto — no el correo, que es su login). ¿Te sirve, o necesitas (a) carga
   real de varios documentos por convocatoria, o (b) subsanación solo del comprobante sin editar datos?
3. **`vacantes`**: lo dejé **impuesto** como tope en la admisión (no admitir más que las vacantes → 409).
   ¿Confirmas, o lo prefieres informativo?
4. **Separar `Persona`/`Alumno`** (del doc): ¿se difiere para después, como propongo?

### Respuestas (30 oct 2026) — "dale, seguimos el plan del doc"
1. **Confirmado:** `validar` ya no promueve; la promoción a alumno va en `registrarResultado` ADMITIDO.
2. **Confirmado (mi propuesta):** un `comprobante` + `documentosRequeridos` declarativo; subsanar re-sube el
   comprobante **y** corrige datos editables (nombres, apellidos, dni, contacto; NO el correo=login).
3. **Confirmado:** `vacantes` impuestas como tope en la admisión (409 al llenarse).
4. **Diferido:** separar `Persona`/`Alumno` queda como refactor transversal aparte, fuera de este módulo.
