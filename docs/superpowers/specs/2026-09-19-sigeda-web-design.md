# SIGEDA Web — Frontend design spec

**Date:** 2026-09-19
**Status:** awaiting review
**Repo:** `tesis-project/sigeda-web` (greenfield)
**Backends:** `../sigeda-back` (Spring Boot, `:8080`) · `../sigeda_chat_status` (NestJS, `:3000`)

---

## 1. Goal

Build the web client for SIGEDA, the academic management system of the thesis
*"Desarrollar un sistema web integrado con IA para la gestión académica"*
(Alarcón · Caldas). The system now covers the **full academic process of the
Curso Piloto de Helicóptero (PDI EA-510)**: ground instruction (theory) and air
instruction (practical), from enrolment to the student's final grade, plus
AI-assisted study.

This spec is the umbrella design: scope, architecture, screen inventory and
milestones. M0 and M1 are specified to acceptance-criteria level here; each of
M2–M5 gets a short addendum with its CUS acceptance criteria before its plan is
written.

### 1.1 Why the scope grew

The advisor's review (Linares) asked to enumerate the processes, to explain
where evaluations originate and how they relate to enrolment, courses and
attendance, and to define acceptance criteria per use case. The answer is the
process chain in §3: enrolment is the prerequisite, the programme structure
defines what is evaluated, and theory and practical evaluation feed a single
student record. Thesis §3.1.2's exclusion "No incluye gestión o resolución de
prácticas teóricas" no longer holds and must be removed from the thesis.

## 2. Decisions

| Decision | Choice |
|---|---|
| Starting point | Pure greenfield. `sigeda-frontend` is an archive; nothing is imported from it |
| Platform | Vite SPA · React 19 · TypeScript strict |
| Routing | TanStack Router, file-based, zod-validated search params |
| Server state | TanStack Query |
| UI | Tailwind CSS v4 · shadcn/ui · lucide · sonner |
| Forms | react-hook-form + zod |
| Auth | Real JWT against `sigeda-back` |
| Source of truth | `sigeda-back` code wins over thesis text when they disagree |
| Grades | Computed by the backend only; the frontend displays them |
| Theory API | Lives in `sigeda-back`; not implemented yet → contract-first (§11) |
| AI ↔ exams | AI generates questions; the instructor reviews them into the bank |
| Theory exam | Instructor schedules for a grupo; alumnos sit it online; auto-graded |
| Materia | A catalog entity (nota mínima, coeficiente, parte del curso) |
| Mission cycle | Derived views, no new backend (§5.3) |
| Evaluation changes | Only `Modify Evaluations` (Comandante, Admin), per backend and REG-NEG-002/003 |
| Enrolment | Admin registers personas, usuarios and grupos |
| Package manager | pnpm only |
| Conventions | Spanish domain names in code, Spanish UI, no code comments (rationale in `docs/`), short Conventional Commits without `Co-Authored-By` |

## 3. Scope

### 3.1 Processes

| # | Process | Actor | Milestone |
|---|---|---|---|
| P1 | Matrícula: personas, usuarios, grupos | Administrador Web | M2 |
| P2 | Programa: fases, subfases, maniobras, estándares, materias | Comandante · Jefe de Operaciones | M2 |
| P3 | Programación de turno práctico + mission cycle | Jefe de Operaciones | M1 |
| P4 | Evaluación práctica (= debriefing) | Instructor · Comandante | M1 |
| P5 | Banco de preguntas + turno teórico + examen online | Instructor · Alumno | M4 |
| P6 | Seguimiento: estado, chequeos, causales, legajo, NFPI, riesgo | Instructor · Comandante | M5 |
| P7 | Aprendizaje con IA: documentos, cuestionarios de práctica, consultas | All | M3 |

### 3.2 Roles

Permissions are enforced by `sigeda-back` (`Role.java`); the frontend mirrors
them for presentation only.

| Rol | Responsibilities in the app |
|---|---|
| Alumno | Own turnos, evaluaciones, exams and record; sits theory exams; AI study tools |
| Instructor | Registers the evaluación of the turnos assigned to them; question bank; schedules theory exams; sees own grupo |
| Jefe de Operaciones | Programs turnos prácticos; assigns estándares to maniobras |
| Comandante de Escuadrón | Fases, subfases, maniobras, materias; modifies or deletes evaluaciones; sees all grupos |
| Administrador Web | Personas, usuarios, roles, grupos; everything else |

A Chequeo de Operaciones is registered by whoever is the turno's assigned
instructor, so no extra role logic is needed when the Jefe de Operaciones flies
the check.

### 3.3 Out of scope

Maintenance and support; integration with other institutional systems;
user-to-user messaging and videoconference; the virtual classroom (Chamilo);
daily-conference attendance control; the ARO risk form; monthly flight
certificates; psychological appraisal; the Jefe de Instrucción role.

### 3.4 Domain rules the UI must respect

Sources: PDI EA-510 (Título III–IV), "Descripción Eval", "Flujo Desaprobado".

- **DIRBE** grades per maniobra: D, I, R, B, E. D is valid only when the
  required grade is D.
- Below the standard → observación, causa and recomendación are required.
- After a Regular or Malo flight, and in any chequeo, flights are only Bueno or
  Malo. The last mission of each subfase is a chequeo.
- Chequeo trigger: Adaptación and Helitransportadas — 3M, 2M+2R, 1M+4R or 6R;
  Aerotácticas — 2M, 1M+2R or 4R. Chequeo de Operaciones → Chequeo de Comando
  → Consejo de Evaluación de Vuelos.
- Materia passing grades: Ingeniería 16, Adoctrinamiento 18, Emergencias 20,
  Límites de Operación 20, others 16, Pre-Solo 18.
- A failed test or exam requires a subsanación within 24 h; the first grade
  prevails; **the alumno cannot fly until the subsanación is passed**.
- Unjustified rezagado scores 50%.
- Theory causales: average below 13 in a materia; 3 materias failed; 2 exams
  failed; second subsanación failed; 3 consecutive or 5 alternating fails of one
  periodic type or of inopinados.
- NFPI = NIT·0.2 + NIA·0.8 · NIT = NCT·0.8 + NEI·0.2 · NA = PE·0.6 + PT·0.4 ·
  NIA = NFAD·0.40 + NFOH·0.35 + NFOA·0.25. Computed by the backend.

## 4. Architecture

### 4.1 Structure

```
sigeda-web/
├── docs/                      specs, plans, contrato-api-teoria.md
├── e2e/                       Playwright
└── src/
    ├── routes/                file routes: guard, search schema, render a feature page
    ├── features/
    │   ├── auth/              login, sesión, cambiar contraseña
    │   ├── inicio/            role landing
    │   ├── administracion/    personas, usuarios, grupos
    │   ├── programa/          fases, subfases, maniobras, estándares, materias
    │   ├── turnos/            turno práctico, orden de vuelo, hoja de briefing
    │   ├── evaluaciones/      evaluación práctica
    │   ├── teoria/            turno teórico, rendir examen, resultados
    │   ├── banco/             preguntas, alternativas, importar desde IA
    │   ├── seguimiento/       escuadrón, alertas, legajo, reportes, riesgo
    │   └── aprendizaje/       documentos, cuestionario, consultas
    ├── lib/
    │   ├── api/               sigeda.ts · ia.ts · errors.ts · page.ts
    │   ├── auth/              session.ts · permissions.ts
    │   └── dominio/           dirbe.ts · estados.ts · briefing.ts
    ├── components/
    │   ├── ui/                shadcn primitives
    │   └── *                  AppShell, Sidebar, PageHeader, DataTable, EmptyState, ConfirmDialog, StatusBadge
    ├── mocks/                 MSW handlers: sigeda/ (captured fixtures), teoria/ (contract)
    └── theme.css              all design tokens
```

Each feature folder holds `api.ts` (query-key factory, queries, mutations,
types), `schemas.ts` (zod) and `components/`. Route files stay thin.

### 4.2 Environment

`VITE_SIGEDA_API_URL=http://localhost:8080` · `VITE_IA_API_URL=http://localhost:3000`
· `VITE_MOCK_TEORIA=true` while the theory API does not exist. The dev server
runs on `:5173`, the origin `sigeda-back` already allows in CORS.

M0 replaced `VITE_MOCK_TEORIA` with `VITE_MOCK_API` (`src/lib/config.ts`): `true` serves the
`sigeda-back` API from MSW (development only). `VITE_DEPENDENCIAS_RESUELTAS` (M2-14, default empty) lists, comma-separated,
the backend dependency numbers already fixed in the live `sigeda-back` (e.g. `22,30,32,33,37`);
actions that wait for an unlisted dependency stay disabled. Mock mode treats every dependency as resolved.

Node runs from nvm at `/Volumes/ORICO/sdks/nvm` (v25.1.0), which non-interactive
shells do not load; scripts put its `bin` on `PATH` explicitly.

Tooling follows the official Vite React template as of 2026-09: TypeScript 6.0
(not 7) and oxlint (not ESLint). shadcn/ui uses the Radix base and the Nova
preset; `src/components/ui` is vendored CLI output, excluded from lint.

## 5. Session, permissions and API layer

### 5.1 Session

1. `POST /auth/login` with `{ "username", "password" }` (Jackson names on
   `Usuario`) → `{ token, refresh_token, username }`.
2. `GET /api/usuarios/nombre/{username}` → `id`, `username`, `correo`,
   `codPersona`, `rol`. `Usuario.getPersona()` is commented out in the
   backend, so no persona data arrives; the UI shows the username until
   backend dependency 11 lands. The response also carries the password hash,
   which the session parser drops.
   Session = `{ usuario: { id, username, correo }, codPersona, rol, permisos }`.
   *Superseded by M2-10: from M2 this step reads `GET /api/personas/{username}`,
   which carries the persona and no hash (§14.2).*
