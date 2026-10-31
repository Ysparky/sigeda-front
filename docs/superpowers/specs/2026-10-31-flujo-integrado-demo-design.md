# Flujo integrado del demo — diseño

**Fecha:** 2026-10-31
**Rama:** `feat/integracion-demo` (ambos repos) = base (landing + desarrollo del curso: teoría/práctica + tramo de entrada) + módulo de postulación + módulo de simulador.

## Intención y por qué

Hasta ahora el demo mostraba **solo el desarrollo del curso** (evaluaciones teóricas y prácticas) sobre alumnos sembrados. Con postulación y simulador ya construidos y reunidos en una rama, el objetivo es **un único flujo continuo**: una misma persona entra por el landing, postula, es admitida, se vuelve alumno de una **cohorte nueva**, y de ahí participa del desarrollo del curso. "Una persona continua", decidido con el usuario.

El demo cubre dos de los tres tramos del ciclo; el tercero queda nombrado y fuera de alcance:
1. **Entrada** — landing + postulación/admisión.
2. **Desarrollo del curso** — teoría + práctica + simulador.
3. **Parte final del curso** — PENDIENTE (se diseña después; ver No-goals).

## El flujo end-to-end (narrativa del demo)

**1 · Entrada** *(roles: Postulante, Coordinador Académico)*
- Landing público: catálogo de cursos sin sesión → "Inscribirme".
- El postulante se matricula a una **convocatoria** abierta con su comprobante. El alta crea su `Persona` (tipo `null`, rol **Postulante**), su `Usuario` y la `Matricula` PENDIENTE, en una transacción.
- El Coordinador revisa la bandeja, observa, y registra el **resultado de admisión**: ADMITIDO / NO_ADMITIDO (control de vacantes por convocatoria).

**2 · Desarrollo del curso** *(roles: Instructor, Jefe de Operaciones, Comandante, Alumno)*
- **Teoría:** materias, exámenes teóricos, banco de preguntas, subsanación, NIA.
- **Práctica:** programa PDI (fases/subfases/maniobras), turnos prácticos, evaluaciones DIRBE, asistencia, seguimiento y orden de mérito.
- **Simulador:** sesiones con calificación CBTA 1–5 por indicador y resumen competente/no-competente. **Módulo autónomo: NO alimenta la nota académica.**

**3 · Parte final del curso** — nombrada, sin construir.

## Modelo de cohorte (la corrección de dominio)

Una cohorte **no está siempre abierta**: tiene un ciclo de vida, y las inscripciones ocurren en **ventanas (2 por año**, 2da semana de ene/jul; ver `ventanas-matricula-duracion-curso`). Hoy el modelo no lo refleja: `grupos` no tiene estado ni fechas, y `cursos` es el programa (1 = Piloto de Helicóptero), no una corrida.

Quién gobierna qué:
- **`convocatorias`** ya modela la **ventana de inscripción**: tiene `estado` (PUBLICADA…) y `fecha_inicio`/`fecha_fin`. Es "abierto/cerrado **para inscripciones**". Cada convocatoria es una ventana → 2/año.
- **`grupos` = la cohorte/promoción** (la clase con sus alumnos). Es donde cuelga el desarrollo (teoría, turnos y seguimiento filtran por grupo). **Le falta un ciclo de vida.**

### Decisiones de modelado (con el usuario)
1. **`grupos` gana `estado`**: `EN_INSCRIPCION` → `EN_PROGRESO` → `CERRADA`, más `fecha_inicio`/`fecha_fin` (nullable). Hace explícito "en progreso / cerrada". Las fechas reflejan la corrida del curso: **81 días / ~4 meses** según el curso, **extensible hasta 120 días** por inconvenientes (coincide con `ventanas-matricula-duracion-curso`). **NO** se modelan horarios ni turnos mañana/tarde: no están definidos y no hay esa lógica en la escuela; la cohorte es solo estado + fechas.
2. **Cada convocatoria forma una cohorte NUEVA** (no se reusa un grupo existente). La convocatoria designa su cohorte con un campo nuevo **`convocatorias.id_grupo`** (FK escalar a `grupos`, nullable), y esa cohorte nace `EN_INSCRIPCION`.
3. **Al ADMITIR**, tras la promoción a Alumno (que ya existe: `tipo="Alumno"`, `estado="Apto"`, `rol=Alumno`), se asigna `persona.id_grupo = convocatoria.id_grupo`. Regla: solo se matricula a una cohorte **`EN_INSCRIPCION`** (no a una en progreso/cerrada); si la convocatoria no tiene cohorte, se admite sin grupo (compatible hacia atrás).
4. **Seed del demo (solo la cohorte abierta):** nuevo grupo **"Promoción 2026-I"** (`EN_INSCRIPCION`, curso 1) ← convocatoria 1 ("Admisión 2026-I"). Los grupos existentes (1–6) pasan a `EN_PROGRESO` (son las cohortes en curso que muestran teoría/práctica hoy). El modelo soporta una 2026-II futura, pero no se siembra.

