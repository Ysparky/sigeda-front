# Ficha de Licencia · F1 — Cierre de cohorte + consolidación académica — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Pasos con checkbox.

**Goal:** Cerrar una cohorte (EN_PROGRESO → CERRADA) y consolidar, por alumno, el resultado académico que SIGEDA ya tiene (Estado Apto/No Apto) — la base de la parte final.

**Architecture:** La cohorte (`grupos`) ya tiene `estado` (EstadoCohorte EN_INSCRIPCION/EN_PROGRESO/CERRADA) de la feature de integración. Se añaden las **transiciones** del ciclo, un endpoint para cambiar el estado (cerrar), y un **consolidado** que lista los alumnos de la cohorte con su Estado académico (derivado de `Persona.estado`, sin recapturar). Sin tocar la nota ni el simulador.

**Tech Stack:** Spring Boot 3.4.2 / Java 17 (sin Lombok), JPA, H2 en test. React 19 / TanStack / MSW / vitest.

**Spec:** `docs/superpowers/specs/2026-10-31-ficha-licencia-design.md` (fase F1).

## Global Constraints
- pnpm; `mvnw` offline con `export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home` y `sh ./mvnw`; nunca pipe de mvnw/psql por `head`.
- **Solo commit — sin push ni merge.** Conventional Commits sin `Co-Authored-By`. Terminología militar intencional. No levantar el dev server. Rama: a crear desde `feat/integracion-demo` (p. ej. `feat/ficha-licencia`).

## Review Focus
- Cerrar una cohorte que NO está EN_PROGRESO (EN_INSCRIPCION o ya CERRADA) → debe rechazarse (409), no cerrar.
- Consolidado de una cohorte sin alumnos (solo tipo null/Instructor) → lista vacía, sin NPE.
- El consolidado incluye solo **tipo='Alumno'** del grupo (no instructores ni personas sin tipo).
- Permiso: quién puede cerrar/consolidar (Coordinador, MANAGE_ENROLLMENTS); un rol sin el permiso → 403.
- Transición de estado concurrente/idempotente: cerrar dos veces → la segunda es 409 (ya no está EN_PROGRESO).

---

### Tarea 1: Transiciones de cohorte + endpoint de cambio de estado

**Files:**
- Modify: `simulador/entities/EstadoCohorte.java` → mover a `grupo/entities/EstadoCohorte.java` NO; ya vive en `grupo/entities/EstadoCohorte.java`. Añadir `puedeTransicionarA`.
- Modify: `grupo/services/IGrupoService.java`, `grupo/services/GrupoServiceImpl.java` (método `cambiarEstado`).
- Modify: `grupo/controllers/GrupoController.java` (PUT `/grupos/{id}/estado`).
- Create DTO: `grupo/dtos/CambioEstadoCohorte.java` (`@NotNull EstadoCohorte estado`).
- Test: `integration_test/GrupoCierreControllerTest.java` + fixture `src/test/resources/grupo/cierre.sql`.

**Interfaces:**
- Produces: `EstadoCohorte.puedeTransicionarA(EstadoCohorte)`; `IGrupoService.cambiarEstado(int id, EstadoCohorte)`; PUT `/grupos/{id}/estado`.

- [ ] **Paso 1: Test** (estilo `SesionSimuladorCicloControllerTest`, `@Sql` fixture con cohortes EN_INSCRIPCION/EN_PROGRESO/CERRADA y token Coordinador `coord.academico`):
  - `cerrarCohorteEnProgresoLaDejaCerrada`: PUT `/grupos/{idEnProgreso}/estado` {CERRADA} → 200; GET detalle → estado CERRADA.
  - `cerrarCohorteNoEnProgresoEs409`: PUT sobre una EN_INSCRIPCION → 409.
  - `cambiarEstadoDeGrupoInexistenteEs404`.
  - `sinPermisoEs403` (token sin MANAGE_ENROLLMENTS).
- [ ] **Paso 2: Correr → FALLA** (`sh ./mvnw -o test -Dtest=GrupoCierreControllerTest`). Expected: FAIL (no existe el endpoint).
- [ ] **Paso 3: `EstadoCohorte.puedeTransicionarA`** (espejo de `EstadoSesion`): `EN_INSCRIPCION → EN_PROGRESO`; `EN_PROGRESO → CERRADA`; resto false.
- [ ] **Paso 4: `IGrupoService.cambiarEstado(int id, EstadoCohorte nuevo)` + impl**: carga el grupo, aplica, guarda (el controlador valida la transición).
- [ ] **Paso 5: `CambioEstadoCohorte` DTO** (`@NotNull private EstadoCohorte estado;` + accesor).
- [ ] **Paso 6: `GrupoController` PUT `/grupos/{id}/estado`** con `@PreAuthorize(MANAGE_ENROLLMENTS)`: `bindingResult`→400; grupo null→`isNull`/404; `!grupo.getEstado().puedeTransicionarA(cuerpo.getEstado())`→`isConflict`/409; si no, `cambiarEstado` y OK. (Usar `Response` como los demás controladores.)
- [ ] **Paso 7: Correr → PASA.**
- [ ] **Paso 8: Suite** (`sh ./mvnw -o test`) y **commit**.