3. Access token (24 h) in memory; refresh token (7 d) in `localStorage`. On
   boot: `POST /auth/refresh { refreshToken }` → `{ accessToken }`, then step 2.
4. Any 401: refresh once and retry; if refresh fails, clear the session and go
   to `/login?redirect=<path>`.
5. Logout: `POST /auth/logout { refreshToken }`, clear everything.

### 5.2 Permissions

- The UI checks permission names (`Manage Shifts`), never role names.
- Source: `permisos.ts` mirrors `Role.java`, keyed by `rol.nombre`. The
  backend's `rol.permisos` has no JSON mapping and would serialize enum
  constant names (`MANAGE_SHIFTS`) rather than the names `@PreAuthorize`
  checks (`Manage Shifts`), so it is not used. Recorded in
  `docs/decisiones.md`.
- One **route registry** declares path, required permission and nav entry per
  screen. Route `beforeLoad` guards and the sidebar both read it. `<Can>` hides
  actions.
- A 403 shows "No tiene permisos para esta acción".
- Screens scoped to "mine" (Mis turnos, Mis evaluaciones, Mis exámenes, own
  legajo) use `persona.codigo` from the session.

### 5.3 Mission cycle (derived)

| Stage | View | Derivation |
|---|---|---|
| Briefing diario (T−2 h) | Orden de vuelo del día | Turnos with `fechaPre = fechaPost = día` for both programas (PDI, PDE), then each detail; grouped by aeronave, sorted by hora |
| Briefing de detalle (T−1 h) | Hoja de briefing | Per maniobra of the turno: `nota_min ∈ {D, I, R}` → "Explica: Instructor"; `∈ {B, E}` → "Expone: Alumno" (PDI cap. VI) |
| Vuelo | Turno slot | Alumno's `horaInicio`–`horaFin` |
| Debriefing | Registrar evaluación | Observación, causa, recomendación |

The turno detail shows the four stages as a timeline per alumno, with the
debriefing stage done when the evaluación exists.

### 5.4 API clients and error normalisation

`lib/api/sigeda.ts` and `lib/api/ia.ts` wrap `fetch`, attach the Bearer token
(the IA client too, so real auth can be added there later without frontend
changes) and return data or throw `ApiError { status, message, fieldErrors? }`:

| Backend response | Frontend behaviour |
|---|---|
| `400` body `["'campo': mensaje", …]` | `fieldErrors` → shown under each field via `setError`; unmatched → form alert |
| `400`/`500` body `{ error, mensaje }` | Show `error`; `mensaje` (may contain SQL) goes to the console only |
| `404` text on a **list** endpoint | Empty list (the backend returns 404 for empty pages) |
| `404` text on a detail endpoint | Not-found page |
| `201 { mensaje, <entidad> }` · `200` text on delete | Success toast with `mensaje` |
| NestJS `{ statusCode, message }` | `message` (string or joined array) |
| Network failure | "No se pudo conectar con el servidor" + retry |

Spring `Page` responses map to `{ items, page, size, total, totalPages }`.
`page`, `size` and `sort` live in the URL. Mutations invalidate their feature's
query keys.

## 6. Screen inventory

Data: **Real** = existing endpoint · **Contract** = MSW against §11 until
implemented · **Derived** = computed from existing data.

### M0 — Cuenta

| Screen | Route | Permission | Data |
|---|---|---|---|
| Iniciar sesión | `/login` | — | Real |
| Inicio (per role) | `/` | any | Real |
| Cambiar contraseña | `/cuenta` | `Update` | Real |

### M1 — Turno y evaluación práctica

| Screen | Route | Permission | Data |
|---|---|---|---|
| Programación de turnos | `/turnos` | `Read` | Real |
| Registrar turno | `/turnos/nuevo` | `Manage Shifts` | Real |
| Modificar turno | `/turnos/$id/editar` | `Manage Shifts` | Real |
| Detalle de turno + timeline | `/turnos/$id` | `Read` | Real |
| Orden de vuelo del día | `/turnos/dia/$fecha` | `Read` | Derived |
| Hoja de briefing | `/turnos/$id/briefing/$alumno` | `Read` | Derived |
| Mis turnos | `/mis-turnos` | Alumno | Real |
| Evaluaciones | `/evaluaciones` | `Read` | Real |
| Registrar evaluación | `/turnos/$id/evaluar/$alumno` | `Write` + assigned instructor | Real |
| Detalle de evaluación | `/evaluaciones/$cod` | `Read` | Real |
| Modificar evaluación | `/evaluaciones/$cod/editar` | `Modify Evaluations` | Real |
| Mis evaluaciones | `/mis-evaluaciones` | Alumno | Real |

The evaluation list endpoint is per persona
(`/api/evaluaciones/filter/persona/{cod}`), so staff pick an alumno first. When
backend dependency 10 lands, the alumno becomes an optional filter.

### M2 — Matrícula y programa

| Screen | Route | Permission | Data |
|---|---|---|---|
| Personas + cuenta (usuario y rol) | `/personas` | `Manage Users` | Real + Contract |
| Grupos | `/grupos` | `Manage Groups` | Real |
| Fases y subfases | `/programa/fases` | `Read` (staff); writes `Manage Phases` | Real |
| Maniobras + estándares | `/programa/maniobras` | `Read` (staff); writes `Manage Maneuvers` · `Manage Standards` | Real + Contract |
| Materias | `/programa/materias` | `Read` (staff); writes `Manage Subjects` | Contract |

Adjusted by the M2 addendum: usuarios and roles live in the persona detail (M2-3), programa screens are readable by staff (M2-12). Nested screens, roles and breadcrumbs: §14.3.

### M3 — Aprendizaje (all roles)

| Screen | Route | Data |
|---|---|---|
| Documentos | `/aprendizaje` | Real |
| Cuestionario de práctica | `/aprendizaje/cuestionario` | Real |
| Consultas (RAG, `[n]` citations) | `/aprendizaje/consultas` | Real |

### M4 — Teoría y banco

| Screen | Route | Permission | Data |
|---|---|---|---|
| Banco de preguntas | `/banco` | `Manage Questions` | Contract |
| Importar desde IA | `/banco/importar` | `Manage Questions` | Real (IA) + Contract |
| Turnos teóricos | `/teoria/turnos` | `Manage Exams` | Contract |
| Resultados por turno | `/teoria/turnos/$id` | `Manage Exams` | Contract |
| Mis exámenes | `/examenes` | `Take Exams` | Contract |
| Rendir examen | `/examenes/$id` | `Take Exams` | Contract |

### M5 — Seguimiento

| Screen | Route | Permission | Data |
|---|---|---|---|
| Escuadrón | `/seguimiento` | `View My Group` / `View All Groups` | Real |
| Alertas | `/seguimiento/alertas` | `View Disapproved` | Real + Contract |
| Legajo del alumno | `/seguimiento/$alumno` | `Read` (alumno: own only) | Real + Contract |
| Reportes y orden de mérito | `/reportes` | `Create Reports` | Real + Contract |
| Predicción de riesgo | inside the legajo | `View Disapproved` | Real (IA) |

## 7. Acceptance criteria

Criteria IDs name the tests that prove them (§8), so the thesis test report can
cite them. Messages match the backend's own validation messages.

### CUS Iniciar sesión (M0)

- **CA-SES-01** Credenciales válidas llevan al Inicio del rol; inválidas muestran "Usuario o contraseña incorrectos" sin revelar cuál falló.
- **CA-SES-02** Recargar la página mantiene la sesión mientras el refresh token sea válido.
- **CA-SES-03** Con el token vencido, la siguiente petición se renueva y reintenta sin intervención del usuario.
- **CA-SES-04** Una ruta sin permiso no se muestra en el menú y, si se accede por URL, muestra "No tiene permisos para esta acción".
- **CA-SES-05** Cerrar sesión invalida el refresh token en el servidor y vuelve a `/login`.

### CUS Cambiar contraseña (M0)

- **CA-CTA-01** Exige la contraseña nueva dos veces e iguales; al guardar muestra el mensaje del backend.

### CUS Gestionar Turno (M1, Jefe de Operaciones)

- **CA-TUR-01** La lista muestra nombre, subfase, programa, fecha de evaluación, cantidad de alumnos y de maniobras; filtra por subfase, programa y rango de fechas; los filtros y la página persisten en la URL.
- **CA-TUR-02** La fecha de evaluación debe ser posterior a hoy.
- **CA-TUR-03** El nombre tiene de 10 a 30 caracteres y no puede ser solo espacios.
- **CA-TUR-04** Se requiere al menos un alumno y una maniobra, sin duplicados.
- **CA-TUR-05** Las maniobras ofrecidas son las de la subfase elegida; cambiar la subfase pide confirmación y limpia las maniobras.
- **CA-TUR-06** La nota mínima de cada maniobra solo puede ser D, I, R, B o E.
- **CA-TUR-07** Cada alumno tiene hora de inicio y fin en formato HH:mm con fin posterior a inicio; se advierte antes de guardar si el horario se superpone con otro turno de la misma aeronave ese día.
- **CA-TUR-08** Una aeronave que no está Disponible no se puede seleccionar.
- **CA-TUR-09** Instructor y aeronave son obligatorios.
- **CA-TUR-10** El detalle muestra los datos del turno, los alumnos con su horario, las maniobras con su nota mínima y la línea de tiempo de la misión por alumno.
- **CA-TUR-11** Eliminar pide confirmación; si el turno ya fue evaluado, la acción no está disponible y se explica el motivo.
- **CA-TUR-12** Modificar aplica las mismas validaciones que registrar.
- **CA-TUR-13** Los errores de validación del backend aparecen bajo el campo correspondiente.
- **CA-TUR-14** El alumno solo ve sus propios turnos.
- **CA-TUR-15** La orden de vuelo del día agrupa los turnos por aeronave y los ordena por hora.
- **CA-TUR-16** La hoja de briefing marca "Explica: Instructor" para maniobras con nota mínima D, I o R, y "Expone: Alumno" para B o E.