### Continuidad: dónde termina la persona
El admitido queda como **alumno de la cohorte 2026-I (en inscripción)** — la misma persona, mismo código y cuenta. Como esa cohorte recién se forma, su actividad de teoría/práctica aún no existe (es lo realista: la clase no empezó); las cohortes `EN_PROGRESO` (grupos 1–6) son las que muestran el desarrollo en vivo. La **actividad concreta e inmediata** que el demo puede mostrar sobre el recién admitido es una **sesión de simulador** (el instructor la planifica por código, sin depender del estado de la cohorte). Opcional de scripting del demo: avanzar la cohorte a `EN_PROGRESO` para mostrarle actividad.

## Goals
- Flujo continuo demostrable: una persona de postulante → admitido → **alumno de la cohorte nueva** → (sesión de simulador como actividad inmediata).
- Modelar el ciclo de vida de la cohorte (`grupos.estado`) y que la admisión matricule a la cohorte en inscripción de la convocatoria.
- Todo lo existente sigue verde; el simulador sigue autónomo.

## Non-goals / Anti-goals
- **Parte final del curso** (certificación/acta/graduación): fuera de alcance; solo se nombra.
- **Split Persona/Alumno**: NO — la promoción por `tipo`+`rol` ya resuelve la persona continua.
- **Sembrar la 2da ventana (2026-II)**: fuera de alcance; el modelo la soporta.
- **Horarios y turnos (mañana/tarde)**: no se modelan; no están definidos en la escuela y no hay esa lógica. La cohorte no lleva horario.
- Anti-goal: que el simulador toque la nota; romper los alumnos/grupos sembrados; permitir matricular a una cohorte que no está en inscripción.

## Qué queda para el plan (el plan lo detalla)
**Backend**
- Migración nueva (035) + `schema_prod.sql` + test de convergencia: `grupos.estado` (varchar con CHECK EN_INSCRIPCION/EN_PROGRESO/CERRADA), `grupos.fecha_inicio`/`fecha_fin` (date, nullable), y `convocatorias.id_grupo` (Integer nullable, FK a `grupos`).
- Entidades/DTOs: `Grupo` gana `estado` (+ fechas); enum `EstadoCohorte`; `Convocatoria` gana `idGrupo` (escalar).
- `MatriculaServiceImpl.registrarResultado`: en ADMITIDO, asignar `persona.id_grupo` desde la convocatoria si existe y la cohorte está `EN_INSCRIPCION`; si no, 409/sin-grupo según corresponda (el plan fija el código y el texto).
- Tests de integración: (a) admitir en convocatoria con cohorte `EN_INSCRIPCION` → persona `tipo=Alumno` **y** `id_grupo` = esa cohorte; (b) convocatoria sin cohorte → admitido sin grupo, sin error; (c) cohorte no `EN_INSCRIPCION` → rechazo claro.
- `data_prod.sql`: grupo "Promoción 2026-I" `EN_INSCRIPCION` + convocatoria 1 → ese `id_grupo`; grupos 1–6 → `EN_PROGRESO`.

**Web**
- Mostrar en la admisión del Coordinador la **cohorte destino** y su estado; tras admitir, que el alumno quedó en esa cohorte. Si hay pantalla de grupos, mostrar el estado de la cohorte. Mock acorde. (Alcance mínimo; el plan decide qué vale para el demo.)

**e2e (contra el stack real)**
- Flujo continuo: matricular a la convocatoria 2026-I → el Coordinador admite → la persona aparece como **alumno de "Promoción 2026-I"** → se le planifica una sesión de simulador. Prueba de integración punta a punta del seam.

## Restricciones (del proyecto)
pnpm (nunca npm/npx); `mvnw` offline con `JAVA_HOME` de openjdk@17 y `sh ./mvnw`; nunca pipe de mvnw/psql por `head`; **solo commit — sin push ni merge**; terminología militar intencional; Conventional Commits cortos, **sin** trailer `Co-Authored-By`; no levantar el dev server del frontend (el e2e lo gestiona Playwright). Migración verificable contra PostgreSQL desechable por Docker.
