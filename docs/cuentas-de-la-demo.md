# Las cuentas de la demostración

**Comprobado contra el sistema real el 1 oct 2026** — PostgreSQL `sigeda_demo`, no mocks. Los
permisos de abajo salen de las DOS fuentes y coinciden exactamente: `Role.java` en el backend y
`src/lib/auth/permisos.ts` en el frontend.

Para levantar el entorno, ver `demo-runbook.md`. Para qué hacer con cada cuenta, `casos-de-uso-demo.md`.

## 1. Cómo entrar

**Todas las cuentas usan la contraseña `123`.** El usuario es el campo `nombre` de la tabla
`usuarios`, no el correo.

La ruta es **`POST /auth/login`**, sin el prefijo `/api`:

```sh
curl -s http://localhost:8080/auth/login -H 'Content-Type: application/json' \
     -d '{"username":"admin.sistema","password":"123"}'
```

Devuelve `token` y `refreshToken`. El mismo usuario puede entrar tantas veces como quiera —eso
estuvo roto y se arregló con un `flush()`, ver `casos-de-uso-demo.md` §12—.

## 2. Las once cuentas

| Usuario | Código | Rol | Grupo | Para qué sirve en la demo |
|---|---|---|---|---|
| `admin.sistema` | 000001 | Administrador Web | — | lo ve todo; la única cuenta con matrícula y roles |
| `comandante.aguirre` | 222444 | Comandante de Escuadrón | — | materias, programa, seguimiento, **orden de mérito** |
| `jefe.operaciones` | 333333 | Jefe de Operaciones | — | **registrar turnos prácticos** y estándares |
| `instructor.perez` | 444444 | Instructor | — | banco de preguntas, turnos teóricos, **evaluar sus turnos** |
| `instructor.mendoza` | 888888 | Instructor | — | lo mismo, sobre los turnos 5, 6 y 7 |
| `alumno.lopez` | 111111 | Alumno | 1 | **tiene el examen abierto hoy** |
| `alumno.falconi` | 222222 | Alumno | 2 | alumno sin nada: sirve para ver los índices en `null` |
| `alumno.garcia` | 555555 | Alumno | 3 | **el alumno "dato de oro"**: 17 evaluaciones, NFPI, puesto 3 y debe un chequeo |
| `alumno.torres` | 666666 | Alumno | 3 | **el alumno con problemas**: bloqueado por subsanación |
| `alumno.ramirez` | 777777 | Alumno | 4 | un turno sin evaluar, de `instructor.mendoza` |
| `alumno.castro` | 999999 | Alumno | 6 | dos turnos sin evaluar y dos exámenes entregados |

Los nombres de persona **no coinciden con el usuario**, y conviene saberlo antes de buscar a alguien
en una lista: `instructor.perez` es **Juan Torres**, `alumno.garcia` es **Pedro Rodriguez**,
`alumno.castro` es **Luis Diaz**, `jefe.operaciones` es **Carlos Vargas**.

**Los seis grupos son del programa PDI**, y el **Grupo 5 está vacío**: no tiene ningún alumno, así
que el catálogo de grupos del turno teórico no lo ofrece (sólo lista grupos con alumnos,
precisamente para no dejar elegir uno que la validación va a rechazar).

## 3. Qué puede hacer cada rol