### CUS Generar Evaluación (M1, Instructor)

- **CA-EVA-01** La lista muestra código, nombre, fase, evaluador, fecha, alumno, promedio y clasificación; filtra por subfase, programa y clasificación.
- **CA-EVA-02** Solo el instructor asignado al turno puede registrar la evaluación de sus alumnos, y solo una vez por alumno y turno.
- **CA-EVA-03** El formulario pide nombre (10 a 30 caracteres), categoría (Ponderada, Chequeo, Chequeo Sub Fase, Complementación), recomendación general (máximo 250 caracteres), enlace opcional a material de respaldo, y una calificación por cada maniobra del turno.
- **CA-EVA-04** Solo se habilitan calificaciones válidas para la nota mínima de cada maniobra (D solo si la nota mínima es D).
- **CA-EVA-05** Una calificación bajo el estándar exige observación, causa y recomendación antes de guardar.
- **CA-EVA-06** No se puede guardar con maniobras sin calificar.
- **CA-EVA-07** Tras guardar se muestran el promedio y la clasificación devueltos por el backend; el frontend no los calcula.
- **CA-EVA-08** El detalle muestra los datos de la evaluación y, por maniobra, nota mínima, nota obtenida, causa, observación y recomendación.
- **CA-EVA-09** Modificar y eliminar solo están disponibles con el permiso Modify Evaluations; eliminar pide confirmación.
- **CA-EVA-10** El alumno solo ve sus propias evaluaciones.

## 8. Design system and UX

- All colours, radii and fonts are tokens in `theme.css`; no component inlines a
  colour. Light default plus dark mode (system or toggle).
- Inter; `tabular-nums` on every figure; grades with 2 decimals; dates
  `dd/MM/yyyy` (es-PE); all text in Spanish.
- Fixed semantic colours, always paired with a text label, for DIRBE grades,
  clasificación de vuelo and the seven estados del alumno. Primary: aviation
  navy. Red only for alarm and destructive actions.
- Collapsible sidebar grouped by process, filtered by permission; header with
  breadcrumbs, user, role and theme. Mobile: sidebar becomes a sheet.
- Alumno screens are mobile-first; staff screens desktop-first and usable on
  tablets.
- Large forms are pages; small ones are dialogs. Skeletons, empty states with a
  next action, confirm dialogs, sonner toasts.
- Registrar evaluación: one row per maniobra with nota mínima and a DIRBE
  segmented control; invalid grades disabled; a below-standard row expands with
  observación (red label), causa (blue) and recomendación (default text), the
  institution's convention; a live count of below/above-standard maniobras,
  informational only.
- Accessibility: Radix keyboard behaviour, visible focus, labels on every input,
  WCAG AA contrast in both themes.
- M0 ends with a design review: shell plus one reference screen, run in the
  browser, approved before M1 starts.

## 9. Testing

- **Unit (Vitest):** error normalisation and field-error parsing, page mapping,
  permission guards and route registry, DIRBE option validity, briefing rule,
  subsanación block, zod schemas.
- **Component (Testing Library + MSW):** each CUS main flow and exceptions.
  `sigeda-back` handlers use fixtures captured from the running backend at the
  start of each milestone; theory handlers follow `docs/contrato-api-teoria.md`.
- **E2E (Playwright):** against the real backends with seed data — login per
  role and the M1 flows end to end.
- Tests carry the criterion ID in their name (`CA-TUR-02 …`).
- Every task passes `typecheck`, `lint`, `test` and `build`.

## 10. Backend dependencies

A checklist for `sigeda-back` (Victor) and `sigeda_chat_status`.

| # | Change | Repo | Needed by |
|---|---|---|---|
| 1 | `GET /api/aeronaves` (id, nombre, estado) | back | M1 — blocks Registrar turno |
| 2 | Stop serializing the password hash in `/api/usuarios/nombre/{nombre}` (widened by 24, §14.5) | back | M0 — security |
| 3 | `PUT /api/usuarios/{id}` accepts any id from any user with `Update` and does not ask for the current password: restrict to the user themself or `Manage Users`. *Amended in M2:* on one's own account the body carries `passwordActual` (required, checked against the stored hash, even with `Manage Users`); `Manage Users` resets another account without it (contract `contrato-api-matricula.md` §2.3) | back | M0 — security |
| 4 | `Manage Groups` for Administrador only | back | M2 |
| 5 | Materia catalog + CRUD + `Manage Subjects` (Comandante) | back | M2 |
| 6 | Theory API (§11) + `Manage Questions`, `Manage Exams` (Instructor), `Take Exams` (Alumno) | back | M4 |
| 7 | `GET /api/personas/{cod}/estado-teorico` | back | M4; feeds the M1 subsanación block |
| 8 | NIT / NIA / NFPI and orden de mérito | back | M5 |
| 9 | Accept `sigeda-back`'s JWT (shared secret) so documents are per user; prediction over real evaluaciones | chat_status | M3 / M5 |
| 10 | Evaluation list across alumnos with the same filters | back | M1 nice-to-have |
| 11 | Include persona (nombre, apellidos, tipo, idGrupo) in `/api/usuarios/nombre/{nombre}` — *superseded by M2-10 and dependency 25 (§14)* | back | M1 — header and "mine" screens |

## 11. Theory API contract

Full request and response shapes are in `docs/contrato-api-teoria.md`, written
for implementation in `sigeda-back`. Summary:

- `/api/materias` — CRUD.
- `/api/preguntas` — paginated list filtered by materia, dificultad and tipo;
  CRUD with nested alternativas; `POST /api/preguntas/lote` for the AI import.
- `/api/turnos-teoricos` — list and create; scores must add up to 20; edit and
  delete only before the window opens; `GET /{id}` includes results.
- Alumno: `GET /api/examenes/pendientes`; `POST /api/turnos-teoricos/{id}/iniciar`
  creates the Cuestionario and returns questions **without** `correcto`;
  `PUT /api/cuestionarios/{id}/respuestas` autosaves;
  `POST /api/cuestionarios/{id}/entregar` grades; the window closing submits
  automatically.
- `GET /api/personas/{cod}/estado-teorico` → `{ bloqueadoPorSubsanacion, pendientes[], causales[] }`.

## 12. Milestones

| Milestone | Content | Blocked by |
|---|---|---|
| M0 Foundation | Scaffold, tokens, shell, session, route registry, API clients, errors, Inicio, Cambiar contraseña, design review | — |
| M1 Práctico | P3 + P4 | Dependency 1 for Registrar turno |
| M2 Matrícula + Programa | P1 + P2 | 5 for Materias to go real; 22, 30, 32 (+33), 37 before the gated actions run against the live backend (M2-14, §14.5) |
| M3 Aprendizaje | P7 | — (9 recommended) |
| M4 Teoría + Banco | P5, contract-first | 6, 7 to go real |
| M5 Seguimiento | P6 | 7, 8 |

Each milestone has its own implementation plan in `docs/superpowers/plans/`.

## 13. Addendum M1 — Turno y evaluación práctica

**Date:** 2026-09-19 · **Status:** decided autonomously overnight (user asleep, standing instruction to chain milestones); every decision below is a ruling the user can reverse.

### 13.1 Backend state

Read from `sigeda-back` source (branch `main`, commit `ec2b0dd`); the backend and its database were not running, so nothing was verified live. The full read-only contract, with file:line evidence, is `docs/contratos/sigeda-back-m1.md`. What matters for M1:

