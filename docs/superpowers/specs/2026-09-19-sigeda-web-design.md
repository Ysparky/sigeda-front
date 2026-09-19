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
| Personas | `/personas` | `Manage Users` | Real |
| Usuarios y roles | `/usuarios` | `Manage Roles` | Real |
| Grupos | `/grupos` | `Manage Groups` | Real |
| Fases y subfases | `/programa/fases` | `Manage Phases` | Real |
| Maniobras + estándares | `/programa/maniobras` | `Manage Maneuvers` · `Manage Standards` | Real |
| Materias | `/programa/materias` | `Manage Subjects` | Contract |

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
| 2 | Stop serializing the password hash in `/api/usuarios/nombre/{nombre}` | back | M0 — security |
| 3 | `PUT /api/usuarios/{id}` accepts any id from any user with `Update` and does not ask for the current password: restrict to the user themself or Administrador, require the current password | back | M0 — security |
| 4 | `Manage Groups` for Administrador only | back | M2 |
| 5 | Materia catalog + CRUD + `Manage Subjects` (Comandante) | back | M2 |
| 6 | Theory API (§11) + `Manage Questions`, `Manage Exams` (Instructor), `Take Exams` (Alumno) | back | M4 |
| 7 | `GET /api/personas/{cod}/estado-teorico` | back | M4; feeds the M1 subsanación block |
| 8 | NIT / NIA / NFPI and orden de mérito | back | M5 |
| 9 | Accept `sigeda-back`'s JWT (shared secret) so documents are per user; prediction over real evaluaciones | chat_status | M3 / M5 |
| 10 | Evaluation list across alumnos with the same filters | back | M1 nice-to-have |
| 11 | Include persona (nombre, apellidos, tipo, idGrupo) in `/api/usuarios/nombre/{nombre}` | back | M1 — header and "mine" screens |

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
| M2 Matrícula + Programa | P1 + P2 | 4, 5 |
| M3 Aprendizaje | P7 | — (9 recommended) |
| M4 Teoría + Banco | P5, contract-first | 6, 7 to go real |
| M5 Seguimiento | P6 | 7, 8 |

Each milestone has its own implementation plan in `docs/superpowers/plans/`.
