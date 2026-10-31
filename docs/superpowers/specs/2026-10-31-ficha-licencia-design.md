# Parte final del curso — Ficha de Licencia (PP-H) — diseño

**Fecha:** 2026-10-31
**Rama:** a crear al construir (p. ej. `feat/ficha-licencia`), a partir de `feat/integracion-demo`.
**Fuente del dominio:** `~/Downloads/Guia_RAP61_Piloto_Helicoptero_con_TUPA.docx` (resumen de la RAP 61, 2.ª ed., R.D. 0208-2023-MTC/12) y `~/Downloads/Calendario_y_horarios_curso_helicoptero.docx` §10. Las referencias §61.xxx son de la RAP 61.

## Intención y por qué

La "parte final del curso" cierra el ciclo: cuando una cohorte termina el curso, el sistema debe decir, **por alumno**, si cumple todo lo necesario para obtener la **licencia de Piloto Privado de Helicóptero (PP-H)** y alertar lo que falta o está por vencer, antes de derivar al trámite externo ante la DGAC. Hoy SIGEDA solo conoce el **resultado académico interno** (Estado Apto/No Apto, NIA/NSF, ciclos de chequeo); **no** guarda los datos de la licencia (horas de vuelo por tipo, médico, inglés, secundaria, examen DGAC, libro de vuelo). Decisión del usuario: **Ficha de Licencia completa** — capturar todo el §15/§16 como datos estructurados por alumno.

El curso da 94 h (supera las 40 h del PP-H); el **examen teórico de la DGAC y la prueba de pericia son POSTERIORES al curso** (no entran en los 81 días). La ficha acompaña ese tramo y lo controla.

## Alcance (qué es "completa")

Una **Ficha de Licencia** por alumno (expediente de obtención de la licencia PP-H), con:
1. **Requisitos personales** (§61.230): edad (17), secundaria completa, español, **inglés** (nivel + vigencia 3/6 años), **médico Clase 2** (fecha de vencimiento).
2. **Licencia de alumno piloto** (§61.195): fecha de emisión, vigencia 24 meses, firma del instructor para marca/modelo antes del primer solo.
3. **Libro de vuelo / horas por tipo** (§61.110, §61.245): registro acumulado de horas — total, doble mando, solo, solo de travesía, nocturnas (con despegues/aterrizajes), instrumentos, **simulador (tope 5 h)**, créditos por otras categorías (tope 25 h). Hito de travesía de 100 NM con 2 aterrizajes en 2 aeródromos.
4. **Teoría** (§61.235, §61.065): curso CIAC completo (deriva de SIGEDA: NIA) + **examen teórico DGAC** (fecha, nota ≥75% general y por área, **vigencia 1 año**).
5. **Instrucción y declaración del instructor** (§61.240): registro firmado + **declaración de competencia** (fecha del último vuelo de preparación → **vigencia 30 días**).
6. **Prueba de pericia** (§61.250, §61.080): fecha, resultado, datos de la aeronave (matrícula peruana, aeronavegabilidad, doble mando).
7. **Trámite DGAC / TUPA** (§61.030, §61.040): pagos de derechos (códigos S-DGAC-010 teórico, S-DGAC-011 práctica, DSA-001 solicitud), solicitud al Director DGAC, licencia temporal (≤30 días).

### Motor de validación y alertas (§16) — el corazón del módulo
- **Horas mínimas por requisito** (§61.245): 40 h total, ≥20 doble mando, ≥10 solo (≥5 travesía), travesía 100 NM, 3 h nocturnas con 10/10; tope de 5 h en simulador; créditos por otras categorías con su tope (25 h). El sistema marca cumple/falta por renglón.
- **Alertas de vencimiento:** médico; examen teórico (1 año); declaración del instructor (30 días); experiencia reciente (90 días, §61.130); licencia de alumno (24 meses); inglés (3/6 años); repaso de vuelo (24 meses).
- **Bloqueos de proceso:** pericia sin teórico vigente dentro de 12 meses; repetición de examen teórico antes de 30 días sin declaración; tres reprobaciones (teórico o pericia) → deniega; vuelo solo sin firma del instructor para marca/modelo; instructor con >8 h de instrucción en 24 h (§61.560).
- **Estado de la ficha (derivado):** por ejemplo `EN_PREPARACION` → `LISTA_PARA_PERICIA` (cumple requisitos + teórico vigente + declaración vigente) → `PERICIA_APROBADA` → `LICENCIA_EMITIDA`; o `OBSERVADA` si hay renglones faltantes/vencidos.