- `GET /api/turnos` and `GET /api/turnos/alumno` project `TurnoRealizado.cantGrupo`, which no longer exists on `Turno` (it has `cantAlumno`).
- `GET /api/turnos/{id}` projects `DetalleTurno.gruposTurno`, a relation `Turno` no longer has (it now has a flat `codInstructor` and `alumnosTurno` with times). The detail endpoint cannot return its declared shape.
- There is no endpoint that lists aeronaves.
- `POST`/`PUT /api/turnos` return 200 with the raw entity (not `201 {mensaje, turno}`); `alumnosTurno`/`maniobrasTurno` are `@JsonIgnore`, so the response never shows what was saved.
- `Alumno_TurnoSave` has no default constructor and its constructor parameters are `inicio`/`fin`; whether the JSON keys are `horaInicio`/`horaFin` or `inicio`/`fin` is undetermined.
- Turno validation errors come from `GlobalExceptionHandler` as `ErrorResponse {timestamp, status, error, message, messages[]}`; evaluation rule errors come as `{mensaje}` (400/403) and, for invalid grades, `{"mensaje:": [...]}` (typo'd key). Turno edit/delete of a past turno returns **410**.
- No schedule-overlap validation exists server-side.
- The backend does not require causa/observación/recomendación for a below-standard grade, and does not check that the caller is the turno's instructor.

### 13.2 Decisions

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| M1-1 | **Contract-first for turnos, as for theory.** `docs/contrato-api-turnos.md` (Spanish, for Victor) fixes the shapes the frontend consumes: `GET /api/aeronaves`; list rows with `cantAlumno`; detail with `codInstructor`, `instructor`, `aeronave {id, nombre, estado}`, `alumnosTurno[{codAlumno, alumno, horaInicio, horaFin}]`, `maniobrasTurno[{nota_min, maniobra}]`; create/update `201 {mensaje, turno}`. MSW implements it; the frontend tolerates today's `200` raw entity too. | The backend's turno surface is mid-refactor (commits today); building against its current projections would encode known bugs. | Rework of the turno API adapters if Victor chooses other shapes; screens are unaffected. |
| M1-2 | **Error normaliser learns the other two shapes.** `ErrorResponse`: `messages[]` → field errors, `message` → message. `{mensaje: string}` → message. `{"mensaje:": string[]}` → messages joined. 410 → the backend message. | Without it, every turno validation error and every evaluation rule error shows the generic message. | None; strictly additive. |
| M1-3 | **Categoría has two spellings.** Requests send the enum names `Ponderada`, `Chequeo`, `chequeoSubFase`, `Complementacion`; responses carry `Ponderada`, `Chequeo`, `Chequeo Sub Fase`, `Complementación`. One mapping module owns both. Suggested categories come from `GET /api/personas/{cod}/status`. | Backend reality (Categoria.java). | Low. |
| M1-4 | **DIRBE options per nota mínima** follow `Dirbe.calificacionNoValida`: D→[D]; I→[I, R]; R→[I, R, B]; B→[I, R, B, E]; E→[I, R, B, E]. **Below standard** = `RI`, `BI`, `BR` (`Dirbe.calificacionBajoEstandar`). | Backend is the source of truth; a wrongly encoded grade breaks the whole calculation. | If the PDI's broader "below standard" (e.g. `EB`) is wanted, backend and frontend change together. |
| M1-5 | **Causa, observación and recomendación are required client-side** for below-standard grades (CA-EVA-05); the backend gap is dependency 13. | Spec requirement; backend does not enforce it. | None. |
| M1-6 | **"Registrar evaluación" is offered only to the turno's `codInstructor`** (session `codPersona`) for Ponderada and Chequeo Sub Fase; Chequeo and Complementación ask for an evaluator code (defaults to the current user). The backend does not enforce the first rule (dependency 14). | Spec CA-EVA-02; the backend requires `codEvaluador` for non-programmed categories. | UI gate only until the backend enforces it. |
| M1-7 | **Turno edit/delete is disabled once `fechaEval` is today or earlier**, with the explanation "El turno ya no se puede modificar porque su fecha pasó." | The backend's rule is date-based (`permiteCambios`), not "has evaluations" (its message says otherwise). | Wording only. |
| M1-8 | **Only the alumno's latest evaluation can be modified or deleted**; other rows show why. | Backend rule (`codEvalRealizada`). | None. |
| M1-9 | **Alumno pickers by role**: Comandante/Admin `GET /api/grupos/programa/{p}`; Instructor `GET /api/grupos/instructor/{cod}/programa/{p}`; Jefe de Operaciones `GET /api/alumnos/programa/{p}` (also the turno form's source). Contract-first shapes (the instructor projection has a cardinality bug). | Permissions differ per role in `sigeda-back`. | Adapter rework only. |
| M1-10 | **Aircraft overlap is a client-side warning** from `GET /api/turnos/{fecha}/aeronave/{id}` (contract fixes its path-variable binding); saving is still allowed. | No server-side check exists. | A double booking can still be saved until the backend validates. |
| M1-11 | **Playwright moves to the first milestone that runs against a live, fixed `sigeda-back`.** M1 relies on component tests over the contract mocks. | The backend is not running and its turno endpoints are broken. | Integration evidence for the thesis arrives later. |
| M1-12 | **Breadcrumbs arrive in M1** with the first nested screens. | Deferred from M0. | None. |

### 13.3 Acceptance-criteria amendments

- **CA-TUR-01** — list columns: nombre, subfase, programa, fecha de evaluación, cantidad de alumnos, cantidad de maniobras.
- **CA-TUR-11** — replaced: "Modificar y eliminar solo están disponibles mientras la fecha del turno sea posterior a hoy; si no, se explica el motivo. Eliminar pide confirmación."
- **CA-EVA-02** — "Solo el instructor asignado al turno ve la acción de registrar la evaluación ponderada o de chequeo de sub fase de sus alumnos, una vez por alumno y turno."
- **CA-EVA-04** — options per nota mínima exactly as M1-4.
- **CA-EVA-11** (new) — "La categoría se elige entre las sugeridas por el estado del alumno; en Chequeo y Complementación se indica el código del evaluador."
- **CA-EVA-12** (new) — "Solo la última evaluación del alumno puede modificarse o eliminarse; en las demás se explica el motivo."
- **CA-EVA-13** (new) — "Los errores de reglas del backend (alumno no apto, evaluación ya registrada, notas incorrectas) se muestran con su mensaje."

### 13.4 Backend dependencies added

| # | Change | Needed by |
|---|---|---|
| 12 | Fix `TurnoRealizado` (`cantAlumno`) and `DetalleTurno` (codInstructor, instructor, aeronave, alumnosTurno with hours) | M1 live |
| 13 | Require causa/observación/recomendación for below-standard grades | M1 |
| 14 | Only the turno's instructor may register its Ponderada/Chequeo Sub Fase evaluations | M1 |
| 15 | Server-side aircraft/alumno schedule overlap check (`HorasInicioFin` is never called) | M1 |
| 16 | `Alumno_TurnoSave`: default constructor, JSON keys `horaInicio`/`horaFin` | M1 live |
| 17 | `@PreAuthorize` on 4 `DesaprobadoController` endpoints and `GET /subfases/assigned` | M5 |
| 18 | Response-key typo `"mensaje:"`, NPE risks in `EvaluacionController.update`, `contD` never incremented, `GrupoController.detail` missing `return` | M1 |
| 19 | Seed mojibake in `roles` (breaks `Comandante de Escuadrón` permissions) | M1 live |
| 20 | Enforce alumno ownership server-side: `GET /api/turnos/{id}`, `/api/turnos/alumno?codAlumno=` and `/api/evaluaciones/**` are `Read` for any role; the frontend check is UI-only | M1 |
| 21 | Add `idSubfase` to `DetalleTurno` (Modificar turno recovers it by name today) | M1 live |

## 14. Addendum M2 — Matrícula y programa

**Date:** 2026-09-19 · **Status:** controller rulings M2-1..M2-11 (`.superpowers/notas/investigacion/m2-decisiones.md`), refined and extended after re-reading `sigeda-back`, then revised after review (`.superpowers/notas/m2/revision-addendum.md`, A1–F3); every decision below is a ruling the user can reverse. Contract for Victor: `docs/contrato-api-matricula.md`.

### 14.1 Backend state

Read from `sigeda-back` source (branch `main`, commit `ec2b0dd`, Spring Boot 3.4.2 per `pom.xml:11`); nothing was run. Java paths are relative to `src/main/java/com/sigeda/backend/`; `.sql` and `.properties` files live in `src/main/resources/`; a bare `:line` points into the last file named. The research note `m2-contrato-backend.md` was re-verified line by line; its errors are corrected here (marked *corrects the note*).

**Two conventions.** Persona, Usuario, Rol and Grupo controllers take raw entities with no `@Valid` and no Bean Validation, answer through `utils/Response.java` (text 404/403/400, `201 {mensaje, <entidad>}`) and page with `Page_Sort` (single `property`, no size cap). Fase, SubFase, Maniobra and Estándar take `@Valid` DTOs whose failures reach `GlobalExceptionHandler.java:80-92` as `ErrorResponse.messages[]`, and page with `PageWithSort` (`properties[]` ∈ {`id`, `nombre`}, size 1–10, `PageWithSort.java:15-44`). `ConstraintErrors.formatErrors` never sorts (`ConstraintErrors.java:38-44`), so a field can carry several messages in any order.

**Personas and usuarios**
- `POST /api/personas` stores a random 8-character password **in plaintext** (`grupo/controllers/PersonaController.java:237-249`; `security/services/UsuarioServiceImpl.java:42-46` never encodes) while login compares with BCrypt (`security/config/SecurityConfig.java:63-64`), and never sets `rol`, which `security/services/UserDetailsServiceImpl.java:48-50` rejects. The username is the first name (`PersonaController.java:246`), the correo is generated (`:247-248`), `tipo`, `dni` and `codigo` are unchecked, and `Persona.usuario` is `@JsonIgnore` (`grupo/entities/Persona.java:48-50`), so a client cannot send account data. Every persona created today has an account that cannot log in.
- `PUT /api/personas/{cod}` copies only `rango` and `tipo`, nulling whichever is omitted (`PersonaController.java:277-278`), and answers 201.
- `DELETE /api/personas/{cod}` has three 403 text rules (`PersonaController.java:296-303`). It NPEs (500) when the persona has no usuario (`:305-308`), and fails with an FK error (500) when the usuario holds a refresh token (`schema_prod.sql:348-351`). By then the usuario has already been saved without persona or rol, because the handler is not transactional.
- `GET /api/personas` projects `IndexPersona` = codigo, nombre, aPaterno, aMaterno, rango: **no `tipo`**, no filters (`PersonaController.java:71-100`, `grupo/projections/IndexPersona.java:5-8`).
- `GET /api/personas/{cod}/usuario` projects `DetalleUsuario` with **no `usuario.id`**, `estado` or grupo (`security/projections/DetalleUsuario.java:7-22`), and NPEs (500) for a persona without usuario (`grupo/services/PersonaServiceImpl.java:69`).
- `GET /api/personas/{nom}` (by **username**) has its `@PreAuthorize` commented out (`PersonaController.java:138-139`). Its projection `DetalleSesion` carries codigo, nombre, apellidos, `idGrupo` and `usuario {nombre, correo, id, rol {id, nombre}}`, and **no password** (`security/projections/DetalleSesion.java:7-19`). The endpoint leaks personal data to any authenticated user but not the hash (*corrects the note*, which said it exposes the hash).
- `GET /api/usuarios/{id}`, `/nombre/{nombre}` and `/persona/{cod}` have no `@PreAuthorize` and serialize the entity with `contraseña` as `"password"` (`security/controllers/UsuarioController.java:36-85`, `security/entities/Usuario.java:28-29`): the BCrypt hash, or the plaintext password of accounts created by `POST /api/personas`. The 201 bodies of both `PUT /api/usuarios/{id}` and `PUT /api/usuarios/{id}/rol` echo it too.
- There is no usuario list. `PUT /api/usuarios/{id}` overwrites the username with whatever arrives (`UsuarioController.java:99`) and BCrypts `password`, which fails with a 400 `ErrorResponse` "rawPassword cannot be null" when omitted (`:100`). `PUT /api/usuarios/{id}/rol` stores `rol` as sent, and an unknown id is a 500 FK error (`:110-135`).
- `GET /api/roles` (`Manage Roles`) → `[{id, nombre, descripcion}]`; the seed descriptions and the Comandante name carry mojibake (`data_prod.sql:71-76`, dependency 19).
- `security/entities/Role.java:8-37` grants `Manage Users` and `Manage Roles` to Administrador Web only; `Manage Groups` to Administrador Web and Jefe de Operaciones; `Manage Phases`, `Manage Subphases` and `Manage Maneuvers` to Administrador Web and Comandante de Escuadrón; `Manage Standards` to Administrador Web and Jefe de Operaciones. `src/lib/auth/permisos.ts` matches it in full.

**Grupos**
- `POST /api/grupos` assigns every listed `personas[].codigo` (`grupo/controllers/GrupoController.java:197-203`). `PUT` assigns or removes by `checked` (`:228-234`) and ignores `programa` (`:224-225`). An unknown `codigo` NPEs (500) after the grupo is saved (`:199-200`). An invalid `programa` is stored as null (`application.properties:35`, `READ_UNKNOWN_ENUM_VALUES_AS_NULL`). No field is validated.
- `GET /api/grupos/{id}` answers **200 with an empty body** for a missing grupo: the missing `return` (`GrupoController.java:99-100`, dependency 18) falls through to `ResponseEntity.ok(null)` (`:102`), which writes no body; `src/lib/api/http.ts:28-29` reads it as `null`. `DELETE` detaches the members first (`:253-258`).

**Programa**
- `PUT /api/fases/{id}` replaces the subfase list with orphan removal (`maniobra/entities/Fase.java:28`, `maniobra/services/FaseService.java:69-70`), so an omitted subfase is **deleted** with no check. `turnos.id_sub_fase`, `evaluaciones_practicas.id_sub_fase` and `maniobras_subfase` have no FK to `subfases` (`schema_prod.sql:164,278,128-132`).
- `DELETE /api/fases/{id}` first runs `deleteByManiobrasSubfaseIsNull()` (`FaseService.java:78`), which deletes **every subfase without maniobras in every fase**. With the seed, deleting any fase removes Contacto and Formación, which seeded turnos 1–3 and 7 use (`data_prod.sql:122-129`). A missing id answers 204, because Spring Data JPA 3 ignores it (*corrects the note*, which predicted a 500), and the global cleanup has already run by then.
- `GET /api/maniobras/{id}` returns `estandares` but **no `subfases`** (`maniobra/projections/DetalleManiobra.java`). Create and update return only `{id, nombre, descripcion}` (`maniobra/entities/Maniobra.java:31-39`, `@JsonIgnore`).
- `PUT /api/maniobras/{id}` looks up each link with `findByIdSubfase(idSubfase)` over the whole table (`maniobra/services/ManiobraService.java:113`, `maniobra/dao/IManiobra_SubfaseDao.java:15`). That is a **500** whenever the subfase has two or more maniobras (seed subfases 2, 3 and 4), and it takes over another maniobra's link when exactly one exists. Its not-found message says "fase" (`ManiobraService.java:100`). *Not in the note.*
- An unknown `idSubfase` is stored silently. The only FK on the link table targets a misspelled `maniobras_subfases` (`schema_prod.sql:328-331`); *corrects the note*, which predicted a 500.
- `DELETE /api/maniobras/{id}` refuses with a 410 when the maniobra has estándares, but the message blames a turno (`ManiobraService.java:128-129`). A maniobra without estándares that is used in `maniobras_turno` or `calificaciones` hits their FKs (`schema_prod.sql:303-306,333-336`) and fails with a 500.
- In `PUT /api/fases/{id}` and `PUT /api/maniobras/{id}/estandar`, an `id > 0` that does not exist creates a new row (`FaseService.java:64-66` with `maniobra/dtos/SubfaseSave.java:21-22`; `ManiobraService.java:86-88` with `maniobra/dtos/EstandarSave.java:15-16`).
- `PUT /api/maniobras/{id}/estandar` updates (`id > 0`) or creates. An omitted estándar is neither deleted nor detached: it keeps its FK and **reappears** in the detail (`Maniobra.java:36`, no orphan removal; *corrects the note*, which said "unreachable").
- Blank `descripcion` never clears the stored one (`maniobra/dtos/FaseSave.java:37-38`, and likewise in `SubfaseSave`, `ManiobraSave` and `EstandarSave`). No standalone subfase or estándar CRUD exists.
- **No materia code exists** in `sigeda-back`.

**Frontend notes.**
- `normalizarError` maps every 403 to "No tiene permisos para esta acción" (`src/lib/api/errors.ts:82`), which hides the persona-delete rules (M2-4).
- `rutaDeCampo` (`src/lib/formularios.ts:4-10`) already turns the backend's nested keys into react-hook-form paths (`'subfases[0].nombre'` → `subfases.0.nombre`, `'usuario.username'` stays nested), so the field arrays and the account block need no new mapping.
- `sesion.ts:18-24` requires `rol`; a `rol: null` session throws a `ZodError`, which `restaurar` does not treat as an invalid account (M2-10).
- M0's Cambiar contraseña types the `PUT /api/usuarios/{id}` response as `{mensaje}` without parsing it (`cambiar-contrasena-page.tsx:40`), so the echoed `password` sits in memory (M2-3).

**Messages the criteria show** (the CAs cite these IDs):

| ID | Status | Text (verbatim) | Source |
|---|---|---|---|
| B1 | 400 text | El alumno ya ha sido registrado. | `PersonaController.java:235` |
| B2 | 201 | Persona guardada con éxito. | `utils/Response.java:53` via `PersonaController.java:262,284` |
| B3 | 200 text | Persona eliminado con éxito. | `Response.java:65` via `PersonaController.java:319` |
| B4 | 403 text | No se puede eliminar alumno, ya realizó una evaluación. | `PersonaController.java:297` |
| B5 | 403 text | El alumno no se pudo eliminar, está presente en un turno. | `PersonaController.java:300` |
| B6 | 403 text | El instructor no se pudo eliminar, está presente en un turno. | `PersonaController.java:303` |
| B7 | 201 | Usuario guardada con éxito. | `Response.java:53` via `UsuarioController.java:107,134` |
| B8 | 201 | Grupo guardada con éxito. | `Response.java:53` via `GrupoController.java:209,240` |
| B9 | 200 text | Grupo eliminado con éxito. | `Response.java:65` via `GrupoController.java:265` |
| B10 | 400 | El nombre es obligatorio · El nombre debe tener entre 3 y 35 caracteres. · La descripción no puede superar los 255 caracteres. | `maniobra/dtos/NombreDescripcionDto.java:8-12` |
| B11 | 400 | La asignación de subfases es requerida · La subfase es requerida. · La asignación de estandares es requerida | `FaseSave.java:14`, `ManiobraSave.java:14`, `Maniobra_SubfaseSave.java:10`, `ManiobraDetail.java:10` |
| B12 | 410 | La maniobra no se pudo eliminar, está presente en un turno. | `ManiobraService.java:129` (contract keeps it for turno use only) |

New messages (persona and account validation, materias) are fixed in the contract, §1.3 and §6.

### 14.2 Decisions

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| M2-1 | **Personas: follow the backend for list, edit and delete; contract-first for creation.** *(changed: key `password`, explicit `idRol` instead of a rol derived from tipo, nullable tipo)* `POST /api/personas` also carries `usuario {username, correo, password, idRol}`. The backend validates, BCrypts the password and sets the rol in one transaction, and answers `201 {mensaje, persona, usuario {id, username, correo, rol}}` (contract §1.3). Client rules match the contract: codigo 6 alphanumerics, dni 8 digits, nombre and aPaterno required, `tipo` ∈ {Alumno, Instructor PDI, Instructor PDE, *sin tipo* = null}, username `^[a-z0-9._]{4,30}$`, correo, password ≥ 8 typed twice, rol per M2-13. Text fields are sent trimmed. In live mode the action waits for dependency 22 (M2-14). | Today's flow yields accounts that cannot log in. The key is `password` (not `contraseña`) because that is what `Usuario` already uses in `/auth/login` and `PUT /api/usuarios/{id}`. An explicit rol and a null tipo are needed because staff personas carry `tipo = NULL`: in the real seed the Jefe de Operaciones (333333) and the Administrador (000001), and in the mocks also the Comandante (222444, mock only; the real seed has no Comandante account). A derived rol could not create those accounts. | Adapter rework if Victor picks another shape. |
| M2-2 | **Persona edit follows the backend:** only `rango` and `tipo`, both always sent (`PUT` nulls whichever is missing). The other fields are shown read-only with text T1. It is a dialog in the detail. *(refined)* | `PUT /api/personas/{cod}` ignores the rest. | Wording. |
| M2-3 | **No separate "Usuarios" screen;** the account lives in `/personas/$cod`, read from `GET /api/personas/{cod}/usuario`. *(changed: response parsing)* The contract adds `usuario.id`, `estado` and `grupo` (dependency 26). Until then the adapter takes `usuario.id` from `GET /api/personas/{usuario.nombre}`, which carries no hash. **Asignar rol** calls `PUT /api/usuarios/{id}/rol {rol: {id}}` (`Manage Roles`, options from `GET /api/roles`, M2-13). **Restablecer contraseña** calls `PUT /api/usuarios/{id} {username, password}`, always both. No GET under `/api/usuarios/**` is ever called. **Every `/api/usuarios` mutation adapter** (Asignar rol, Restablecer contraseña, and M0's Cambiar contraseña, which today types the response without parsing it, `cambiar-contrasena-page.tsx:40`) parses the 201 body with a zod schema that keeps only `{mensaje}`. The `usuario.password` the backend echoes (the hash, or the plaintext password of an account created today) therefore never reaches app state or logs. A unit test feeds a fixture that includes `password`. | `DetalleUsuario` has no usuario id; the `/api/usuarios` GETs and both PUT bodies expose the password until dependency 24. | One extra GET until dependency 26. |
| M2-4 | **Delete persona shows the backend's reasons** (B4–B6). `normalizarError` learns that a **403 with a text body** is a business rule (`Response.isForbidden`) and shows its text, while a 403 `ErrorResponse` or an empty body keeps "No tiene permisos para esta acción". | Backend rules; today every 403 is masked. | None. |
| M2-5 | **Grupos:** list; create with optional alumnos (`personas: [{codigo}]`); edit sending every current member and every newly picked alumno as `{codigo, checked}`; delete. Available alumnos = `GET /api/personas/alumno/Alumno` plus the grupo's members. `programa` is read-only on edit (text T2). A 200 with an empty body (the missing `return`; `http.ts` reads it as `null`) is treated as not found. `Manage Groups` keeps the backend's two roles; dependency 4 stays open but no longer blocks. *(refined)* | Backend shape (`PUT` ignores `programa`). | None. |
| M2-6 | **Fases y subfases:** list; detail with each subfase's maniobras (`GET /api/subfases/{id}`); create and edit with a subfase field array (`id > 0` updates, `0` creates). **A saved subfase cannot be removed** (text T3; only unsaved rows can), and **Eliminar fase is offered only for a fase without subfases** (T4), and in live mode only after dependency 37 (M2-14). No "Subfases sin fase" panel: nothing in the backend detaches a subfase from its fase and fase delete cascades, so the state is unreachable; `GET /api/subfases/assign` is not used. The edit form shows T7 under every descripción of a saved item. Success toasts T14–T16. No standalone subfase CRUD. *(changed: panel dropped, fixed texts)* | The backend deletes omitted subfases unchecked, and fase delete wipes unrelated subfases (dependency 37), with no FK to catch it. | The Comandante cannot drop a subfase until dependency 37. |
| M2-7 | **Maniobras:** list, detail, create and edit with a subfase multi-select grouped by fase (`GET /api/fases` + `GET /api/fases/{id}`), delete. **Contract-first for the detail** (`subfases [{id, nombre}]`, dependency 33) **and for update** (`PUT` 500s on any subfase with two or more maniobras, dependency 32). The detail shows each subfase with its fase, taken from that fases catalog, which the screen already loads (dependency 33 stays `{id, nombre}`). Without `subfases` in the response (live, dependency 33 pending) the detail shows T12 instead of deducing them. Modificar maniobra waits for dependencies 32 and 33 in live mode (M2-14). Eliminar is disabled while the maniobra has estándares (T5); any other 410 is shown verbatim. The form shows T7 on edit. Success toasts T17–T19. *(changed: fase from the catalog, no deduction fallback, fixed texts)* | Detail lacks subfases; update is broken. Deducing subfases would cost 1 + F + S requests. | Adapter rework. |
| M2-8 | **Estándares per maniobra** (`Manage Standards`: Jefe de Operaciones, Administrador Web): a page edits the full list with `PUT /api/maniobras/{id}/estandar` (`id > 0` updates, `0` creates, at least one). Removal is not offered (T6): an omitted estándar stays linked and reappears (dependency 36). The form shows T7 on saved rows; success toast T20. *(refined)* | Backend shape. | Feature gap until dependency 36. |
| M2-9 | **Materias** contract-first per `contrato-api-teoria.md` §1, with the exact messages and statuses in `contrato-api-matricula.md` §6. `permisos.ts` gains contract permissions, kept apart and recorded in `docs/decisiones.md`: `Manage Subjects` (Comandante de Escuadrón, Administrador Web), `Manage Questions` and `Manage Exams` (Instructor, Administrador Web), `Take Exams` (Alumno). | Spec §6/§11. | None until the backend implements it. |
| M2-10 | **The session is built from `GET /api/personas/{username}` alone**, replacing §5.1 step 2. Its `DetalleSesion` gives `usuario {id, nombre → username, correo, rol}`, `codigo → codPersona`, and the persona (`nombre`, `aPaterno`, `aMaterno`, `idGrupo`); it has no password. Header and Inicio show "Nombre ApellidoPaterno". 401/403/404 are handled as today (invalid account). **`usuario.rol: null` is an invalid account too.** On login and on restore the session clears both tokens and opens the login page with text T13, instead of letting the parser throw. Today `sesion.ts:23` requires `rol`, so the `ZodError` leaves the tokens in place on restore. Dependency 11 is no longer needed; dependency 25 limits the endpoint to the caller's own username. *(changed: rol null)* | It holds everything the session needs and stops the frontend from downloading the hash. | An account without persona cannot enter (none exists: every usuario is created with its persona). |
| M2-11 | **Backend dependencies 22–38** (§14.5). `GET /api/personas/{nom}` leaks personal data, not the hash; the hash leaks through the `/api/usuarios` GETs and the `PUT /api/usuarios/{id}[/rol]` bodies. | Findings. | None. |
| M2-12 | **Programa screens are readable by all staff** (`Read` plus the staff roles, like the M1 lists); writes are gated per action with `<Can>`: `Manage Phases`, `Manage Maneuvers`, `Manage Standards`, `Manage Subjects`. This replaces §6's per-screen `Manage …` permissions. | The backend GETs are `Read`. The Jefe de Operaciones must reach a maniobra to assign estándares without `Manage Maneuvers`, and the registry holds one permission per route. | None; staff see the programa read-only. |
| M2-13 | **Tipo–rol compatibility**, applied when creating, editing and assigning a rol: Alumno → {Alumno}; Instructor PDI or PDE → {Instructor, Jefe de Operaciones, Comandante de Escuadrón}; *sin tipo* → {Jefe de Operaciones, Comandante de Escuadrón, Administrador Web}. The default rol is Alumno or Instructor by tipo, and there is none for *sin tipo*. A persona without account, or with `rol: null`, accepts any tipo. The frontend keys the table by `rol.nombre`, like `permisos.ts`. **The backend (dependencies 23 and 28) keys it by rol id** (1 Alumno, 2 Administrador Web, 3 Jefe de Operaciones, 4 Instructor, 5 Comandante de Escuadrón), so the seed mojibake (dependency 19) cannot break the check. *(changed: backend keyed by id)* | `tipo` feeds the pickers (`/personas/alumno/Alumno` for grupos, `/personas/instructor/{tipo}` for turnos), so a mismatched account is offered in the wrong place. | Table change. Against the real seed, the frontend cannot match Comandante by name until dependency 19. |
| M2-14 | **Actions with a pending dependency.** *(new)* A small capability module (`src/lib/dependencias.ts`) reads `VITE_DEPENDENCIAS_RESUELTAS`: comma-separated dependency numbers (`22,30,32,33,37`), with spaces allowed and any token that is not a positive integer ignored; the default is empty. In mock mode (`config.mockApi`) every dependency counts as resolved. These actions need their dependencies resolved: **Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 and 33), Eliminar fase (37)**. Until then the action is shown disabled with text T11 beneath it, and opening its route by URL shows T11 instead of the form. `.env.example` lists the variable, empty. | `.env.example` defaults `VITE_MOCK_API=false`, so a plain `pnpm dev` hits the live backend. There these actions ignore the account data (22), leave an account without persona or rol (30), take over another maniobra's links (32), or wipe subfases system-wide even for an empty fase (37). | One env var to maintain; Victor adds a number when he ships the fix. |
| M2-15 | **Nothing destructive on one's own account.** *(new)* When the persona in `/personas/$cod` is the session's own `codPersona`, Eliminar persona, Asignar rol and Restablecer contraseña are not offered, and the account section shows T10. Cambiar contraseña (M0) remains the way to change one's own password. | The only Administrador Web could delete himself or drop his own `Manage Users`/`Manage Roles` and lock everyone out. Once dependency 3 lands, an own-account reset also needs the current password, which Restablecer does not ask for. | None. |

### 14.3 Screens

This replaces the §6 M2 table. Staff = Administrador Web, Comandante de Escuadrón, Jefe de Operaciones and Instructor. Small forms are dialogs (Modificar persona, Asignar rol, Restablecer contraseña, Registrar/Modificar materia); deletes use the confirm dialog.

| Screen | Route | Permission | Roles | Data | Breadcrumb parent |
|---|---|---|---|---|---|
| Personas | `/personas` | `Manage Users` | Administrador Web | Real (+ `tipo`, dep. 27) | — |
| Registrar persona | `/personas/nueva` | `Manage Users` | Administrador Web | Contract (§1.3); live needs dep. 22 | `/personas` |
| Detalle de persona y cuenta | `/personas/$cod` | `Manage Users` (Asignar rol: `Manage Roles`) | Administrador Web | Real + Contract (dep. 26) | `/personas` |
| Grupos | `/grupos` | `Manage Groups` | Administrador Web, Jefe de Operaciones | Real | — |
| Registrar grupo | `/grupos/nuevo` | `Manage Groups` | same | Real | `/grupos` |
| Detalle de grupo | `/grupos/$id` | `Manage Groups` | same | Real | `/grupos` |
| Modificar grupo | `/grupos/$id/editar` | `Manage Groups` | same | Real | `/grupos/$id` |
| Fases y subfases | `/programa/fases` | `Read` + staff | staff | Real | — |
| Registrar fase | `/programa/fases/nueva` | `Manage Phases` | Administrador Web, Comandante | Real | `/programa/fases` |
| Detalle de fase | `/programa/fases/$id` | `Read` + staff | staff | Real | `/programa/fases` |
| Modificar fase | `/programa/fases/$id/editar` | `Manage Phases` | Administrador Web, Comandante | Real | `/programa/fases/$id` |
| Maniobras | `/programa/maniobras` | `Read` + staff | staff | Real | — |
| Registrar maniobra | `/programa/maniobras/nueva` | `Manage Maneuvers` | Administrador Web, Comandante | Real (dep. 34) | `/programa/maniobras` |
| Detalle de maniobra | `/programa/maniobras/$id` | `Read` + staff | staff | Contract (dep. 33) | `/programa/maniobras` |
| Modificar maniobra | `/programa/maniobras/$id/editar` | `Manage Maneuvers` | Administrador Web, Comandante | Contract; live needs deps. 32, 33 | `/programa/maniobras/$id` |
| Estándares de la maniobra | `/programa/maniobras/$id/estandares` | `Manage Standards` | Administrador Web, Jefe de Operaciones | Real | `/programa/maniobras/$id` |
| Materias | `/programa/materias` | `Read` + staff (writes: `Manage Subjects`) | staff | Contract (dep. 5) | — |

Sidebar: **Matrícula** = Personas, Grupos; **Programa** = Fases y subfases, Maniobras, Materias (groups already declared in `GrupoMenu`). `/usuarios` is dropped (M2-3).

Who sees what (`Role.java:8-37`, mirrored by `permisos.ts`; `Manage Subjects` from the contract):

| Permission | Administrador Web | Comandante de Escuadrón | Jefe de Operaciones | Instructor | Alumno |
|---|---|---|---|---|---|
| `Manage Users` · `Manage Roles` | ✓ | | | | |
| `Manage Groups` | ✓ | | ✓ | | |
| `Manage Phases` · `Manage Maneuvers` | ✓ | ✓ | | | |
| `Manage Standards` | ✓ | | ✓ | | |
| `Manage Subjects` (contract) | ✓ | ✓ | | | |
| Programa read-only (`Read` + staff) | ✓ | ✓ | ✓ | ✓ | |

`Manage Subphases` (Administrador Web, Comandante) gates nothing in M2.

**Fixed interface texts** (the CAs cite these IDs). Persona, grupo, usuario and materia saves toast the backend's `mensaje`. Fase, maniobra and estándar saves return 200/204 without one, so the frontend owns those toasts (T14–T20).

| ID | Where | Text |
|---|---|---|
| T1 | Modificar persona, under the read-only fields | El código, el DNI y los nombres no se pueden modificar; solo el rango y el tipo. |
| T2 | Modificar grupo, under Programa | El programa de un grupo no se puede cambiar después de registrarlo. |
| T3 | Modificar fase, on a saved subfase row | Una subfase guardada no se puede quitar porque puede tener maniobras, turnos o evaluaciones. |
| T4 | Detalle de fase, instead of Eliminar, when it has subfases | Solo se puede eliminar una fase sin subfases. |
| T5 | Detalle de maniobra, next to the disabled Eliminar | La maniobra tiene estándares asignados y no se puede eliminar. |
| T6 | Estándares, on a saved row | Un estándar guardado no se puede quitar; puede cambiar su nombre y su descripción. |
| T7 | Under the descripción of a saved fase, subfase, maniobra or estándar | Si deja la descripción vacía, se conserva la anterior. |
| T8 | Account section, rol null | Sin rol: esta cuenta no puede iniciar sesión. |
| T9 | Account section, no account | Sin cuenta |
| T10 | Account section, own account | Es su propia cuenta: no puede eliminarla ni cambiar su rol; para cambiar su contraseña use Cambiar contraseña. |
| T11 | Under an action waiting for a dependency (M2-14), or instead of its form | No disponible: el servidor aún no realiza esta acción de forma segura. |
| T12 | Detalle de maniobra, subfases missing from the response | Subfases no disponibles: el servidor aún no las informa. |
| T13 | Login page, session with `rol: null` | Su cuenta no tiene un rol asignado. Comuníquese con el administrador. |
| T14 · T15 · T16 | Toasts: registrar · modificar · eliminar fase | Fase registrada. · Fase modificada. · Fase eliminada. |
| T17 · T18 · T19 | Toasts: registrar · modificar · eliminar maniobra | Maniobra registrada. · Maniobra modificada. · Maniobra eliminada. |
| T20 | Toast: guardar estándares | Estándares guardados. |

### 14.4 Acceptance criteria

CA-FAS-07 ("Subfases sin fase") was dropped (review F1); no other ID changed. The mock fixtures these criteria need beyond the seed (a persona without account, an account with `rol: null`, a materia with preguntas) are fixed in contract §7.

#### CUS Gestionar Persona (M2, Administrador Web)

- **CA-PER-01** La lista muestra código, apellidos y nombres, rango y tipo ("—" si no tiene); se ordena por código o apellido paterno; la página y el orden persisten en la URL.
- **CA-PER-02** Registrar persona pide código (6 caracteres alfanuméricos), DNI (8 dígitos), nombre y apellido paterno obligatorios, apellido materno y rango opcionales, y tipo (Alumno, Instructor PDI, Instructor PDE o sin tipo); y para la cuenta: usuario (4 a 30 caracteres entre minúsculas, dígitos, punto y guion bajo), correo válido, contraseña de al menos 8 caracteres escrita dos veces e igual, y rol.
- **CA-PER-03** El rol se propone según el tipo (Alumno → Alumno; Instructor PDI o PDE → Instructor) y solo se ofrecen los roles compatibles con el tipo (M2-13); cambiar el tipo descarta un rol incompatible.
- **CA-PER-04** Un código ya registrado muestra el mensaje B1; un usuario en uso y los demás errores de validación del backend aparecen bajo su campo, incluidos los de la cuenta.
- **CA-PER-05** Al registrar se muestra el mensaje B2 y se abre el detalle de la persona; el formulario se limpia, y ni la respuesta ni el detalle muestran la contraseña.
- **CA-PER-06** El detalle muestra código, DNI, nombres, rango, tipo, estado y grupo, y la sección Cuenta con usuario, correo y rol; una cuenta con rol null muestra T8; una persona sin cuenta muestra T9 y no ofrece acciones de cuenta.
- **CA-PER-07** Modificar persona cambia solo rango y tipo; se ofrecen los tipos compatibles con el rol de la cuenta, o todos si no tiene cuenta o su rol es null; los demás datos no se editan y se muestra T1; al guardar se muestra el mensaje B2.
- **CA-PER-08** Asignar rol (Manage Roles) ofrece los roles del backend compatibles con el tipo; al guardar se muestra el mensaje B7 y el detalle refleja el nuevo rol.
- **CA-PER-09** Restablecer contraseña pide la nueva dos veces e iguales, de al menos 8 caracteres, conserva el usuario y muestra el mensaje B7.
- **CA-PER-10** Eliminar pide confirmación; si el backend lo impide (B4, B5 o B6) se muestra ese motivo y la persona sigue en la lista; si no, se muestra B3 y se vuelve a la lista.
- **CA-PER-11** Personas solo aparece en el menú y por URL con Manage Users; Asignar rol además exige Manage Roles.
- **CA-PER-12** En el detalle de la propia persona de la sesión no se ofrecen Eliminar, Asignar rol ni Restablecer contraseña, y la sección Cuenta muestra T10.
- **CA-PER-13** Las respuestas de Asignar rol, Restablecer contraseña y Cambiar contraseña se leen solo por su `mensaje`: la contraseña que el backend devuelve no llega al estado de la aplicación ni a la consola.

#### CUS Gestionar Grupo (M2, Administrador Web · Jefe de Operaciones)

- **CA-GRU-01** La lista muestra nombre, descripción y programa; se ordena por nombre o programa; la página y el orden persisten en la URL; solo la ven quienes tienen Manage Groups.
- **CA-GRU-02** Registrar pide nombre (3 a 35 caracteres), descripción opcional (máximo 255), programa (PDI o PDE) y, opcionalmente, alumnos; al guardar muestra el mensaje B8 y abre el detalle.
- **CA-GRU-03** Los alumnos ofrecidos son los que no tienen grupo; al modificar, también los del propio grupo, ya marcados; ningún alumno aparece dos veces.
- **CA-GRU-04** Al modificar, el programa es de solo lectura y se muestra T2.
- **CA-GRU-05** Desmarcar un alumno y guardar lo deja sin grupo, y vuelve a ofrecerse para otros grupos.
- **CA-GRU-06** El detalle muestra nombre, descripción, programa y alumnos con código, nombre completo y estado.
- **CA-GRU-07** Eliminar pide confirmación advirtiendo que sus alumnos quedarán sin grupo; al eliminar muestra el mensaje B9 y vuelve a la lista.
- **CA-GRU-08** Un grupo inexistente muestra la página no encontrada, también cuando el backend responde 200 sin cuerpo.

#### CUS Gestionar Fase (M2, Comandante de Escuadrón)

- **CA-FAS-01** La lista muestra nombre y descripción; se ordena por nombre; la página y el orden persisten en la URL; la ve todo el personal y solo con Manage Phases se ofrece registrar, modificar y eliminar.
- **CA-FAS-02** Registrar pide nombre (3 a 35 caracteres), descripción opcional (máximo 255) y al menos una subfase con los mismos límites; al guardar muestra T14 y abre el detalle.
- **CA-FAS-03** El detalle muestra la fase, sus subfases y las maniobras de cada subfase.
- **CA-FAS-04** Modificar edita la fase y sus subfases y agrega subfases nuevas; una subfase ya guardada no se puede quitar y muestra T3; una fila nueva sin guardar sí se quita; bajo cada descripción ya guardada se muestra T7; al guardar muestra T15.
- **CA-FAS-05** Eliminar solo se ofrece para una fase sin subfases (si tiene, se muestra T4) y pide confirmación; al eliminar muestra T16 y vuelve a la lista.
- **CA-FAS-06** Los errores de validación del backend (B10, B11) aparecen bajo su campo, también en cada fila de subfase.

#### CUS Gestionar Maniobra (M2, Comandante de Escuadrón)

- **CA-MAN-01** La lista muestra nombre y descripción; se ordena por nombre; la página y el orden persisten en la URL; la ve todo el personal y solo con Manage Maneuvers se ofrece registrar, modificar y eliminar.
- **CA-MAN-02** Registrar pide nombre (3 a 35 caracteres), descripción opcional (máximo 255) y al menos una subfase, elegidas de una lista agrupada por fase; al guardar muestra T17 y abre el detalle.
- **CA-MAN-03** El detalle muestra la maniobra, sus estándares y sus subfases con la fase a la que pertenecen (tomada del catálogo de fases); si la respuesta no trae subfases se muestra T12.
- **CA-MAN-04** Modificar precarga las subfases actuales, aplica las mismas validaciones que registrar y muestra T7 bajo la descripción; al guardar muestra T18.
- **CA-MAN-05** Eliminar pide confirmación; si la maniobra tiene estándares la acción está deshabilitada y se muestra T5; si el backend la rechaza (B12) se muestra su mensaje; al eliminar muestra T19 y vuelve a la lista.
- **CA-MAN-06** Los errores de validación del backend (B10, B11) aparecen bajo su campo; los de subfase, bajo el selector de subfases.

#### CUS Asignar Estándares (M2, Jefe de Operaciones)

- **CA-EST-01** Con Manage Standards, el detalle de la maniobra ofrece editar sus estándares; sin ese permiso (Comandante) los estándares solo se ven, y quien solo tiene Manage Standards (Jefe de Operaciones) no ve registrar, modificar ni eliminar maniobra.
- **CA-EST-02** Cada estándar tiene nombre (3 a 35 caracteres) y descripción opcional (máximo 255); se agregan filas nuevas y se exige al menos un estándar.
- **CA-EST-03** Un estándar guardado no se puede quitar y muestra T6, además de T7 bajo su descripción; una fila nueva sin guardar sí se quita.
- **CA-EST-04** Al guardar se muestra T20 y se vuelve al detalle con los estándares actualizados; el error de lista vacía (B11) aparece sobre la lista y los errores de cada estándar (B10), bajo el campo de su fila.

#### CUS Gestionar Materia (M2, Comandante de Escuadrón · contrato)

- **CA-MAT-01** La lista muestra nombre, nota mínima, coeficiente con 2 decimales y parte del curso; la ve todo el personal y solo con Manage Subjects se ofrece registrar, modificar y eliminar.
- **CA-MAT-02** Registrar y modificar piden nombre (3 a 60 caracteres), nota mínima entera de 0 a 20, coeficiente entre 0 y 1 con hasta 2 decimales y parte del curso, todos obligatorios.
- **CA-MAT-03** Un nombre repetido y los demás errores del backend aparecen bajo su campo; al guardar se muestra el mensaje del backend.
- **CA-MAT-04** Eliminar pide confirmación; si la materia tiene preguntas o turnos teóricos se muestra el motivo que da el backend.

#### Acciones con dependencia pendiente (M2-14)

- **CA-DEP-01** Sin su dependencia resuelta, Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33) y Eliminar fase (37) se muestran deshabilitadas con T11; abrir la ruta de Registrar persona o de Modificar maniobra por URL muestra T11 en lugar del formulario.
- **CA-DEP-02** En modo mock las cuatro acciones están disponibles; fuera de él, cada una se habilita cuando `VITE_DEPENDENCIAS_RESUELTAS` incluye todos sus números, y los valores que no son números se ignoran.

#### CUS Iniciar sesión (M2 additions)

- **CA-SES-06** Tras iniciar sesión o recargar, el encabezado y el saludo de Inicio muestran el nombre y el apellido paterno de la persona.
- **CA-SES-07** Para armar la sesión no se consulta ningún endpoint que devuelva la contraseña del usuario.
- **CA-SES-08** Si la persona de la sesión tiene la cuenta sin rol, al iniciar sesión o al recargar se borran los tokens y la página de inicio de sesión muestra T13.

### 14.5 Backend dependencies added

**Live blockers** (M2 must not run these actions against the live backend before the fix; M2-14 gates them): 22, 30, 32, 37 (and 33 for Modificar maniobra).

| # | Change | Needed by |
|---|---|---|
| 22 | **Security:** `POST /api/personas` stores the generated password in plaintext and no rol, so the account never logs in; take `usuario {username, correo, password, idRol}`, BCrypt it and save persona and usuario in one transaction | M2 live — blocks Registrar persona |
| 23 | Validate `POST /api/personas` (persona fields, tipo, unique username, correo, password ≥ 8, rol exists and matches tipo per M2-13, keyed by rol id); 400 field array | M2 |
| 24 | **Security:** stop serializing `Usuario.contraseña` (`GET /api/usuarios/{id}`, `/nombre/{nombre}`, `/persona/{cod}` and the 201 bodies of `PUT /api/usuarios/{id}[/rol]`); guard the GETs (own account or `Manage Users`). Widens 2 | M2 — security |
| 25 | **Security:** `GET /api/personas/{nom}` has no `@PreAuthorize`; allow only the caller's own username or `Manage Users`. The session uses it from M2 (M2-10); supersedes 11 | M2 — security |
| 26 | `DetalleUsuario`: add `usuario.id`, `estado`, `grupo {id, nombre}`; `usuario: null` instead of a 500 NPE for a persona without account (the frontend tolerates its absence with one extra GET) | M2 |
| 27 | `IndexPersona`: add `tipo` | M2 |
| 28 | Tipo–rol compatibility, keyed by rol id, on `PUT /api/personas/{cod}` and `PUT /api/usuarios/{id}/rol`; 404 for an unknown rol id (today a 500 FK error) | M2 |
| 29 | `PUT /api/usuarios/{id}`: validate `username`, `password` and, per dependency 3, `passwordActual` as field errors (a missing password is today "rawPassword cannot be null"; a missing username blanks the account) | M0 / M2 |
| 30 | `DELETE /api/personas/{cod}`: 500 NPE without usuario; 500 FK error when the usuario has a refresh token, after already detaching it from persona and rol (not transactional) | M2 live — blocks Eliminar persona |
| 31 | Grupos: validate nombre, descripción and programa (invalid programa saved as null); unknown `codigo` → 404 instead of a 500 NPE after the grupo is saved; one transaction | M2 |
| 32 | `PUT /api/maniobras/{id}`: links looked up by `idSubfase` alone (500 whenever a subfase has two or more maniobras, or another maniobra's link is taken); replace this maniobra's links; not-found message says "fase" | M2 live — blocks Modificar maniobra |
| 33 | `GET /api/maniobras/{id}`: add `subfases [{id, nombre}]` ordered by id | M2 live — Modificar maniobra preloads them |
| 34 | Unknown `idSubfase` stored silently: validate it (404) and fix the link-table FK that targets `maniobras_subfases` | M2 |
| 35 | `DELETE /api/maniobras/{id}`: two guards with their own messages (estándares; use in turnos or calificaciones, today a 500 FK error) | M2 |
| 36 | Allow removing an estándar (orphan removal on `Maniobra.estandares`); an omitted one reappears today | M2 nice-to-have |
| 37 | **Data loss:** fase delete deletes every subfase without maniobras system-wide, even for a nonexistent or empty fase; `PUT /api/fases/{id}` deletes omitted subfases unchecked, so a Modificar fase saved from a stale form deletes a subfase another user added meanwhile; turnos, evaluaciones and links have no FK to `subfases`. Scope the cleanup, guard both with 410, add the FKs | M2 live — blocks Eliminar fase |
| 38 | Minor: blank or null `descripcion` never clears (fase, subfase, maniobra, estándar); `StringToProgramaConverter` turns any programa into PDI; no unique constraint on `usuarios.nombre` (a duplicate breaks login for both); nested lists (`DetalleFase.subfases`, `DetalleSubfase.maniobrasSubfase`, `DetalleManiobra.estandares`) have no `@OrderBy("id")` | M2 |

Dependency 3 is amended (§10). Dependency 4 stays open but no longer blocks M2 (M2-5). Dependency 5 is the Materias backend (contract §6). Dependency 11 is superseded by M2-10 and 25; dependency 2 is widened by 24.