| Permiso | Admin | Comandante | Jefe de Ops | Instructor | Alumno |
|---|:--:|:--:|:--:|:--:|:--:|
| `Read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Write` | ✅ | ✅ | ✅ | ✅ | |
| `Update` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Delete` | ✅ | | | | |
| `View My Group` | ✅ | ✅ | ✅ | ✅ | |
| `View All Groups` | ✅ | ✅ | | | |
| `View Disapproved` | ✅ | ✅ | | ✅ | |
| `Create Reports` | ✅ | ✅ | | ✅ | |
| `Modify Evaluations` | ✅ | ✅ | | | |
| `Manage Shifts` | ✅ | | ✅ | | |
| `Manage Standards` | ✅ | | ✅ | | |
| `Manage Phases` · `Manage Subphases` · `Manage Maneuvers` | ✅ | ✅ | | | |
| `Manage Subjects` | ✅ | ✅ | | | |
| `Manage Questions` · `Manage Exams` | ✅ | | | ✅ | |
| `Manage Users` · `Manage Roles` | ✅ | | | | |
| `Manage Groups` | ✅ | | | | |
| `Take Exams` | | | | | ✅ |

**Cuatro cosas de esta tabla que no son obvias:**

- **`Manage Groups` es sólo del Administrador Web.** El contrato lo daba también al Jefe de
  Operaciones y la dependencia 4 lo revirtió: gestionar grupos es matrícula, no operaciones de
  vuelo. No rompe el formulario de turno práctico, que trae los alumnos por `Manage Shifts`.
- **El Alumno no tiene `Write`**, así que no puede crear nada — pero sí `Update`, que es lo que le
  deja cambiar su propia cuenta. Esa combinación fue un agujero: `PUT /api/usuarios/{id}` estaba
  guardado sólo por `Update`, sin comprobar propiedad, así que cualquier alumno podía tomar
  cualquier cuenta. Hoy el guardado es **de propiedad y no de permiso** —`hasRole('Manage Users') or
  esCuentaPropia(#id)`—, y además **cambiar la contraseña propia exige `passwordActual`** aunque
  quien la cambie sea el Administrador: si no, un token robado le cerraría la puerta al dueño.
  Restablecer la de OTRO no la pide, porque quien restablece es justamente quien no la sabe.
- **`Approve Evaluations` existe en el catálogo y no lo tiene nadie.** Es un permiso declarado sin
  rol asignado.
- **Sólo el Administrador tiene `Delete`.** El resto no borra nada, ni sus propios registros.

## 4. Qué ve cada uno en el menú

| Grupo del menú | Lo ve | Pantallas |
|---|---|---|
| **General** | todos | Inicio, Guía, Mi cuenta |
| **Operaciones de vuelo** | todos menos el Alumno | Turnos, Orden de vuelo |
| | **sólo el Alumno** | Mis turnos |
| **Evaluaciones** | todos menos el Alumno | Evaluaciones |
| | **sólo el Alumno** | Mis evaluaciones |
| **Matrícula** | sólo Admin | Personas, Grupos |
| **Programa** | todos menos el Alumno | Fases, Maniobras, Materias |
| **Teoría** | Admin e Instructor | Banco de preguntas, Turnos teóricos |
| | **sólo el Alumno** | Mis exámenes |
| **Seguimiento** | según permiso | Escuadrón (`View My Group`), Alertas (`View Disapproved`), Reportes (`Create Reports`) |
| | **sólo el Alumno** | Mi legajo |
| **Aprendizaje** | **los cinco roles** | Documentos, Cuestionario de práctica, Consultas |

Las pantallas «mis…» están restringidas **por rol y no sólo por permiso**: un Comandante no entra a
`/mis-turnos` aunque tenga `Read`, porque no es alumno y no tendría qué mostrar. Al revés, el
Aprendizaje pide sólo `Read`, que tienen los cinco roles.

## 5. Qué tiene cada alumno en la semilla

Esto es lo que decide a quién abrirle el legajo para que la pantalla tenga algo que decir:

| | `111111` Oscar | `222222` Juan | `555555` Pedro | `666666` Ana | `777777` Carlos | `999999` Luis |
|---|---|---|---|---|---|---|
| Grupo | 1 | 2 | 3 | 3 | 4 | 6 |
| Turnos prácticos | 1 | 1 | **13** | 1 | 1 | 2 |
| Evaluaciones | 0 | 0 | **17** | 0 | 0 | 0 |
| Exámenes entregados | 0 | 0 | 3 | 3 | 0 | 2 |
| `NCT` · `NEI` | — | — | 18.00 · 20.00 | 12.00 · 12.00 | — | — |
| **`NIT`** | `null` | `null` | **18.40** | **12.00** | `null` | `null` |
| **`NIA`** | `null` | `null` | **15.83** | `null` | `null` | `null` |
| **`NFPI`** | `null` | `null` | **16.34** | `null` | `null` | `null` |
| Bloqueado por subsanación | no | no | no | **sí** | no | no |

**`555555` y `666666` son la historia, y son opuestos a propósito** — están en el mismo grupo 3 para
que se comparen en la misma pantalla. `555555` tiene las doce sub fases calificadas y la teoría
aprobada, que es lo que vuelve el NFPI un número y lo pone en el orden de mérito (**puesto 3**, detrás
de `222222` y `777777`, que también completaron el programa); figura en el ranking y a la vez debe un
chequeo. `666666` desaprobó
tres exámenes de Adoctrinamiento de Vuelo (12.00 contra un mínimo de 18) y queda bloqueada con el
motivo *«Desaprobó Mensual Adoctrinamiento de Vuelo (12.00 / mínimo 18). Subsanación pendiente.»*

**`alumno.lopez` es con quien se rinde un examen.** Es el único con un turno teórico abierto: el
turno **3**, `Semanal Adoctrinamiento de Vuelo`, ventana **00:00–23:59 del día en curso**, 5
preguntas, nota mínima 18. Si la demo se corre otro día hay que mover `fecha_examen` de esa fila.

**`alumno.falconi` sirve para enseñar el caso vacío**: todos sus índices en `null` y el `nia.motivo`
nombrando las doce sub fases que le faltan. Un índice ausente nunca vale 0.

## 6. Los dos instructores y qué turno le toca a cada uno

Sólo **el instructor asignado al turno** puede registrar su evaluación — ni el Administrador puede,
y es lo primero que se comprueba, antes que toda otra validación.

| Instructor | Turnos sin evaluar | Turnos ya evaluados |
|---|---|---|
| `instructor.perez` (444444) | **1** (111111) · **2** (222222) · **4** (666666) | los 13 de `555555` |
| `instructor.mendoza` (888888) | **5** (777777) · **6** (999999) · **7** (999999) | ninguno |

Los **nueve turnos teóricos** sembrados son todos de `instructor.perez`.

Los grupos de un instructor **se derivan de los alumnos con los que ya voló**
(`turnos.cod_instructor` → `alumnos_turno` → `personas.id_grupo`), porque no hay relación
instructor-grupo en el esquema. Por eso `instructor.mendoza`, que sólo voló con 777777 y 999999,
sólo puede programar exámenes a los grupos 4 y 6.

## 7. Las mismas cuentas en el backend de IA

`sigeda_chat_status` **no tiene usuarios propios**: valida el token de sigeda-back y resuelve su
claim `sub` —que trae el **username** y nada más— contra su tabla `users`. Por eso las once cuentas
tienen que existir también allá:

```sh
cd sigeda_chat_status && pnpm seed:usuarios      # idempotente
```

Un token válido cuyo `username` no esté sembrado acá responde **401**, con
`Token válido de "<usuario>", que no tiene usuario en este servicio` en el log.

El seed graba además `users.sigeda_persona_code`, que es el puente entre el `User.id` de allá y el
`Persona.codigo` de acá. Sin él, `/prediction/students/{id}` responde 404 para alumnos que sí
existen.

**Los `studentId` son UUID y no el código de persona**, y cambian si se recrea la base del módulo de
aprendizaje. No los escribas a mano: salen de la lista.

```sh
curl -s http://localhost:3000/prediction/students -H "Authorization: Bearer $TOKEN"
```

De los seis alumnos, **sólo `alumno.garcia` (555555) tiene evaluaciones**, así que es el único con
una predicción con contenido: `evaluationCount: 16`, `latestScore: 17`, `riskLevel: "bajo"`,
`trendDirection: "up"`. Los otros cinco salen con `evaluationCount: 0`, que no es un error.

**Los documentos son del dueño que los subió.** Cada cuenta ve sólo los suyos en Aprendizaje, así
que subir un documento como `admin.sistema` y buscarlo como `alumno.lopez` da una lista vacía, sin
error.

## 8. Lo que no existe, aunque parezca

- **`raul.paredes` sólo vive en los mocks del frontend** (`src/mocks/sigeda/usuarios.ts`). Contra el
  backend real ese usuario no existe y el login responde 401.
- **El Grupo 5 no tiene alumnos.** Existe en la tabla y no aparece en el catálogo de grupos del
  turno teórico.
- **Nadie tiene chequeos finales.** `chequeos_finales` está vacía, así que
  `GET /api/personas/{cod}/chequeos` responde 404 para **todos** y el panel de chequeos del legajo
  sale vacío en cualquier cuenta. No es un problema de la cuenta que se elija.
- **Eliminar una persona falla si el usuario alguna vez inició sesión**: `refresh_tokens` no tiene
  cascada (dependencia 30 incompleta). O sea que las cuentas que uses en la demo dejan de poder
  borrarse.