## Integración con lo que SIGEDA ya tiene
- **Deriva de SIGEDA (no se recaptura):** el resultado académico (`Persona.estado` Apto/No Apto, NIA/NSF del `legajo`/`seguimiento`) y la finalización del curso. La ficha solo se habilita para alumnos de una cohorte que **cierra**.
- **Se captura nuevo (no existe hoy):** todo lo demás del §15/§16 — horas por tipo, médico, inglés, secundaria, edad/fecha de nacimiento, examen DGAC, declaración, pericia, trámite.
- **Cierre de cohorte:** `grupos.estado` ya tiene `EN_PROGRESO → CERRADA`. Cerrar una cohorte (acción del Coordinador/Jefe) consolida el resultado académico por alumno y **abre/activa su Ficha de Licencia**. La cohorte solo cierra cuando corresponde (regla a definir: fin de fechas o acción manual).

## Roles
- **Coordinador Académico:** dueño de la ficha; captura y edita los datos de licencia, cierra la cohorte, ve el tablero de alertas.
- **Instructor:** registra/confirma la **declaración de competencia** y las horas de instrucción (vínculo `Turno.codInstructor`).
- **Alumno:** ve su propia ficha (solo lectura) y qué le falta.
- Permiso nuevo en Java (estilo `Permiso`/`Permission`/`Role`), p. ej. `Manage Licensing`.

## Web
- **Ficha por alumno:** las 7 secciones, con el estado derivado y el checklist §15 (verde/ámbar/rojo por renglón).
- **Tablero de cierre de cohorte:** la lista de alumnos de la cohorte con su estado de ficha y las alertas §16 (vencimientos y bloqueos), para el Coordinador.
- **Mi ficha (alumno):** solo lectura, qué cumple y qué falta/vence.

## Fases de construcción (el plan lo detalla; probablemente varios planes)
- **F1 · Cierre de cohorte + consolidación académica:** acción de cerrar (EN_PROGRESO→CERRADA) + por alumno el resultado académico que SIGEDA ya tiene. Chico; base del resto.
- **F2 · Ficha de Licencia (modelo + captura):** entidad/agregado por alumno con las secciones 1,2,4,5,6,7 (datos capturados) + permiso + CRUD web.
- **F3 · Libro de vuelo / horas por tipo:** registro de horas (sección 3), manual por totales y/o por sesión; sumatorias por tipo.
- **F4 · Motor §16:** validaciones de horas mínimas, alertas de vencimiento y bloqueos de proceso; estado derivado de la ficha; tablero de alertas.

## Non-goals / Anti-goals
- **Integración con sistemas de la DGAC** (rendir el examen, el expediente real): fuera. El trámite DGAC es externo; la ficha lo **acompaña y controla**, no lo reemplaza.
- **Formato legal del libro de vuelo** / Plataforma Digital del Estado: fuera; se modela lo necesario para validar horas, no el documento oficial.
- **RAP 67 (médico), RAP 141/142 (centro), bancos de preguntas DGAC:** fuera; solo se captura la **fecha/vigencia** del médico y del inglés, no su emisión.
- **Comercial, IFR, instructor, PTLA:** la ficha es para **PP-H**. El modelo puede dejar lugar para otras licencias, pero no se construyen.
- Anti-goal: que la ficha deje pasar a pericia sin teórico vigente, o marque apto sin cumplir las horas mínimas.

## Puntos a confirmar con la DGAC/CIAC (del §17 de la guía) — [V]
- Habilitación de **tipo** en una licencia nueva de PP (la RAP lista «todos los helicópteros»): cómo la anota la DGAC.
- **Vuelo nocturno del PP** (§61.255(b)): si además exige habilitación de instrumentos.
- Créditos por planeador (§61.245(b)(2)); edad exacta y detalles de inglés.
Estos se modelan como **configurables/[V]**, no como reglas duras, hasta validarlos.

## Restricciones (del proyecto)
pnpm; `mvnw` offline con `JAVA_HOME` openjdk@17 y `sh ./mvnw`; nunca pipe de mvnw/psql por `head`; **solo commit — sin push ni merge**; terminología militar intencional; Conventional Commits sin `Co-Authored-By`; no levantar el dev server (e2e vía Playwright); migraciones verificables contra PostgreSQL desechable por Docker; TDD.