---

### Tarea 2: Consolidado académico de la cohorte

**Files:**
- Create DTO: `grupo/dtos/AlumnoConsolidado.java` (record `codigo`, `nombre`, `estadoAcademico`).
- Modify: `IGrupoService`/`GrupoServiceImpl` (método `consolidado(int id)`), `GrupoController` (GET `/grupos/{id}/consolidado`).
- Test: extender `GrupoCierreControllerTest` + fixture (ya con alumnos y sus estados).

**Interfaces:**
- Consumes: el grupo y sus `personas` (Tarea 1 / modelo existente).
- Produces: GET `/grupos/{id}/consolidado` → `List<AlumnoConsolidado>`.

- [ ] **Paso 1: Test** `consolidadoListaLosAlumnosConSuEstado`: GET `/grupos/{id}/consolidado` → contiene los alumnos (tipo='Alumno') del grupo con su `estadoAcademico` (Apto/No Apto), y NO incluye instructores ni personas sin tipo. `consolidadoDeCohorteSinAlumnosEsVacio` → lista vacía, 200.
- [ ] **Paso 2: Correr → FALLA.**
- [ ] **Paso 3: `AlumnoConsolidado`** record `(String codigo, String nombre, String estadoAcademico)`.
- [ ] **Paso 4: `GrupoServiceImpl.consolidado(int id)`**: del grupo, `personas` con `"Alumno".equals(p.getTipo())`, mapear a `AlumnoConsolidado(p.getCodigo(), nombre completo, p.getEstado())`. Null-safe si `personas` es null → lista vacía.
- [ ] **Paso 5: `GrupoController` GET `/grupos/{id}/consolidado`** (`@PreAuthorize(MANAGE_ENROLLMENTS)`, 404 si el grupo no existe).
- [ ] **Paso 6: Correr → PASA.**
- [ ] **Paso 7: Suite + commit.**

---

### Tarea 3 (web): cerrar la cohorte y ver el consolidado

**Files:**
- Modify: backend `grupo` detalle para exponer `estado` de la cohorte (si la proyección `GrupoDetalle` no lo trae); web `src/features/grupos/api.ts` (tipo + estado + `cambiarEstadoGrupo`, `consolidadoQuery`), `src/features/grupos/grupo-page.tsx` (badge de estado, botón "Cerrar cohorte" si EN_PROGRESO, tabla del consolidado).
- Modify: `src/mocks/sigeda/grupos.ts` (estado en el detalle, PUT estado, GET consolidado).
- Test: `src/features/grupos/*.test.tsx` (extender).

**Interfaces:**
- Consumes: PUT `/grupos/{id}/estado`, GET `/grupos/{id}/consolidado`, y el `estado` en el detalle del grupo.

- [ ] **Paso 1: Test** (vitest + MSW): en el detalle de un grupo EN_PROGRESO, el Coordinador ve el estado y el botón "Cerrar cohorte"; al cerrar, el estado pasa a "Cerrada". Y el consolidado muestra los alumnos con su estado académico.
- [ ] **Paso 2: Correr → FALLA.**
- [ ] **Paso 3: Implementar** backend (exponer `estado` en el detalle del grupo si falta) + web (tipo `estado`, `cambiarEstadoGrupo`, `consolidadoQuery`, UI en `grupo-page`) + mock. Etiquetas de estado: EN_INSCRIPCION→"En inscripción", EN_PROGRESO→"En progreso", CERRADA→"Cerrada".
- [ ] **Paso 4: Correr → PASA.**
- [ ] **Paso 5:** `pnpm typecheck && pnpm lint`; tests del feature por directorio (no la suite completa por la flakiness de workers). Backend `sh ./mvnw -o test`. **Commit.**

---

## Notas de ejecución
- Backend con `mvnw -o test`; web por directorios (`vitest run src/<dir>`), no la suite completa en paralelo.
- Permiso de F1: **MANAGE_ENROLLMENTS** (Coordinador maneja el ciclo de la cohorte); el permiso `Manage Licensing` del diseño se introduce en F2.
