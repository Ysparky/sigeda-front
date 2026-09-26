# Contrato API — Seguimiento: escuadrón, alertas, legajo, índices del PDI y riesgo

**Versión:** 1 · 2026-09-25
**Implementa:** `sigeda-back` (Spring Boot), branch `main` (leído en `ec2b0dd`) y `sigeda_chat_status` (NestJS), branch `feat/migracion-sigeda-back` (leído en `15b4e86`)
**Consume:** `sigeda-web` M5. Los mocks MSW de `src/mocks/sigeda/` implementan exactamente este documento; **nada de `src/mocks/ia/` lo implementa**, porque M5 no consume el servidor de IA (§8).
**Para:** Victor — implementación en `sigeda-back`; la §8 es para quien mantiene `sigeda_chat_status`

Fuentes del dominio: PDI EA-510 2023, Título III cap. VI y Título IV (spec §3.4), «Descripción Eval» y «Flujo Desaprobado».
Fuentes técnicas: lectura del código de los dos repos con evidencia archivo:línea (spec §17.1 y `.superpowers/notas/investigacion/m5-contrato-backend.md`), decisiones M5-1 a M5-23 (spec §17.2) y dependencias 61–70 (spec §17.5).

**Este contrato es mitad recapitulación y mitad invención, y la diferencia importa.** Ocho endpoints que M5 consume **ya existen** y no se redefinen: se recapitulan su ruta, su permiso y su forma, con puntero a `contrato-api-turnos.md` §2 y §4 para su detalle validado. Siete son **nuevos**. Y la aritmética del PDI — las diez fórmulas del Título V y sus operandos — **está definida en la norma y se cita línea por línea en la §3.2**; lo que falta son cinco datos y mapeos concretos, marcados **[CONFIRMAR]** en la §3.3, de los cuales el primero no lo puede resolver ningún programador: es una tabla que el propio PDI promete y no incluye.

| Sección | Qué es | Dependencia |
|---|---|---|
| §1 Escuadrón | **Ya existe.** Dos catálogos de alumnos, recapitulados | — (56 para la columna de estado teórico) |
| §2 Alertas y desaprobados | §2.1 nuevo; §2.2–§2.6 ya existen y necesitan `@PreAuthorize` | 66, 17 |
| §3 Índices del PDI | Nuevo, y con operandos **[CONFIRMAR]** | 8 → 61, 62; 6 y 70 para la mitad teórica |
| §4 Orden de mérito | Nuevo | 8 → 62, 63 |
| §5 Estado teórico e historial teórico | §5.1 amplía la 7; §5.2 y §5.3 nuevos | 7, 68, 56, 6, 67 |
| §6 Legajo y ciclo de chequeo | §6.1 y §6.2 nuevos; §6.3 ya existe | 64, 65, 12 |
| §8 Predicción de riesgo | **No se consume.** Solo el análisis de por qué | — |

Lo que **no** está en este contrato y nadie hereda, porque M5 es la última etapa, está en spec §17.6: **la predicción de riesgo entera** (§8 dice por qué), el token de versión del autoguardado del examen, la prueba de CA-EXA-12, el bug 58 de `GET /api/personas/{cod}/status`, el `@PreAuthorize` de `GET /api/subfases/assigned` (que sí se pide aquí, en la dependencia 66, aunque ninguna pantalla lo llame) y la consistencia aritmética entre las fijaciones de historial y las de índices.

### Qué recogen las dos etapas anteriores

| Dejado por | Dónde lo dejaron | Dónde está aquí |
|---|---|---|
| Los cuatro endpoints de `DesaprobadoController` sin `@PreAuthorize` y `GET /api/subfases/assigned` | `contrato-api-turnos.md:589`: «Fuera de alcance de este contrato (M5; no hay endpoints de Desaprobados aquí)» | §2.2–§2.6 y dependencia 66 |
| `GET /prediction/students` y `GET /prediction/students/{studentId}` | `contrato-api-aprendizaje.md:428-434`: «las consume M5, no M3; su forma se fija cuando se escriba esa etapa» | §8, **como una renuncia razonada**: M5 no las consume |
| El historial de exámenes del alumno y el mensaje **D14** | spec §16.6 ítem 1 | §5.2 |
| Las `causales[]` del estado teórico y su reconciliación con el catálogo de materias | spec §16.6 ítem 3, `contrato-api-teoria.md:783` | §5.1, seis códigos |
| La variante en lote de `estado-teorico` (dependencia 56) | spec §16.6 ítem 4, `contrato-api-teoria.md:1013` | §5.3 |
| Las inasistencias con la reducción del 50 % | spec §16.6 ítem 2 | §3, como **entrada que falta** (dependencia 70); no se construye pantalla |
| «Prevalece la primera nota» | spec §16.6 ítem 7, `contrato-api-teoria.md:679` | §3.2 y §5.2 |
| El consumidor de `materia.coeficiente` | `contrato-api-teoria.md:148`: «sigue sin consumidor: es la ponderación del NIT que calcula M5» | §3.2 |

---

## Convenciones

- **Base y autenticación.** Prefijo `/api` sobre `http://localhost:8080`; `Authorization: Bearer <jwt>` en todo salvo `/auth/**` (`security/config/SecurityConfig.java:50-52`); CORS solo para `http://localhost:5173` (`:79`). Sin token válido → `401`. La §8 no lleva prefijo y vive en `http://localhost:3000` (`sigeda_chat_status/src/main.ts:18-19`, sin `setGlobalPrefix`).
- **Autorización.** `@PreAuthorize("hasRole('<Permiso>')")` por método; la autoridad es `"ROLE_" + permiso.nombre`. Los cuatro permisos que usa este contrato **ya existen** (`security/entities/Permiso.java:10-13`, `Permission.java:12-18`, `Role.java:9-37`), a diferencia de los de teoría: `Read`, `View My Group`, `View All Groups`, `View Disapproved` y `Create Reports`. **Pero `Create Reports` no protege hoy ningún endpoint**: un grep de `CREATE_REPORTS` sobre `src/main` solo devuelve sus tres declaraciones y los tres conjuntos de rol, y los dos endpoints de reporte que existen piden `Read` (`evaluacion/controllers/EvaluacionController.java:84-85,102-104`). La §4.1 es el primer endpoint que lo usaría de verdad.
- **Quién llama.** Ningún controlador lo sabe: `@AuthenticationPrincipal` no aparece en ninguna parte y el JWT solo trae `sub`, `iat` y `exp` (`security/config/JwtUtils.java:31-38`). Mientras la dependencia 51 no exista, los endpoints de este contrato reciben el código del alumno **en la ruta** y el frontend lo toma del `codPersona` de la sesión, **nunca de un parámetro de la URL**, comprobando la propiedad en sus cargadores de ruta: **es una comprobación de interfaz, no de servidor** (dependencia 20). Cuando la 51 llegue, el servidor resuelve `sub` → `Usuario` → `Persona.codigo` y rechaza con **D11** el legajo ajeno.
- **Alcance por grupo.** Los endpoints de escuadrón (§2.1, §4.1) y los catálogos de la §1 se comportan de dos maneras según el permiso del llamador: con `View All Groups` devuelven todos los grupos del programa; sin él, solo los grupos de los que el llamador es instructor, derivados por `turnos.cod_instructor` → `alumnos_turno` → `personas.id_grupo`, que es el mismo camino de `GET /api/grupos/instructor/{cod}/programa/{nombre}` (`grupo/services/GrupoServiceImpl.java:78-79`). Pedir un `idGrupo` fuera de ese alcance responde **D17**, no una lista vacía.
- **Envoltura de error.** La convención **§A** de `contrato-api-turnos.md` (`utils/Response.java`), igual que Turno, Evaluación, Persona, Grupo, Materia y Teoría:

  | Caso | HTTP | Cuerpo |
  |---|---|---|
  | Validación de campos | 400 | arreglo JSON crudo de `"'campo': mensaje"` (`Response.java:90-93`) |
  | Detalle inexistente | 404 | texto plano `"<Entidad> especificada no existe."` (`:68-71`) |
  | Lista vacía | 404 | texto plano `"No existen <lista> disponibles."` (`:73-76`) |
  | Eliminado | 200 | texto plano `"<Entidad> eliminado con éxito."` (`:63-66`, siempre masculino) |
  | Regla de habilitación | 403 | texto plano (`:78-80`) |
  | Paginado inválido | 400 | `{"error":"Argumento incorrecto","mensaje":"…"}` (`setCustomError`) |

  Cómo lo lee el frontend (`src/lib/api/errors.ts:83-105`): un texto plano por debajo de 500 se muestra tal cual (`:91`), un 403 de texto también (`:89`), un arreglo de textos se reparte por campo (`:90`), y la rama de 5xx (`:84`) **no** muestra el texto, solo lo manda a la consola.
- **Listas vacías.** 404 con texto. `sigeda.pagina` lo convierte en una página vacía (`src/lib/api/http.ts:138-145`) y `sigeda.lista` en `[]` (`:147-154`), **en cualquier endpoint de lista**. Ese es justamente el motivo por el que M5 necesita los avisos de dependencia: un endpoint que todavía no existe se ve *simplemente vacío* (spec M5-22).
- **`409` no existe en este backend.** `grep -rn CONFLICT src/main/java` no devuelve nada; el caso equivalente es **410 Gone** vía `ActionExpiredException` → `exception/GlobalExceptionHandler.java:131-140`, lanzado en tres lugares (`maniobra/services/ManiobraService.java:129`, `turno/services/TurnoService.java:138`, `turno/controllers/TurnoController.java:208`). **M5 no necesita ninguno de los dos:** es un módulo de solo lectura, sin ninguna regla de estado que rechazar. Se anota para que el contrato no parezca incompleto.
- **M5 no escribe nada.** Ningún endpoint de este contrato es `POST`, `PUT` o `DELETE`, con una sola excepción que **el frontend no llama**: `DELETE /api/desaprobados/{cod}` (§2.5), documentado porque existe, no tiene permiso y cualquier usuario autenticado lo alcanza.
- **Fechas y horas.** Fechas `yyyy-MM-dd`, leídas con `DateTimeFormatter.ofPattern("uuuu-MM-dd")` (`utils/CustomDateDeserializer.java:15`). Horas `"HH:mm"`. **Este contrato no tiene ningún instante y ningún sello de tiempo.** La primera versión ponía un `calculadoEn` en §3.1 y §4.1 partido en dos campos; se retiró, porque describía un lote que no existe: no hay ningún `@Scheduled` en `sigeda-back` ni infraestructura para uno (dependencia 55), así que los dos endpoints **se calculan en cada lectura** y el momento del cálculo es el de la consulta, que el navegador ya tiene.
- **Números.** Todos los índices (`nfpi`, `nit`, `nia`, `nct`, `nei`, `na`, `pe`, `pt`, `nsf`, y el valor de cada fase) son **números JSON con 2 decimales o `null`**, nunca texto y nunca `0` para «no se pudo calcular». Los promedios prácticos que devuelven los endpoints que ya existen siguen llegando **como texto** (`evaluaciones_practicas.promedio varchar(255)`, `schema_prod.sql:176`, escrito con `String.format("%.1f", total)`, `evaluacion/utils/CalculoNota.java:85`) y el frontend los tolera con `aNota` (`src/features/evaluaciones/api.ts:111-115`). **La dependencia 62 pide que esa columna pase a numérica**, porque ordenarla o promediarla en SQL es lexicográfico sin un cast, y las §3 y §4 hacen las dos cosas.
- **Paginación.** `utils/Page_Sort.java` (`page` def. `0`, `size` def. `6`, `direction` def. **`ASC`**, `property` **uno**, sin tope de tamaño, `:10-12,29-41`), con el `Page` de Spring serializado directo. El frontend lee `content`, `totalElements`, `totalPages`, `size` y `number`, y pide `size=10`. Los cuatro mensajes de paginado inválido son los de `contrato-api-matricula.md` › Paginación, byte a byte.
- **`programa` inválido no da 400.** `StringToProgramaConverter` **devuelve `PDI` en silencio** ante cualquier valor que no reconozca (`contrato-api-turnos.md` › Enumeraciones). Este contrato no lo cambia; los mocks lo replican, y por eso ninguna pantalla depende de un 400 por programa.
- **Filtros inválidos se ignoran.** Como en teoría: un valor de enum que no existe llega `null` (`spring.jackson.deserialization.READ_UNKNOWN_ENUM_VALUES_AS_NULL=true`, `application.properties:35`) y el filtro simplemente no se aplica. No hay 400 por filtro.
- **Mensajes visibles.** El frontend muestra literalmente los mensajes de la §7 y nada más; cualquier otro texto se reemplaza por el genérico y solo va a la consola.

---

## Permisos

| Permiso | Roles (`security/entities/Role.java`) | Uso en este contrato |
|---|---|---|
| `Read` | todos | §1 (vía los catálogos), §3.1, §5, §6 (el alumno: solo lo propio, dependencias 20 y 51) |
| `View My Group` | Administrador Web, Comandante, Jefe de Operaciones, Instructor (`:13,21,28,32`) | §1.2 |
| `View All Groups` | Administrador Web, Comandante (`:14,22`) | §1.1, y el alcance ampliado de §2.1 y §4.1 |
| `View Disapproved` | Administrador Web, Comandante, Instructor (`:12,20,27`) | §2 completa |
| `Create Reports` | Administrador Web, Comandante, Instructor (`:12,20,27`) | §4.1 |

**Todo holder de `View All Groups` tiene también `View My Group`** (`:13-14`, `:21-22`), así que la pantalla de escuadrón se protege con `View My Group` y usa el otro como interruptor interno (spec M5-5). **El Jefe de Operaciones no tiene `Create Reports` ni `View Disapproved`** (`:30-34`): ve el escuadrón y no ve las alertas ni el orden de mérito. Es un hecho del backend, no una decisión del frontend; si debe cambiar, `CREATE_REPORTS` entra en `Role.Operaciones`, que es un cambio de código y un redespliegue, nunca un cambio de dato.

**Ningún endpoint nuevo de este contrato introduce un permiso nuevo.** Es la diferencia principal con `contrato-api-teoria.md`, cuyos cuatro permisos había que crear (dependencia 54).

**Una consecuencia que la pantalla tiene que respetar:** `GET /api/desaprobados/persona/{cod}` pide `View Disapproved`, que **ni el Alumno ni el Jefe de Operaciones tienen**. Así que el panel de vuelos desaprobados del legajo —que la spec §17.3 cuenta entre los cuatro paneles Reales— **no se pide** para esos dos roles: no se renderiza, y en el legajo propio de un alumno se muestra S29 en su lugar. Sin eso, `/mi-legajo` mostraría un 403 dentro de un panel descrito como Real, que es la clase de contradicción que una revisión encuentra enseguida.

---

## Enumeraciones

| Enum | Valores | Etiqueta en la interfaz |
|---|---|---|
| `Estado` (alumno) | `Apto`, `En Chequeo`, `En Observación`, `En Final`, `En Complementación`, `En Deliberación`, `No Apto` | Apto · En chequeo · En observación · En final · En complementación · En deliberación · No apto |
| `Clasificacion` | `Malo`, `Regular`, `Bueno`, `Excelente` | igual |
| `Categoria` | `Ponderada`, `Chequeo`, `chequeoSubFase`, `Complementacion` | Ponderada · Chequeo · Chequeo Sub Fase · Complementación |
| `Programa` | `PDI`, `PDE` | igual |
| `Fase` | `Adaptación`, `Operaciones HeliTransportadas`, `Operaciones AeroTácticas` | igual |
| `TipoAlerta` (**nuevo**) | `VUELO_DESAPROBADO`, `ESTADO_CRITICO`, `CHEQUEO_PENDIENTE`, `SUBSANACION_PENDIENTE`, `CAUSAL_TEORICO` | Vuelo desaprobado · Estado crítico · Chequeo pendiente · Subsanación pendiente · Causal teórico |
| `Severidad` (**nuevo**) | `ALTA`, `MEDIA`, `BAJA` | Alta · Media · Baja |
| `CausalTeorico` (**nuevo**) | `PROMEDIO_ASIGNATURA`, `TRES_ASIGNATURAS`, `DOS_EXAMENES`, `SEGUNDA_SUBSANACION`, `PERIODICOS_CRITICOS`, `PERIODICOS_GENERALES`, `INOPINADOS` | ver §5.1; los siete salen de `pdi:738-745` |

**El `Estado` del alumno se serializa como el string con tildes y espacios, no como el nombre del enum.** El enum se llama `Apto`, `enChequeo`, `enObservacion`, `enFinal`, `enComplementacion`, `enDeliberacion`, `noApto` (`grupo/entities/Estado.java:3-10`) pero su `nombre` es el texto de la tabla y es lo que viaja. El frontend ya tiene las siete claves exactas en `ESTADOS_ALUMNO` (`src/lib/dominio/vocabulario.ts:20-28`) con su tono.

**Aviso de semilla:** `data_prod.sql:178` guarda `estado_alumno = 'Chequeo'` en una evaluación, y `'Chequeo'` **no es un valor del enum** (el nombre es `"En Chequeo"`). El frontend lo mostrará tal cual con tono neutro (`termino()` cae a `{etiqueta: valor, tono: 'neutro'}`, `vocabulario.ts:89-92`). Corregir el dato es parte de la dependencia 19.

**`Fase` no es un enum en el backend.** Es un `varchar` denormalizado en la evaluación (`schema_prod.sql:173`) cuyos tres valores están escritos a mano en la entidad (`evaluacion/entities/EvaluacionPractica.java:239-246`) y coinciden con las tres filas de `fases` (`data_prod.sql:1-4`). Las tres iniciales son exactamente las de `NFAD`, `NFOH` y `NFOA`. **Nada las une**, y por eso la dependencia 62 pide la FK: un renombre de fase rompe en silencio cualquier agregado por fase.

---

## 1. Escuadrón — lo que ya existe

**No hay endpoint nuevo aquí, y no se pide ninguno.** La pantalla de Escuadrón se arma con los dos catálogos que ya existen, más la columna de estado teórico de la §5.3.

```
GET /api/grupos/programa/{nombre}?page&size&direction&property                  View All Groups
GET /api/grupos/instructor/{cod}/programa/{nombre}?page&size&direction&property  View My Group
```

### 1.1 `GET /api/grupos/programa/{nombre}` — **sin cambios**

`Page<CatalogoByPrograma>` (`grupo/controllers/GrupoController.java:123-125`). La proyección está en la raíz, `projections/CatalogoByPrograma.java`, no bajo `grupo/`: `:7` expone `List<Alumno> getPersonas()` y **`idGrupo` y `estado` están en la interfaz anidada `Alumno` (`:9-14`)**, que extiende `NombreAlumno` (`projections/NombreAlumno.java:3-12`, de donde salen `codigo`, `nombre`, `aPaterno` y `aMaterno`). Cada elemento de `content` es un grupo que expone **solo** sus personas:

```json
{
  "content": [
    { "personas": [ { "codigo": "555555", "nombre": "Pedro", "aPaterno": "Rodriguez", "aMaterno": "Garcia", "idGrupo": 3, "estado": "Apto" } ] }
  ],
  "totalElements": 6, "totalPages": 1, "size": 200, "number": 0
}
```

**No trae `id` de grupo, ni `nombre`, ni `programa`.** El frontend recupera la identidad del grupo desde `personas[].idGrupo` y arma la etiqueta `Grupo {idGrupo}` (S4), como ya hace `src/features/catalogos/api.ts:102`. El `nombre` real del grupo llega por otra vía: la §6.1.

`property` por defecto `"id"` (`:129`). Página vacía → **404** D1.

### 1.2 `GET /api/grupos/instructor/{cod}/programa/{nombre}` — **sin cambios, con dos avisos**

`Page<CatalogoByAlumnoTurno>` = `{"persona": [...]}` sobre la misma proyección de alumno (`:154-156`, `projections/CatalogoByAlumnoTurno.java:7-9`).

1. **Pagina sobre filas de `alumnos_turno`, no sobre alumnos** (`grupo/services/GrupoServiceImpl.java:78-79` → `turno/dao/IAlumno_TurnoDao.java:24-25`), así que un alumno aparece una vez por turno volado con ese instructor. El frontend deduplica por `codigo` y **recorre todas las páginas hasta `totalPages`** en lugar de pedir una sola de 100, porque un instructor con muchos turnos truncaría el conjunto de alumnos (spec M5-6). `Page_Sort` no tiene tope de tamaño, así que paginar es una elección, no una restricción.
2. **La proyección declara `List<Alumno> getPersona()` contra un `@OneToOne Persona` único** (`turno/entities/Alumno_Turno.java:24-26`). El frontend acepta las dos formas (`catalogos/api.ts:113`). La corrección es la decisión M1-9 de `contrato-api-turnos.md` §4.6 y sigue pendiente.

Página vacía → **404** D1, que el frontend muestra como S2 («no tiene alumnos asignados») y no como un error.

**Lo que estos dos catálogos sí dan, y es lo único Real del escuadrón:** `codigo`, nombre completo, `idGrupo` y **`estado`**. El `estado` es el hecho más importante de Seguimiento y es el único que llega sin ninguna dependencia. Ninguno de los dos trae promedio, índice, alerta ni tendencia: para eso están las §§2–4.

---

## 2. Alertas y desaprobados

```
GET    /api/seguimiento/alertas?programa=&idGrupo=&tipo=&fechaPre=&fechaPost=&page=&size=&direction=&property=   View Disapproved   [NUEVO, dep. 66]
GET    /api/desaprobados/persona/{codPersona}                        View Disapproved   [existe]
GET    /api/desaprobados/alumno/{cod}/subfase/{id}                   View Disapproved   [existe, HOY SIN PERMISO]
GET    /api/desaprobados/regular/alumno/{cod}/subfase/{id}           View Disapproved   [existe, HOY SIN PERMISO]
DELETE /api/desaprobados/{cod}                                       Modify Evaluations [existe, HOY SIN PERMISO]
GET    /api/desaprobados/exist/{cod}                                 View Disapproved   [existe, HOY SIN PERMISO]
```

**Los cuatro últimos no tienen `@PreAuthorize` hoy** (`evaluacion/controllers/DesaprobadoController.java:56-57,73-74,91-92,104-105`). La columna de permiso de arriba es **lo que este contrato pide**, no lo que hay. Es la mitad de `sigeda-back` de la dependencia 17, que `contrato-api-turnos.md:589` dejó explícitamente para M5.

### 2.1 `GET /api/seguimiento/alertas` — **nuevo**

**Por qué es un endpoint nuevo y no un bucle.** Lo que la pantalla necesita es «las alertas abiertas de los alumnos que este usuario ve». Hoy eso sería: una petición al catálogo de la §1 (que no trae `id` de grupo), y luego, por cada alumno, una a `GET /api/desaprobados/persona/{cod}`, una a `GET /api/personas/{cod}/estado-teorico` y una lectura de contadores que el Instructor y el Comandante **no pueden hacer** (§6.1). N+1 sobre N+1, y con el agravante de que la versión «barata» del bucle es el propio agujero de seguridad de §2.2. Ningún endpoint de `sigeda-back` devuelve hoy datos de más de un alumno con notas: los cinco catálogos de grupo son los únicos multi-alumno y ninguno trae promedio.

Parámetros, todos opcionales salvo `programa`: `programa` (obligatorio, `PDI` o `PDE`), `idGrupo` (int), `tipo` (`TipoAlerta`), `fechaPre` y `fechaPost` (`yyyy-MM-dd`, inclusivas sobre `fecha`). Paginado `Page_Sort` con `property` por defecto **`"severidad"`**. Propiedades ordenables: `severidad`, `fecha`, `tipo`, `alumno`.

**El orden por severidad es por ordinal, no por etiqueta.** `ALTA`, `MEDIA`, `BAJA` ordenadas como texto dan `ALTA`, `BAJA`, `MEDIA`, que es exactamente lo contrario de lo que sirve. Así que el servidor ordena por un **ordinal** (`ALTA` = 1, `MEDIA` = 2, `BAJA` = 3) y **no lo serializa**: el cuerpo lleva solo `severidad`. El orden por defecto es ese ordinal ascendente y, dentro de cada severidad, `fecha` **descendente**, con las filas de `fecha: null` al final de su severidad. Los mocks ordenan por el mismo ordinal y lo proyectan fuera antes de responder, para que la forma del cable sea idéntica.

Alcance: los grupos del llamador, o todos los del programa si además tiene `View All Groups` (Convenciones › Alcance por grupo). Un `idGrupo` fuera del alcance → **403** D17. Un `idGrupo` que no existe → **404** D18.

**200** — `Page` de filas planas:

```json
{
  "content": [
    {
      "id": "VUELO_DESAPROBADO:666666-1",
      "tipo": "VUELO_DESAPROBADO",
      "severidad": "BAJA",
      "codAlumno": "666666",
      "alumno": "Ana Torres Martinez",
      "idGrupo": 3,
      "grupo": "Grupo 3",
      "programa": "PDI",
      "fecha": "2026-08-26",
      "detalle": "Vuelo Malo en Contacto.",
      "codEvaluacion": "666666-1",
      "idSubfase": 1,
      "idMateria": null,
      "idCuestionario": null,
      "causal": null
    }
  ],
  "totalElements": 10, "totalPages": 1, "size": 10, "number": 0,
  "first": true, "last": true, "numberOfElements": 10, "empty": false
}
```

**`id` es una clave sintética, y su clave natural depende del tipo.** Se arma como `"<tipo>:<clave natural>"` y el frontend la usa **solo** como clave de fila; para enlazar usa los campos explícitos (`codEvaluacion`, `idSubfase`, `idMateria`, `idCuestionario`, `causal`), nunca parseando el `id`. Las claves naturales, una por tipo, elegidas para que dos alertas del mismo tipo y alumno **no** colisionen:

| `tipo` | Clave natural | Ejemplo de `id` |
|---|---|---|
| `VUELO_DESAPROBADO` | el `codigo` del desaprobado | `VUELO_DESAPROBADO:777777-2` |
| `ESTADO_CRITICO` | `codAlumno` (un alumno tiene un estado) | `ESTADO_CRITICO:777777` |
| `CHEQUEO_PENDIENTE` | `codAlumno` | `CHEQUEO_PENDIENTE:999999` |
| `SUBSANACION_PENDIENTE` | `codAlumno` + `idCuestionario` del examen desaprobado | `SUBSANACION_PENDIENTE:666666:2` |
| `CAUSAL_TEORICO` | `codAlumno` + código de causal + `idMateria` (vacío si no lleva materia) | `CAUSAL_TEORICO:111111:PROMEDIO_ASIGNATURA:3` · `CAUSAL_TEORICO:111111:PROMEDIO_ASIGNATURA:2` · `CAUSAL_TEORICO:111111:TRES_ASIGNATURAS:` |

La primera versión de este contrato usaba `codAlumno` para las causales, y eso colisionaba en cuanto un alumno tenía dos — que es el caso normal, porque las siete causales de §5.1 no son excluyentes. **Los dos primeros ejemplos son el caso que obliga a llevar `idMateria` en la clave**: el mismo alumno con el mismo código de causal en dos asignaturas distintas, que es lo que `PROMEDIO_ASIGNATURA` hace en cuanto dos asignaturas caen por debajo de 13. Un código de causal **sin** materia solo puede ocurrir una vez por alumno, así que el segmento vacío sigue siendo único.

**Cómo se deriva cada tipo.** Ninguno es un dato nuevo: los cinco salen de lo que ya está guardado.

| `tipo` | `severidad` | Se abre cuando | `fecha` | Punteros | Enlace del frontend |
|---|---|---|---|---|---|
| `SUBSANACION_PENDIENTE` | **`ALTA`** | `estado-teorico.bloqueadoPorSubsanacion` es `true` (§5.1) | la `fechaExamen` del turno desaprobado | `idMateria`, `idCuestionario` | la pestaña Teórico del legajo |
| `ESTADO_CRITICO` | **derivada del estado** (abajo) | `personas.estado` es **cualquier valor distinto de `Apto`** | la `fecha` de la última evaluación del alumno, o **`null`** si no tiene ninguna | — | el legajo |
| `CHEQUEO_PENDIENTE` | `MEDIA` | los contadores del alumno **ya cumplen** el criterio de su fase (§6.1) **y** su `estado` sigue siendo `Apto` | la `fecha` de la última evaluación | `idSubfase` de la última evaluación | la pestaña Práctico, panel de chequeo |
| `CAUSAL_TEORICO` | `MEDIA` | `estado-teorico.causales` no está vacío; **una fila por causal** | la fecha del hecho que la disparó | `idMateria` cuando el código la lleva, `causal` | la pestaña Teórico del legajo |
| `VUELO_DESAPROBADO` | `BAJA` | existe una fila en `desaprobados` del alumno (`schema_prod.sql:143-152`) | `desaprobados.fecha` | `codEvaluacion`, `idSubfase` | la evaluación |

**Por qué esas severidades.** La única condición que **efectivamente detiene** al alumno es la subsanación pendiente: `pdi:555` dice que quien desapruebe un test o examen de sub fase, periódico o inopinado «no podrá realizar Operaciones Aéreas hasta aprobar la evaluación subsanatoria». Va primera. Una causal teórica, en cambio, **no bloquea nada**: es materia del Consejo de Evaluación de Vuelos (`pdi:737-745`), así que va en el medio, no arriba. Y un vuelo desaprobado es un hecho ya registrado que no pide acción por sí mismo — lo que pide acción es lo que ese hecho acumula, y eso ya está en `CHEQUEO_PENDIENTE`. La primera versión de este contrato tenía las dos primeras invertidas.

**`ESTADO_CRITICO` cubre todos los estados menos `Apto`, y su severidad sale del estado**, de modo que ningún estado se queda sin alerta:

| Estado | Severidad |
|---|---|
| `En Deliberación`, `No Apto` | `ALTA` |
| `En Chequeo`, `En Final`, `En Complementación` | `MEDIA` |
| `En Observación` | `BAJA` |
| `Apto` | no abre alerta |

La versión anterior enumeraba cuatro estados y dejaba `En Observación` y `En Complementación` sin ninguna alerta, que es precisamente el hueco que una pantalla de alertas no puede tener. La escala sigue la escalada del PDI: `En Deliberación` es el paso al Consejo de Evaluación de Vuelos (`pdi:757`) y `No Apto` es la separación.

`CHEQUEO_PENDIENTE` **no se abre** para un alumno cuyo estado ya se movió: si el criterio se cumplió y `ResultadoController` ya lo pasó a `En Chequeo`, lo que corresponde es `ESTADO_CRITICO`. Los dos tipos nunca coinciden en el mismo alumno, y la razón es la misma que explica `cuentaConEsteEstado` en §6.1: fuera de `Apto` los contadores no se mueven.

`detalle` es una frase corta que el servidor arma y **el frontend muestra literalmente**, sin plantilla propia. No lleva id de la §7 porque es variable; si llega vacío, el frontend muestra la etiqueta del tipo y nada más.

Página vacía → **404** D10, que el frontend muestra como S7.

### 2.2 `GET /api/desaprobados/persona/{codPersona}` — **corrección de seguridad**

```
GET /api/desaprobados/persona/{codPersona}   View Disapproved
```

`List<Desaprobado>` (`evaluacion/controllers/DesaprobadoController.java:38-54`), con `persona` excluida por `@JsonBackReference` (`evaluacion/entities/Desaprobado.java:49-52`):

```json
[ { "codigo": "555555-1", "clasificacion": "Regular", "subfase": "Contacto", "fecha": "2024-03-01", "programa": "PDI", "idSubfase": 1 } ]
```

**Corrección (dependencia 66).** El servicio no filtra por persona: `findByCodPersona` llama a `findByCodigoContaining`, es decir un `LIKE %cod%` **sobre el código de la evaluación**, no una igualdad sobre `cod_persona` (`evaluacion/services/DesaprobadoServiceImpl.java:23-25`, `evaluacion/dao/IDesaprobadoDao.java:17-18`). Consecuencia: **cualquier titular de `View Disapproved` — el Instructor incluido (`Role.java:27`) — obtiene los desaprobados de todos los alumnos pasando un valor de un solo carácter**, y como el `Desaprobado` identifica a su alumno por el prefijo de su código, también aprende de quién son. La columna `cod_persona` existe (`schema_prod.sql:147`) y la relación está mapeada (`Desaprobado.java:49-52`): basta un `findByPersona_Codigo`.

Mientras eso no esté corregido, **la capa de API del frontend rechaza un `codPersona` que no tenga exactamente seis caracteres antes de construir la URL** (spec M5-8, CA-ALE-06). No es una mitigación del agujero — quien quiera explotarlo no pasa por el frontend — sino la garantía de que ninguna pantalla lo normaliza.

Lista vacía → **404** D3 (`isEmpty(nombreLista)` con `nombreLista = Desaprobado.class.getAnnotation(Table.class).name()` = `"desaprobados"`, `:32,50-51`), que el frontend trata como lista vacía.

### 2.3 `GET /api/desaprobados/alumno/{cod}/subfase/{id}` — **necesita `@PreAuthorize`**

El último `Desaprobado` del alumno en esa subfase (`:56-71`, `findFirstByCodigoContainingAndIdSubfaseOrderByCodigoDesc`). Misma forma que §2.2, un objeto. `null` → **404** D4. **Hoy no tiene permiso declarado:** cualquier usuario autenticado, incluido un Alumno, lee el de cualquier otro. M5 no lo llama.

### 2.4 `GET /api/desaprobados/regular/alumno/{cod}/subfase/{id}` — **necesita `@PreAuthorize`**

Igual que §2.3 pero filtrado a `clasificacion = Regular` (`:73-89`). `null` → **404** D4. Sin permiso hoy. M5 no lo llama.

### 2.5 `DELETE /api/desaprobados/{cod}` — **necesita `@PreAuthorize`, y es el peor de los cinco**

`deleteByCodigo` **sin comprobación de existencia**, y responde siempre **200** D5 aunque el código no exista (`:91-102` → `Response.java:63-66`). Hoy, **cualquier usuario autenticado — incluido el Alumno cuyo vuelo desaprobado es — puede borrar el registro de su propio fallo**, y el sistema contesta que fue bien. Este contrato pide `Modify Evaluations` (el permiso que ya gobierna modificar y eliminar una evaluación, `EvaluacionController.java:402-404`) y un **404** D4 cuando el código no existe. **M5 nunca lo llama**; está aquí porque existe.

### 2.6 `GET /api/desaprobados/exist/{cod}` — **necesita `@PreAuthorize`**

Devuelve `true` o `false` crudos (`:104-116`). Sin permiso hoy. M5 no lo llama.

**Y una sexta ruta de la misma dependencia:** `GET /api/subfases/assigned` tampoco tiene `@PreAuthorize` (`maniobra/controllers/SubFaseController.java:47-50`), a diferencia de sus tres hermanas del mismo controlador (`:29-30` `Read`, `:41-42` `Manage Subphases`, `:52-53` `Read`). Debería pedir `Read`. Ninguna pantalla de M5 la llama; se pide aquí porque la dependencia 17 la nombra y ningún contrato la había recogido.

---

## 3. Índices del PDI — dependencia 8, partida en 61 y 62

```
GET /api/personas/{cod}/indices   Read   [NUEVO, deps. 61 y 62; su mitad teórica además depende de 6 y 70]
```

**Nada de esto existe en `sigeda-back`.** Un grep insensible a mayúsculas sobre `src/main` de `nfpi|\bnit\b|\bnia\b|merito|mérito|ranking|legajo|nfad|nfoh|nfoa|coeficiente` devuelve **cero líneas**, y un grep de `materia` devuelve **cero líneas también**: no hay tabla `materias`, ni entidad, ni columna `coeficiente`, ni fila sembrada. Lo único aritmético que el backend hace es el `promedio` y la `clasificacion` **de una evaluación** (`evaluacion/utils/CalculoNota.java`, invocado solo para `Ponderada` y `Chequeo Sub Fase`, `evaluacion/controllers/EvaluacionController.java:291-292,379-380`).

**El frontend no calcula ninguno de estos números** (spec M5-2). Los pide, los muestra con dos decimales y, si llegan `null`, lo dice (S14). No hay cálculo de respaldo, ni estimación, ni «mientras tanto».

### 3.1 `GET /api/personas/{cod}/indices` — **nuevo**

`Read`, y con la dependencia 51 restringido al propio alumno o a un rol de personal (**403** D11). **404** D2 si el código no resuelve a ninguna persona.

**Se calcula en cada lectura.** No hay ningún `@Scheduled` en `sigeda-back` (`grep -rn "@Scheduled\|EnableScheduling\|TaskScheduler" src/main/java` no devuelve nada; es la dependencia 55, abierta desde M4) ni infraestructura para uno, así que no hay un lote nocturno del que colgar una fecha de cálculo. Por eso **este endpoint no devuelve ningún sello de tiempo**: el momento del cálculo es el momento de la consulta, que el navegador ya conoce.

**200** — siempre 200 cuando la persona existe, **nunca 404 por falta de datos**, porque la pantalla necesita distinguir «no calculable» de «no encontrado»:

```json
{
  "codigo": "555555",
  "alumno": "Pedro Rodriguez Garcia",
  "programa": "PDI",
  "nfpi": 16.44,
  "nit": {
    "valor": 17.60,
    "nct": 18.00,
    "nei": 16.00,
    "neiEvaluaciones": 4,
    "asignaturas": [
      { "idMateria": 1, "materia": "Aerodinámica Aplicada a Helicópteros", "coeficiente": 0.13, "coeficienteAplicado": 0.13, "pe": 18.00, "pt": 18.00, "na": 18.00 }
    ],
    "asignaturasSinNota": [],
    "reduccionPorRezagadoAplicada": false
  },
  "nia": {
    "valor": null,
    "fases": [
      { "fase": "Adaptación",                    "sigla": "NFAD", "peso": 0.40, "valor": null, "subfases": [
        { "idSubfase": 1, "subfase": "Contacto",        "sigla": "C",  "peso": 0.25, "nsf": null, "misiones": 3 },
        { "idSubfase": 2, "subfase": "Navegación",      "sigla": "N",  "peso": 0.25, "nsf": null, "misiones": 0 },
        { "idSubfase": 3, "subfase": "Instrumentos",    "sigla": "I",  "peso": 0.20, "nsf": null, "misiones": 0 },
        { "idSubfase": 5, "subfase": "Formación",       "sigla": "F",  "peso": 0.15, "nsf": null, "misiones": 0 },
        { "idSubfase": 4, "subfase": "Campos Extraños", "sigla": "CX", "peso": 0.15, "nsf": null, "misiones": 0 }
      ] },
      { "fase": "Operaciones HeliTransportadas", "sigla": "NFOH", "peso": 0.35, "valor": null, "subfases": [] },
      { "fase": "Operaciones AeroTácticas",      "sigla": "NFOA", "peso": 0.25, "valor": null, "subfases": [] }
    ],
    "motivo": "Falta la tabla de coeficientes de misión del PDI: sin ella no se puede calcular ninguna nota de sub fase."
  }
}
```

`nfpi`, `nit.valor`, `nia.valor`, cada `fases[].valor` y cada `subfases[].nsf` son `number` con 2 decimales **o `null`**. `nit` y `nia` nunca son `null` como objeto: si su `valor` no se puede calcular, el objeto viene con `valor: null` y su desglose con lo que sí hay, para que la pantalla explique qué falta. `nia.motivo` es una frase corta que el frontend muestra literalmente cuando `nia.valor` es `null`.

**El desglose baja hasta la sub fase**, porque es el nivel en el que el PDI pondera y es el único nivel en el que un instructor puede leer «dónde está flojo». Las siglas `C`, `N`, `I`, `F`, `CX`, `CE`, `SAR`, `OEH`, `NTD`, `NVG` son las del PDI y viajan para que la pantalla pueda mostrar la fórmula tal como está publicada.

### 3.2 Las fórmulas y sus operandos, según el PDI

**Fuente:** `PDI_EA-510_2023_120_horas.docx`, **Título V capítulos I, II y III**, más Título III capítulo I para los periódicos y las subsanaciones. Las citas `pdi:n` son a la extracción de texto del documento. Las cuatro fórmulas **y sus operandos** están definidos ahí; lo que no está definido es una tabla y un mapeo, y eso son los cinco `[CONFIRMAR]` del final.

```
NFPI = NIT (0.2) + NIA (0.8)                          pdi:609-614
NIT  = NCT (0.8) + NEI (0.2)                          pdi:620-625
NCT  = Σ (NA × coeficiente)                           pdi:627-632
NA   = PE (0.6) + PT (0.4)                            pdi:672-676
NEI  = Σ (NOTAS) / CANT. EVAL.                        pdi:677-682
NIA  = NFAD (0.40) + NFOH (0.35) + NFOA (0.25)        pdi:691-696
NFAD = C (0.25) + N (0.25) + I (0.20) + F (0.15) + CX (0.15)   pdi:698-706
NFOH = CE (0.30) + SAR (0.30) + OEH (0.40)            pdi:708-715
NFOA = NTD (0.50) + NVG (0.50)                        pdi:717-723
NSF  = Σ (NMI × COEF)                                 pdi:724-732
```

Las tres sumas de pesos de fase cierran en 1.00, y las tres de sub fase también. Eso es una comprobación útil: un desglose cuyos pesos no sumen 1.00 está mal leído.

**La mitad teórica (`NIT`).**

| Operando | Definición del PDI | Cita |
|---|---|---|
| `PE` | **Promedio de Exámenes** de la asignatura: media de las notas de sus cuestionarios con `tipoExamen = EXAMEN` | `pdi:672-676` |
| `PT` | **Promedio de Test** de la asignatura: media de las notas de sus cuestionarios con `tipoExamen = TEST` | `pdi:672-676` |
| `NA` | **Nota de Asignatura**, por asignatura: `PE·0.6 + PT·0.4` | `pdi:671-673` |
| `NCT` | **Nota del Curso en Tierra**: `Σ (NA × coeficiente)` sobre las **once asignaturas del Curso en Tierra Primera Parte** | `pdi:626-628` |
| coeficientes | Los once están **publicados en el PDI**: Aerodinámica Aplicada a Helicópteros 0.13 · Ingeniería del Helicóptero 0.16 · Adoctrinamiento de Vuelo 0.22 · Límites de Operación 0.10 · Procedimientos Normales 0.10 · Procedimientos de Emergencias 0.10 · Meteorología 0.04 · Prevención de Accidentes 0.04 · Normatividad FAP 0.04 · Regulaciones Aeronáuticas del Perú 0.04 · Fraseología Aeronáutica en Inglés 0.03. Suman **1.00** | `pdi:633-669` |
| `NEI` | **Nota de Exámenes Periódicos e Inopinados**: promedio **simple** de las notas de los Test y Exámenes **Mensuales, Semestrales e Inopinados**, dividido entre la cantidad total rendida «desde la finalización del Curso en Tierra Primera Parte hasta la calificación como Pilotos de Helicóptero» | `pdi:625,677-682` |

**De dónde salen los once coeficientes, dicho con precisión.** Del PDI, y **solo** del PDI. `sigeda-back` no los guarda: no hay tabla `materias` ni columna `coeficiente` en ninguna parte de `src/main`. Los once valores viven hoy en dos lugares del frontend — la semilla MSW (`src/mocks/sigeda/datos.ts:171-183`) y `contrato-api-matricula.md:795`, donde M2 los fijó contra los mocks — y llegan al servidor con las dependencias 6 y 53. Que coincidan byte a byte con la tabla del PDI es lo que hace fiable el cálculo; **no es evidencia de que el backend los tenga.**

**Tres consecuencias del `NEI` que conviene no perder de vista:**

- **Son tres tipos, no nueve.** `MENSUAL`, `SEMESTRAL` e `INOPINADO`. `TEST` y `EXAMEN` alimentan `PT` y `PE` de su asignatura, no el `NEI`.
- **`SEMANAL` y `QUINCENAL` quedan fuera del `NEI` aunque sean periódicos.** La tabla de periodicidad (`pdi:527-547`) los define — semanal: Emergencias Críticas; quincenal: Emergencias No Críticas y Límites de Operación — y `pdi:678` no los nombra. Es sorprendente y es lo que dice la fuente. Siguen contando para las causales de separación (§5.1), que es su otro uso.
- **`SUBSANACION` y `REZAGADO` no entran en ningún índice.** `pdi:554`, `:683` y `:687` dicen las tres veces **«prevaleciendo la primera nota para el cómputo»**: la nota de la subsanación **no** se promedia. Y un rezagado no es un tipo aparte para el cómputo: es el mismo examen rendido después, cuya nota pertenece a la asignatura y al tipo del examen de origen, reducida al 50 % si la ausencia fue injustificada (`pdi:558,685`). En el modelo de M4 eso significa que un cuestionario de tipo `SUBSANACION` o `REZAGADO` **aporta su nota al índice de su turno de origen, no al suyo**, y que la nota que prevalece sigue siendo la primera.

**La mitad práctica (`NIA`).** Aquí el PDI es **más** específico de lo que este contrato suponía en su primera versión: las notas de fase **no** son medias aritméticas de evaluaciones, son sumas ponderadas de notas de sub fase, y la nota de sub fase es a su vez una suma ponderada de notas de misión.

| Operando | Definición del PDI | Cita |
|---|---|---|
| `NSF` | **Nota de Sub Fase**: `Σ (NMI × COEF)`, la nota de cada misión por su coeficiente de misión | `pdi:724-732` |
| `NMI` | **Nota de Misión**: el `promedio` que `CalculoNota` ya produce por evaluación | `pdi:730`; `CalculoNota.java:70-86` |
| `NFAD` | `C·0.25 + N·0.25 + I·0.20 + F·0.15 + CX·0.15` sobre las `NSF` de Contacto, Navegación, Instrumentos, Formación y Campos Extraños | `pdi:698-706` |
| `NFOH` | `CE·0.30 + SAR·0.30 + OEH·0.40` sobre Carga Externa, Búsqueda y Rescate y Operaciones Especiales | `pdi:708-715` |
| `NFOA` | `NTD·0.50 + NVG·0.50` sobre Navegación Táctica Diurna y NVG | `pdi:717-723` |

**Qué evaluaciones entran como `NMI`.** Las misiones de **Complementación de Fase no cuentan para el promedio** (`pdi:589`), lo que coincide con que `CalculoNota` solo puntúa `Ponderada` y `Chequeo Sub Fase` (`EvaluacionController.java:291-292`) y con que un `Chequeo` guarda `promedio: null` (`data_prod.sql:178`). Así que `NMI` son las evaluaciones `Ponderada` y `Chequeo Sub Fase`, que es lo mismo que ya filtra `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` (`evaluacion/services/EvaluacionServiceImpl.java:33-36`).

**Dos cosas sobre la nota de misión, porque los índices se calculan sobre ella.**

**La nota base es 17, y el propio PDI da las dos cifras en una sola frase.** `pdi:565` dice literalmente «La nota base de cada misión será de **diecisiete (17.50)**»: la palabra y el número no coinciden **dentro de la misma oración**, y `CalculoNota` implementa la palabra (`:47-61`). Así que esto no es el backend apartándose de la norma, es el backend eligiendo una de las dos cifras que la norma da, y la escrita con letra. Conviene presentarlo así a quien valide: «el código está medio punto bajo» y «la fuente se contradice» piden acciones opuestas.

**La tercera condición de «VUELO MALO» no es un `if` que falte.** «Cuando por tercera misión consecutiva no alcance el rendimiento estándar requerido en la misma tarea» (`pdi:591`) necesita el historial del alumno **de una maniobra a través de varias misiones**, y `CalculoNota` recibe las `calificaciones` de una sola evaluación y nada más (`:70-77`). Ninguna lógica local puede verlo: hace falta una consulta nueva sobre `calificaciones` cruzada con las evaluaciones anteriores del alumno. Anotarlo como un bug de una línea le costaría una tarde a alguien.

**El leyendario de `NFAD` está cruzado en la fuente.** La fórmula usa `C, N, I, F, CX` (`pdi:698-699`) y el leyendario que la sigue dice `C` = Contacto, **`E` = Navegación**, **`N/I` = Instrumentos**, `F` = Formación, **`N` = Campos Extraños** (`pdi:700-706`). Las letras del leyendario no son las de la fórmula. La única lectura que cierra en 1.00 y que respeta el orden de la fórmula es `C` = Contacto 0.25, `N` = Navegación 0.25, `I` = Instrumentos 0.20, `F` = Formación 0.15, `CX` = Campos Extraños 0.15, y es la que este contrato implementa — pero un lector del PDI podría concluir que Campos Extraños pesa 0.25. Es un defecto del documento, no una ambigüedad de diseño, y conviene señalarlo al validar.

### 3.3 Las cinco cosas que falta definir — `[CONFIRMAR]`

Son cinco, todas de datos o de mapeo. Ninguna es una fórmula: las diez fórmulas están publicadas.

**1. La tabla de coeficientes de misión, sin la cual `NIA` no la puede calcular nadie.** `pdi:732` dice «Cada misión tendrá un coeficiente independiente, el cual se detalla a continuación» y la línea siguiente es «Reconocimientos:» — **la tabla prometida no está en el documento**. Y no está en el libro de trabajo que lo acompaña: `PCPH 2024xlsx.xlsx` tiene 316 cadenas compartidas y **ninguna contiene «coef»**, ni `NSF`, `NMI`, `NFAD`, `NFOH` ni `NFOA`; sus dieciséis hojas son `ESTRUCTURA (2024)`, `PRESOLO`, `CONTACTO`, `NAV-INS`, `FORMACIÓN`, `NOCTURNO`, `EMERGENCIAS`, `CAMPEX`, `CARGEX`, `SAR`, `NVG`, `FORTAC`, `NTD`, `OEH`, `OO` y `Hoja1`, que son las hojas de calificativos por sub fase. Conclusión, y es la más fuerte de este contrato: **`NSF` no es computable como está publicado, por nadie** — ni por este sistema ni por el Escuadrón con lápiz — hasta que la institución entregue esa tabla. No es una carencia del backend: es un dato que falta en la norma. Mientras falte, `nsf`, `NFAD`, `NFOH`, `NFOA`, `NIA` y `NFPI` son `null`, y `nia.motivo` lo dice. **La dependencia 62 pide esa tabla como dato institucional.**

**2. El mapeo de sub fases, que no cuadra en ninguno de los tres lados.** El PDI pondera **diez** símbolos de sub fase. El libro de trabajo nombra **catorce** hojas de vuelo. `ec2b0dd` siembra **cinco** sub fases (`data_prod.sql:6-11`), todas con `id_fase = 1`:

| | Contacto | Navegación | Instrumentos | Formación | Campos Extraños | Carga Externa | SAR | OEH | NTD | NVG | Pre-Solo | Nocturno | Emergencias | Formación Táctica | O/O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ponderado en el PDI | 0.25 | 0.25 | 0.20 | 0.15 | 0.15 | 0.30 | 0.30 | 0.40 | 0.50 | 0.50 | — | — | — | — | — |
| Hoja en el libro | ✓ | NAV-INS | NAV-INS | ✓ | CAMPEX | CARGEX | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | FORTAC | ✓ |
| Sembrado en `ec2b0dd` | id 1 | id 2 | id 3 | id 5 | id 4 | — | — | — | — | — | — | — | — | — | — |

Lo que hay que decidir: (a) las cinco sub fases sembradas son **exactamente** las cinco que el PDI pondera dentro de `NFAD`, **incluida Campos Extraños bajo Adaptación**, que es donde el PDI la pesa y donde la semilla la pone (`id_fase = 1`) — hay que confirmar que eso es intencional y no coincidencia; (b) las sub fases de `NFOH` y `NFOA` **no existen en la semilla**, así que esas dos notas no tienen de dónde salir aunque llegue la tabla de coeficientes; (c) Pre-Solo, Nocturno, Emergencias, Formación Táctica y Orden de Operaciones tienen hoja de calificativos y **ningún peso**, así que sus misiones no entran en ninguna `NSF`; (d) el libro de trabajo trata Navegación e Instrumentos como **una** hoja (`NAV-INS`) mientras el PDI las pesa **por separado** (0.25 y 0.20) y la semilla las siembra separadas — la separación es la que permite calcular, así que el libro es el que queda fuera de paso; (e) el `NVG` de `NFOA` es una sola sub fase, y el libro tiene `NVG` entre `SAR` y `FORTAC`: hay que decir si es la de visores nocturnos de Helitransportadas o una navegación táctica nocturna de Aerotácticas. Las notas de diseño internas del proyecto describen además una estructura de trece sub fases que fusiona Navegación e Instrumentos y archiva Campos Extraños bajo Helitransportadas; **esa estructura no es la que `ec2b0dd` siembra**, de modo que la reconciliación hay que hacerla contra la semilla y contra el PDI, no contra la nota de diseño.

**3. Dónde caen `PRE_SOLO` y `BALOTAS`.** La evaluación Pre-Solo se rinde el día antes del Chequeo de Salida Solo, con nota mínima 18, y cubre POVs, Adoctrinamiento, Procedimientos Normales, Emergencias y Límites de Operación (`pdi:454`): **no es una asignatura de la Primera Parte y no es un periódico**, así que no entra en ningún `NA` ni en el `NEI`. El `Examen de Balotas` es una asignatura de la **Segunda Parte** (`pdi:358`), y la Segunda Parte **no tiene tabla de coeficientes** — solo la Primera Parte los tiene (`pdi:633-669`). Así que los dos tipos entran hoy en **ningún índice**, que es lo que este contrato implementa, y hay que confirmar que es intencional y no un olvido de la norma.

**4. Desde cuándo se cuenta el `NEI`.** `pdi:678` dice «desde la finalización del Curso en Tierra Primera Parte» y `pdi:525` dice que los Test y Exámenes Periódicos «se iniciarán cuando se inicien las Operaciones Aéreas». Las dos frases describen el mismo momento, así que el límite es registrable en principio — el primer turno práctico del alumno sirve de marca —, pero **nada en `sigeda-back` guarda una fecha de fin de la Primera Parte** y los `turnos_teoricos` de M4 tampoco tienen ese concepto. Hay que elegir: aceptar la primera fila de `alumnos_turno` como límite, o guardar una fecha.

**5. La renormalización de `coeficienteAplicado`.** `pdi:627-628` da `NCT = Σ(NA × coeficiente)` y no dice qué hacer con un curso en progreso, porque calcula una nota final. Este contrato **renormaliza** los coeficientes sobre las asignaturas que ya tienen nota, y devuelve `asignaturasSinNota[]` para que la pantalla diga qué falta; la alternativa es dejar `NCT` en `null` hasta que existan las once, lo que lo dejaría `null` durante casi todo el curso. Hay que confirmar cuál quiere la institución.

### 3.4 Reglas que sí están fijadas

- **Prevalece la primera nota, y es la que entra en el promedio.** `pdi:554`, `:683` y `:687`: «prevaleciendo la primera nota para el cómputo de la Nota Final de la Instrucción en Tierra». La subsanación **no** se promedia: levanta el bloqueo para volar y queda como evidencia de que el alumno subsanó. Una asignatura desaprobada sigue desaprobada para `TRES_ASIGNATURAS` (§5.1) aunque su subsanación se apruebe.
- **El rezagado injustificado vale el 50 % — de cualquier test o examen.** `pdi:558` (Título III) y `pdi:685` (Título V) dicen los dos «un test o examen», sin restringirlo a los periódicos. Así que la reducción afecta a `PT`, a `PE` y por tanto a `NA` y a `NCT`, además del `NEI`. Ese dato **no existe**: la marca de inasistencia justificada se recortó de M4 (spec §16.6 ítem 2) y es la dependencia **70**. Hasta que exista, `reduccionPorRezagadoAplicada` es siempre `false` y **ninguna nota se reduce**, de modo que `NIT` es optimista para todo alumno que faltó a un examen. El campo está en la respuesta desde el principio para que el día que la 70 llegue no haya que cambiar la forma.
- **`null` propaga, y no se rellena con 0.** Si una `NSF` es `null`, su fase es `null`; si una fase es `null`, `NIA` es `null`; si `NIA` es `null`, `NFPI` es `null` aunque `NIT` exista. Un índice ausente **nunca** se devuelve como `0`: 0 es una nota posible y confundir las dos cosas es la manera de publicar un orden de mérito falso.
- **Redondeo.** Dos decimales, aproximando al centésimo inmediato superior cuando el milésimo sea 5 o mayor (`pdi:588`), **una sola vez al final**; los operandos intermedios no se redondean. Las fijaciones de la §9 están elegidas para que las cifras sean exactas con o sin esa regla.
- **La mitad teórica está bloqueada por la 6.** `NCT`, `NEI` y `NA` se calculan sobre `cuestionarios` y `calificaciones_teoricas`, siete tablas que no existen (`contrato-api-teoria.md` §8, dependencia 53), y sobre una tabla `materias` que tampoco existe. Hasta que la 6 exista, `nit.valor` es `null`. **Y la mitad práctica está bloqueada por un dato de la norma**, no por el backend: sin la tabla de coeficientes de misión, `NIA` es `null` desde el primer día. Es decir: **`NFPI` no es calculable hoy por dos razones independientes**, y solo una de ellas es software.

## 4. Orden de mérito — la otra mitad de la dependencia 8

```
GET /api/reportes/orden-merito?programa=&idGrupo=&page=&size=&direction=&property=   Create Reports   [NUEVO, deps. 62 y 63]
```

Su finalidad es la del Título V capítulo I del PDI: «establecer el Orden de Mérito Final de los Alumnos Pilotos que culminaron satisfactoriamente el Curso Piloto de Helicóptero» (`pdi:607`).

### 4.1 `GET /api/reportes/orden-merito` — **nuevo**

`programa` obligatorio; `idGrupo` opcional. Alcance por grupo como en §2.1: **403** D17 fuera de alcance, **404** D18 si el grupo no existe. Paginado `Page_Sort` con `property` por defecto **`"puesto"`** y `direction` por defecto `ASC`; propiedades ordenables: `puesto`, `nfpi`, `nit`, `nia`, `alumno`, `codigo`.

**Este es el primer endpoint de `sigeda-back` que `Create Reports` protegería de verdad.**

**Se calcula en cada lectura**, como §3.1 y por el mismo motivo: no hay ningún `@Scheduled` en el proyecto ni infraestructura para uno (dependencia 55). **No devuelve ningún sello de tiempo**: el momento del cálculo es el de la consulta. El frontend lo dice así en S22, con la hora que su propio reloj ya tiene, y no promete un lote que no existe.

**200** — `Page` de filas planas, ya ordenadas por el servidor:

```json
{
  "content": [
    { "puesto": 1,    "codigo": "222222", "alumno": "Juan Falconi Fernandez", "idGrupo": 2, "grupo": "Grupo 2", "nfpi": 17.16, "nit": 17.20, "nia": 17.15, "motivoSinNfpi": null },
    { "puesto": null, "codigo": "666666", "alumno": "Ana Torres Martinez",    "idGrupo": 3, "grupo": "Grupo 3", "nfpi": null,  "nit": 12.80, "nia": null,  "motivoSinNfpi": "Sin nota en Operaciones HeliTransportadas ni en Operaciones AeroTácticas." }
  ],
  "totalElements": 6, "totalPages": 1, "size": 10, "number": 0,
  "first": true, "last": true, "numberOfElements": 6, "empty": false
}
```

Es un `Page` de Spring sin envoltura ni campos añadidos, igual que todos los demás endpoints paginados del dominio.

**Orden y desempate, fijados:** `nfpi` **descendente**, y ante empate `nia` descendente, y si también empata `codigo` **ascendente**. El PDI no define el desempate — habla de «sumatoria ponderada» y de reconocimientos al primer puesto (`pdi:608,734-735`) sin decir qué hacer con dos notas iguales —, así que la regla es de este contrato y tiene que ser **determinista** para que dos lecturas no devuelvan dos órdenes. El `puesto` es el que calcula el servidor con esa regla y **el frontend no lo recalcula nunca**, ni siquiera cuando el usuario reordena la tabla por otra columna: reordenar cambia las filas de sitio, no su puesto. El frontend muestra la regla en S23.

**Alumnos sin NFPI completo:** `puesto: null`, al final de la última página, con `motivoSinNfpi` como frase corta que el frontend muestra literalmente en S24. **No se les asigna puesto** y no desplazan a nadie: los puestos van 1..n sobre los alumnos rankeables. Mientras falte la tabla de coeficientes de misión (§3.3), **eso es todo el mundo**, y la pantalla dirá exactamente eso en lugar de una tabla vacía.

**Un alumno sin grupo no aparece** (la alumna `654321` de las fijaciones): el reporte es por programa y grupo, y un alumno sin grupo no pertenece a ninguno de los dos alcances. Consultar su legajo sigue siendo posible por §3.1.

Página vacía → **404** D12, que el frontend muestra como S25.

**Por qué no se puede hacer en el cliente** (spec M5-2): el único endpoint de evaluaciones que existe está **por persona** (`EvaluacionController.java:125-127`), así que una versión de cliente cuesta una petición por alumno del escuadrón, más una por página del historial de cada uno, y termina ordenando por una columna `varchar` que el navegador tendría que parsear. Con la dependencia 62 y este endpoint, es una consulta.

## 5. Estado teórico e historial teórico

```
GET /api/personas/{cod}/estado-teorico                                     Read   [existe en el contrato de teoría §5.1; aquí gana causales[], dep. 68]
GET /api/cuestionarios?codAlumno=&idMateria=&estado=&page=&size=           Read   [NUEVO, dep. 67]
GET /api/estado-teorico?codAlumnos=a,b,c                                   Read   [NUEVO, dep. 56]
```

### 5.1 `GET /api/personas/{cod}/estado-teorico` — **amplía el contrato de teoría**

La forma de `contrato-api-teoria.md` §5.1 **no cambia**; gana un campo. **404** D2 si el código no existe. Con la dependencia 51, **403** D11 para un alumno ajeno.

```json
{
  "codAlumno": "666666",
  "alumno": "Ana Torres Martinez",
  "bloqueadoPorSubsanacion": true,
  "motivo": "Desaprobó Adoctrinamiento de Vuelo con 12.00 (mínimo 18) el 2026-09-18.",
  "desaprobados": [ { "idCuestionario": 2, "idTurnoTeorico": 1, "turnoTeorico": "Mensual Adoctrinamiento de Vuelo", "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "tipoExamen": "MENSUAL", "fechaExamen": "2026-09-18", "nota": 12.00, "notaMinimaAplicada": 18 } ],
  "pendientes": [ 5 ],
  "causales": [
    { "codigo": "PROMEDIO_ASIGNATURA", "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "grupo": null,
      "detalle": "Nota de asignatura 12.50 en Adoctrinamiento de Vuelo, por debajo de 13.", "fecha": "2026-09-18" }
  ]
}
```

**Los siete códigos de `CausalTeorico` salen del PDI, Título IV, «Causal por bajo rendimiento académico» (`pdi:738-745`).** M4 los había codificado en siete valores de los cuales dos nombraban asignaturas que no existen en el catálogo de once, y la primera versión de este contrato los colapsó en uno. **Las dos cosas estaban mal**, y la razón es una frase del PDI: las dos causales de periódicos dicen «(**cualquiera de ellos**)», así que **el conteo es por grupo de asignaturas, no por asignatura**. Tres desaprobados repartidos entre Emergencias y Límites disparan la causal; contarlos por asignatura no la dispararía nunca.

| Código | Regla del PDI | Cita | Lleva |
|---|---|---|---|
| `PROMEDIO_ASIGNATURA` | obtener menos de **13** en el promedio final de cualquier asignatura del Curso en Tierra — es decir, `NA < 13` (§3.2) | `pdi:739` | `idMateria` |
| `TRES_ASIGNATURAS` | desaprobar **3** asignaturas del Curso en Tierra (una asignatura está desaprobada si su `NA` queda bajo su `notaMinima`) | `pdi:740` | — |
| `DOS_EXAMENES` | desaprobar **2** exámenes del Curso en Tierra (`tipoExamen = EXAMEN`) | `pdi:741` | — |
| `SEGUNDA_SUBSANACION` | desaprobar el **segundo** examen de subsanación de **una** asignatura | `pdi:742` | `idMateria` |
| `PERIODICOS_CRITICOS` | desaprobar, **en cualquiera del grupo**, **3 consecutivas o 5 alternadas**: Emergencias Críticas, Emergencias No Críticas o Límites de Operación | `pdi:743` | `grupo`, más el `idMateria` de la ocurrencia que la disparó |
| `PERIODICOS_GENERALES` | igual, en cualquiera de: Ingeniería, Adoctrinamiento, Instrumentos, Aerodinámica, Meteorología o Fraseología Aeronáutica | `pdi:744` | `grupo`, más el `idMateria` que la disparó |
| `INOPINADOS` | desaprobar exámenes o test **inopinados** 3 consecutivas o 5 alternadas | `pdi:745` | — |

**Cómo se reconcilian los dos grupos con el catálogo de once asignaturas.** El PDI nombra los periódicos por su **contenido**, y la tabla de periodicidad (`pdi:527-547`) es el puente, porque asigna cada contenido a una cadencia:

| Contenido del PDI | Cadencia | Asignatura del catálogo | `tipoExamen` |
|---|---|---|---|
| Emergencias Críticas | semanal | Procedimientos de Emergencias | `SEMANAL` |
| Emergencias No Críticas | quincenal | Procedimientos de Emergencias | `QUINCENAL` |
| Límites de Operación | quincenal | Límites de Operación | `QUINCENAL` |
| Ingeniería | mensual | Ingeniería del Helicóptero | `MENSUAL` |
| Adoctrinamiento | mensual | Adoctrinamiento de Vuelo | `MENSUAL` |
| **Instrumentos** | semestral | **no existe en el catálogo** | `SEMESTRAL` |
| Aerodinámica | semestral | Aerodinámica Aplicada a Helicópteros | `SEMESTRAL` |
| Meteorología | semestral | Meteorología | `SEMESTRAL` |
| Fraseología Aeronáutica | semestral | Fraseología Aeronáutica en Inglés | `SEMESTRAL` |

Así que el conteo se hace sobre pares **(asignatura, `tipoExamen`)** y no hace falta inventar ninguna asignatura para separar Emergencias Críticas de No Críticas: **la cadencia las distingue**. `PERIODICOS_CRITICOS` cuenta sobre `{(Procedimientos de Emergencias, SEMANAL), (Procedimientos de Emergencias, QUINCENAL), (Límites de Operación, QUINCENAL)}` y `PERIODICOS_GENERALES` sobre `{(Ingeniería del Helicóptero, MENSUAL), (Adoctrinamiento de Vuelo, MENSUAL), (Aerodinámica Aplicada a Helicópteros, SEMESTRAL), (Meteorología, SEMESTRAL), (Fraseología Aeronáutica en Inglés, SEMESTRAL)}`. **La única ausencia real es «Instrumentos»**, que el PDI evalúa semestralmente (`pdi:540`) y nombra en la causal (`:744`) y que no está entre las once asignaturas. Eso sí hay que resolverlo: o el catálogo gana una asignatura «Instrumentos», que es un alta en la pantalla de Materias que M2 ya entregó, o la causal se aplica sin ella y se documenta. `grupo` viaja en el payload como la lista de asignaturas que el grupo cubre **y que existen en el catálogo**, para que la pantalla pueda decir exactamente sobre qué contó.

`detalle` es una frase corta que el servidor arma y el frontend muestra literalmente; `fecha` es la del hecho que abrió la causal. **Las causales no bloquean nada por sí mismas**: quien bloquea es `bloqueadoPorSubsanacion` (`contrato-api-teoria.md` §5.1, decisión M4-12). Una causal es materia del Consejo de Evaluación de Vuelos, no una regla automática — el PDI las lista como «causales para la separación del programa», que es una decisión de un consejo.

**Ninguna de las siete se puede calcular hoy**: todas necesitan historiales de exámenes por asignatura, que son la §5.2 y la dependencia 6. En los mocks las `causales[]` están **fijadas**, no derivadas, y la §9.8 dice de quién y por qué.

### 5.2 `GET /api/cuestionarios` — **nuevo, el historial teórico que M4 recortó**

`Read`; con la dependencia 51, un alumno solo puede pedir el suyo (**403** D11). Reaparece aquí con el id **D14** que `contrato-api-teoria.md:848` retiró al recortarlo.

Filtros: `codAlumno` (obligatorio mientras la 51 no exista), `idMateria` (int), `estado` (`EstadoCuestionario`: `EN_CURSO` o `ENTREGADO`). Paginado con `property` por defecto `"fechaExamen"` y `direction` por defecto **`DESC`** — el único endpoint de este contrato que invierte el `ASC` de `Page_Sort`, porque un historial se lee del último hacia atrás. Propiedades ordenables: `fechaExamen`, `nota`, `materia`, `tipoExamen`.

**200** — `Page` de filas planas:

```json
{
  "content": [
    {
      "id": 2, "idTurnoTeorico": 1, "turnoTeorico": "Mensual Adoctrinamiento de Vuelo",
      "idMateria": 3, "materia": "Adoctrinamiento de Vuelo", "tipoExamen": "MENSUAL",
      "fechaExamen": "2026-09-18", "estado": "ENTREGADO",
      "fechaEntrega": "2026-09-18", "horaEntrega": "08:52",
      "nota": 12.00, "notaMinimaAplicada": 18, "aprobado": false,
      "idTurnoOrigen": null, "turnoOrigen": null,
      "subsanadoPor": { "idTurnoTeorico": 5, "turnoTeorico": "Subsanación Adoctrinamiento de Vuelo", "fechaExamen": "2026-09-26", "estado": "PROGRAMADO", "nota": null }
    }
  ],
  "totalElements": 1, "totalPages": 1, "size": 10, "number": 0
}
```

`idTurnoOrigen`/`turnoOrigen` apuntan **hacia atrás** (la fila es una subsanación o un rezagado y este es su origen) y `subsanadoPor` apunta **hacia adelante** (esta fila fue desaprobada y existe un turno que la subsana). Los dos punteros existen para que la pantalla pueda poner las dos notas una al lado de la otra y decir, con S17, que **prevalece la primera**: una subsanación aprobada no borra el `aprobado: false` de su origen ni lo saca de la media de §3.2.

`nota` y `notaMinimaAplicada` son los que el servidor calculó en M4 (`contrato-api-teoria.md` §4.4) y **el frontend no recalcula ninguno**; los muestra con `textoConMinimo` (`src/lib/dominio/teoria.ts:115-117`). Una fila `EN_CURSO` trae `nota`, `aprobado`, `fechaEntrega` y `horaEntrega` en `null`.

Página vacía → **404** D14, que el frontend muestra como panel vacío.

### 5.3 `GET /api/estado-teorico?codAlumnos=` — **nuevo, la dependencia 56**

`Read`. `codAlumnos` es una lista separada por comas, de **1 a 100** códigos. Devuelve un objeto por alumno, con la misma forma de §5.1 pero **sin `causales[]`** — la pantalla que lo consume es una lista y solo necesita el bloqueo:

```json
[ { "codAlumno": "666666", "alumno": "Ana Torres Martinez", "bloqueadoPorSubsanacion": true, "motivo": "…", "desaprobados": [ … ], "pendientes": [ 5 ] } ]
```

Un código que no existe **se omite del arreglo**, no rompe la respuesta: el llamador es una lista de alumnos que puede haber cambiado entre dos peticiones. Lista vacía de resultados → `200 []`, no 404, porque la pregunta tenía respuesta.

Validación → **400** arreglo:

| Campo | Regla | Mensaje exacto |
|---|---|---|
| `codAlumnos` | al menos un código | `Debe enviar al menos un código de alumno.` (D15) |
| | hasta 100 | `No se pueden consultar más de 100 alumnos a la vez.` (D16) |

**Dos consumidores, no uno.** La pantalla de Escuadrón (columna de estado teórico, S5 cuando falla) y **el formulario de turno práctico de M1**, que hoy pregunta una vez por fila ya agregada (decisión M4-12) y con este endpoint puede marcar a los alumnos bloqueados **antes** de que se elija uno, que era el costo declarado de aquel diferimiento. Si la petición falla, el estado queda **desconocido**: cada fila mantiene su E23 y Guardar sigue permitido, exactamente como M4-12 decidió. Nada se oculta en silencio.

---

## 6. Legajo y ciclo de chequeo

```
GET /api/personas/{cod}/legajo     Read   [NUEVO, dep. 64]
GET /api/personas/{cod}/chequeos   Read   [NUEVO, dep. 65 — y es cambio de esquema antes que ruta]
```

### 6.1 `GET /api/personas/{cod}/legajo` — **nuevo**

**Por qué no sirve lo que hay.** `GET /api/personas/{cod}/alumno` devuelve `DetallePersona` (`grupo/projections/DetallePersona.java:5-20`), que **no trae `codigo`, ni `tipo`, ni `idGrupo`, ni el nombre del grupo, ni los contadores**, y además nombra sus apellidos `APaterno`/`AMaterno` (`:11,13`), distinto de `aPaterno`/`aMaterno` en todas las demás proyecciones (`projections/NombreAlumno.java:9,11`). Los cuatro contadores del ciclo de chequeo (`grupo/entities/Persona.java:41-44`, `schema_prod.sql:220-223`) están hoy solo en dos sitios: `GET /api/grupos/{id}` (`Manage Groups`, `GrupoController.java:87-89`) y el cuerpo 201 de una escritura de persona (`Manage Users`).

**Precisión sobre los permisos, porque es fácil equivocarse aquí:** el **Jefe de Operaciones sí tiene `Manage Groups`** (`security/entities/Role.java:33`), y también tiene `View My Group`, así que es un rol de Seguimiento que **ya puede** leer los cuatro contadores por `GET /api/grupos/{id}`. Quienes no pueden son el **Instructor** y el **Comandante de Escuadrón** (`Role.java:25-29` y `:18-23`), que son precisamente la audiencia del panel de chequeo. Y aun para el Jefe de Operaciones, la forma de `GET /api/grupos/{id}` es la entidad `Grupo` completa con todas sus personas — no una cabecera de legajo —, y responde **200 con cuerpo vacío** para un id inexistente (`GrupoController.java:99-100`, dependencia 18). La dependencia 64 sobrevive por esas dos razones, no por una falta de permiso universal.

El nombre del grupo, además, solo existe en `GET /api/grupos` (`Manage Groups`) y en `GET /api/alumnos/programa/{nombre}` (`Manage Shifts`), y ninguna de las dos es una consulta por persona.

**404** D2 si el código no existe. Con la 51, **403** D11 para un legajo ajeno.

**200:**

```json
{
  "codigo": "777777",
  "nombre": "Carlos", "aPaterno": "Ramirez", "aMaterno": "Sanchez",
  "dni": "78901234", "rango": "Mayor", "tipo": "Alumno",
  "estado": "En Chequeo",
  "grupo": { "id": 4, "nombre": "Grupo 4", "programa": "PDI" },
  "usuario": { "nombre": "alumno.ramirez", "correo": "alumno.ramirez@fap.mil.pe" },
  "contadores": { "chequeo": 4, "evaluaciones": 10, "malos": 3, "regulares": 2 },
  "chequeo": {
    "fase": "Adaptación",
    "criterio": 1,
    "criterioCumplido": true,
    "detalle": "3 vuelos Malos.",
    "regularAlternado": true,
    "cuentaConEsteEstado": false
  },
  "ultimaEvaluacion": { "codigo": "777777-1", "fecha": "2026-09-15", "clasificacion": "Malo", "estadoAlumno": "En Chequeo" }
}
```

`usuario` es `null` para una persona sin cuenta — **no un 500**, que es lo que `DetalleUsuario` hacía antes de la dependencia 26. `grupo` es `null` para un alumno sin grupo, y entonces la pantalla muestra S3.

**El bloque `chequeo` es una lectura, no un cálculo nuevo.** Todo lo que lleva ya está implementado en `evaluacion/utils/TurnoDesaprobado.java` y este endpoint lo expone:

| Campo | De dónde sale |
|---|---|
| `fase` | la `fase` de la última evaluación del alumno (`EvaluacionPractica.fase`) |
| `criterio` | `1` para `Adaptación` y `Operaciones HeliTransportadas`, `2` para `Operaciones AeroTácticas` (`EvaluacionPractica.java:239-246`) |
| `criterioCumplido` | `comprobarCriterio1(contMalo, contRegular)` = `3M · 2M+2R · 1M+4R · 6R` (`TurnoDesaprobado.java:16-21`), o `comprobarCriterio2` = `2M · 1M+2R · 4R` (`:24-28`) |
| `detalle` | qué rama del criterio se cumplió, o qué falta para cumplirlo |
| `regularAlternado` | `esRegularAlternado` = `contRegular == 0 || contRegular % 2 == 0` (`:8-13`): si el próximo `Regular` contará |
| `cuentaConEsteEstado` | **si el estado actual del alumno permite que los contadores se muevan**: `true` solo cuando `estado == "Apto"` |

Las dos reglas del criterio coinciden con `pdi:748-752` (Adaptación y Helitransportadas) y `pdi:780-783` (Aerotácticas) palabra por palabra. **El frontend las muestra y no las recalcula**: el cambio de estado lo decide `ResultadoController` al registrar la próxima evaluación, y la pantalla lo dice en S12.

**`cuentaConEsteEstado` no es un adorno: es la regla que hace que el panel no mienta.** `ResultadoController.saveAll` envuelve **todo** el bloque que incrementa los contadores, escribe el `Desaprobado` y dispara el chequeo en una sola condición: `if (eval.esPonderada() && alumno.esApto())` (`:35`), y `Persona.esApto()` delega en `Estado.esApto`, que es estrictamente `"Apto"` (`grupo/entities/Estado.java:26-28`). De modo que para un alumno que ya está `En Chequeo`, `En Observación` o en cualquier otro estado, **una Ponderada Mala no abre desaprobado, no mueve ningún contador y no dispara nada**; su estado se mueve, si acaso, por las otras ramas (`:51-58` para `En Observación`, `:60-76` para un `Chequeo`, `:78-90` para un `Chequeo Sub Fase`). Sin ese campo, el panel mostraría «criterio cumplido» junto a contadores congelados y el instructor no sabría por qué no pasa nada. Con él, S12 puede decir la verdad: el criterio se cumplió, el estado ya se movió, y los contadores no volverán a moverse hasta que el alumno vuelva a `Apto`.

**Aviso sobre la semilla, que este endpoint hereda:** los contadores de `personas` y las filas de `evaluaciones_practicas` **no cuadran entre sí** en `data_prod.sql`. El alumno `555555` tiene `cont_malo = 1` y `cont_regular = 2` (`:64`) mientras sus cinco evaluaciones son cuatro `Regular` y un `Bueno` (`:177-181`), sin un solo `Malo`. Así que **los contadores son la fuente autorizada para la regla de chequeo y las evaluaciones para el historial**, y las dos cosas pueden no reconciliar. Los mocks mantienen la misma separación (§9.1) y el legajo no intenta cuadrarlas.

### 6.2 `GET /api/personas/{cod}/chequeos` — **nuevo, y es primero un cambio de esquema**

`chequeos_finales` (`schema_prod.sql:134-141`) guarda **un código y cuatro contadores, y nada más**: no tiene fecha, ni resultado, ni tipo de chequeo (`evaluacion/entities/ChequeoFinal.java:23-28`). Se escribe y se borra **solo** desde `ResultadoController`, que es un `@Component` **sin `@RequestMapping` y sin ningún método HTTP** (`:23-24`), a través de un `IChequeoDao` que expone únicamente `findByCodigo` y `deleteByCodigo` (`evaluacion/dao/IChequeoDao.java:7-12`). **No hay ninguna ruta que devuelva un chequeo.**

**Y hay un hecho que cambia lo que la tabla significa.** Las dos únicas escrituras de `ChequeoFinal` están condicionadas a **aprobar**: `:66-72` guarda cuando la evaluación es un `Chequeo`, **no** hay notas bajas y el alumno estaba `En Final`; `:83-89` guarda cuando es un `Chequeo Sub Fase` y **no** hay notas bajas. Y las dos, inmediatamente después, llaman `alumno.setEstado(Apto)` y **`alumno.reiniciarCont()`**, que pone los cuatro contadores a cero (`grupo/entities/Persona.java:229-236`). Consecuencias:

1. **Una fila en `chequeos_finales` significa hoy «chequeo aprobado», nunca «chequeo desaprobado».** Un chequeo malo no deja rastro en esa tabla: mueve el estado (`:74-75` a `En Deliberación`) y nada más.
2. **Una fila implica que los contadores se pusieron a cero justo después.** Así que la foto de contadores que la fila guarda es la de *antes* del reinicio, y los contadores *actuales* del alumno no se pueden derivar del mismo replay que produjo la fila. Por eso la §9.4 **fija** la fila del historial en lugar de derivarla, y lo dice.
3. **Un alumno que está en medio del ciclo no tiene fila.** `777777`, cuyo criterio se cumplió y cuyo estado ya se movió a `En Chequeo`, **no tiene ninguna**: todavía no ha rendido el chequeo. Esto no es un hueco de las fijaciones, es lo que la tabla puede decir.

Así que la dependencia 65 son dos cosas, y en este orden: **añadir las columnas** `fecha` (date), `tipo` (`OPERACIONES` · `COMANDO` · `SUBFASE`, los escalones de `pdi:754-758` y `:793-797`) y `resultado` (`Aprobado` · `Desaprobado`) **y escribir también las filas de los chequeos desaprobados**, que es lo que convierte la tabla en un historial; y **luego** la ruta. Sin lo primero, el panel puede mostrar los chequeos que el alumno pasó y no los que lo llevaron al Chequeo de Comando, que son justamente los que interesan.

**Y un peligro que llega con esas filas nuevas.** `Persona.recuperarCont(ChequeoFinal)` (`grupo/entities/Persona.java:238-245`) hace lo contrario de `reiniciarCont`: **restaura** `contChequeo`, `contMalo` y `contRegular` desde una fila y **suma** su `contEval`. `ResultadoController` lo llama en cuatro sitios (`:166`, `:176`, `:230`, `:240`), siempre para deshacer o rehacer un chequeo. Hoy eso es seguro porque toda fila es un chequeo aprobado; en cuanto existan filas de chequeos desaprobados, **ese camino de restauración no debe recogerlas**, o un chequeo malo devolvería al alumno los contadores que tenía antes de pasar uno bueno. De modo que `resultado` tiene que entrar en la **consulta** que alimenta `recuperarCont`, no solo en la forma de la respuesta.

**200** — arreglo no paginado, ordenado por `fecha` ascendente (un alumno tiene pocos chequeos y la pantalla los muestra como una línea de tiempo):

```json
[
  { "codigo": "555555-2", "fecha": "2024-03-08", "tipo": "SUBFASE", "resultado": "Aprobado",
    "contadores": { "chequeo": 2, "evaluaciones": 5, "malos": 1, "regulares": 2 },
    "codEvaluacion": "555555-2", "idSubfase": 1, "subfase": "Contacto" }
]
```

`contadores` es la **foto** de los cuatro contadores en el momento del chequeo, que es exactamente lo que `ChequeoFinal` ya guarda y para lo que sirve: comparada con los contadores actuales de §6.1, cuenta cuánto se movió el alumno desde entonces — y, cuando el chequeo fue aprobado, explica por qué los actuales son más bajos. `codEvaluacion` es la evaluación de chequeo que la generó (hoy es la clave primaria de la tabla, `schema_prod.sql:139-140`).

Lista vacía → **404** D13, que el frontend trata como panel vacío. **404** D2 si la persona no existe.

### 6.3 Lo que el legajo lee sin pedir nada nuevo — **sin cambios**

Cinco endpoints ya existen y son los que hacen del legajo algo más que una pantalla de contrato. Su detalle validado está en `contrato-api-turnos.md` §2 y §4; aquí solo lo que M5 necesita saber.

| Ruta | Permiso | Qué usa el legajo |
|---|---|---|
| `GET /api/evaluaciones/filter/persona/{cod}?idSubfase=&nombre=&clasificacion=&page=&size=` | `Read` | el historial práctico. `nombre` es el **programa** (def. `"pdi"`), `idSubfase` def. `0`, `clasificacion` se parsea con `Clasificacion.valueOf` y **cualquier valor no exacto se ignora sin 400**. Página vacía → **404** D7 (`contrato-api-turnos.md` §2.3) |
| `GET /api/evaluaciones/{cod}` | `Read` | el detalle de una evaluación con sus `calificaciones[]`, su `estadoAlumno` y su `codEvalPrevia`. **404** D8 (§2.5) |
| `GET /api/evaluaciones/subfase/{id}/persona/{cod}` | `Read` (`EvaluacionController.java:102-103`) | el reporte de subfase: `{cabecera, maniobras, notas}` (§2.2). **Sin handler de mock hasta M5** (§9.9) |
| `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` | `Read` (`:84-85`) | los promedios de la subfase, `[{codigo, promedio}]`, filtrados a `Ponderada` y `Chequeo Sub Fase` (§2.1). **Sin handler de mock hasta M5** (§9.9) |
| `GET /api/turnos/alumno?codAlumno=&page=&size=` | `Read` | los turnos realizados (§1.2) |

Siete avisos sobre estos cinco, dos de ellos correcciones a lo que decían contratos anteriores:

1. **`GET /api/evaluaciones/subfase/…` no responde lo que dice el contrato de M1.** `contrato-api-turnos.md:361` afirma «404 texto plano `"No existen evaluaciones disponibles."` si `reporte == null`». El código llama `response.isNull(nombreLista)` (`EvaluacionController.java:114-115`), y `nombreLista` es la cadena **`"evaluaciones"`** (`:76`), así que lo que sale es **`"evaluaciones especificada no existe."`** — texto mal formado, minúscula y plural. Y es **alcanzable**: `findFirstByIdSubFaseAndCodPersona` devuelve `null` en cuanto el alumno no tiene ninguna evaluación en esa subfase (`evaluacion/services/EvaluacionServiceImpl.java:40-42`), que es el caso normal al abrir el selector de subfases — y con la semilla es el caso de **cuatro de las cinco subfases** para cualquier alumno. Es el mensaje **D6** de la §7, citado verbatim, y el frontend lo trata como «esta subfase no tiene evaluaciones» y **no lo muestra**, precisamente porque está mal formado.
2. **`GET /api/evaluaciones/promedio/subfase/…` nunca devuelve 404.** Su rama `isNull` (`:96-97`) es **muerta**: el servicio devuelve la lista del DAO, que nunca es `null` (`EvaluacionServiceImpl.java:33-36`), así que una lista vacía sale como `200 []`. Lo mismo dice `contrato-api-turnos.md:342`, y esta vez tiene razón.
3. **El endpoint promedio no promedia.** Devuelve la **lista** de los promedios; el frontend calcula su media aritmética y la muestra bajo S9, que dice en la interfaz que es una media simple y **no** la `NSF` del PDI — que pondera cada misión por su coeficiente (`pdi:724-732`) — ni ningún índice derivado de ella (spec M5-4). Es el único número que M5 calcula.

6. **Ninguno de estos cinco endpoints tenía handler de mock para tres de ellos.** `GET /api/personas/{cod}/alumno`, el reporte de subfase y los promedios de subfase están documentados desde M1 y **no existen en `src/mocks/`**; sin handler, la cabecera del legajo, el reporte y la media de S9 no son probables. La §9.9 los fija.

7. **El reporte de subfase depende de que la subfase tenga maniobras, y cuatro de las cinco sembradas no las tienen.** `maniobras_subfase` (`data_prod.sql:25-35`) liga maniobras a las subfases 2, 3 y 4 y **nunca a la 1 ni a la 5**. Como todas las evaluaciones que el mock traía estaban en la subfase 1, el reporte no se podía probar con ellas; por eso las evaluaciones que M5 agrega para `777777` están en la subfase **3** (§9.2).
4. **`GET /api/turnos/alumno` sigue roto.** `TurnoRealizado` proyecta `getCantGrupo()` (`turno/projections/TurnoRealizado.java:19`) contra un `Turno` cuya columna es `cant_alumno` (`schema_prod.sql:281`). Dependencia **12**, abierta desde M1. El panel de turnos muestra el resto de los campos y pone **S11** en lugar de la cantidad de alumnos; no la inventa ni la oculta.
5. **El evaluador no se puede enlazar.** `EvaluacionPractica.codEvaluador` es `@Transient` (`:41-42`) y `evaluaciones_practicas` no tiene columna `cod_evaluador` (`schema_prod.sql:162-180`), así que el valor que se asigna al crear (`EvaluacionController.java:303`) **nunca se guarda** y toda lectura devuelve `null`. Solo sobrevive el texto `evaluador`, armado como `nombre + " " + aPaterno` (`:304`) — sin apellido materno y sin código. El legajo muestra ese texto y **S10** al lado, y no ofrece ningún enlace a la persona del evaluador. No se pide corregirlo: sería una columna nueva y una migración para un enlace que ninguna pantalla de M5 necesita.

---

## 7. Mensajes que el frontend muestra literalmente

Cualquier otro texto del servidor se reemplaza por el genérico y solo va a la consola.

| ID | HTTP | Texto | Donde |
|---|---|---|---|
| D1 | 404 | No existen grupos disponibles. | §1.1, §1.2 (el frontend lo trata como lista vacía; en §1.2 lo muestra como S2) |
| D2 | 404 | Persona especificada no existe. | §3.1, §5.1, §5.2, §6.1, §6.2 |
| D3 | 404 | No existen desaprobados disponibles. | §2.2 (lista vacía) |
| D4 | 404 | Desaprobado especificada no existe. | §2.3, §2.4, y §2.5 después de la corrección |
| D5 | 200 | Desaprobado eliminado con éxito. | §2.5 (plantilla `Response.wasDeleted`). **M5 no llama ese endpoint** |
| D6 | 404 | evaluaciones especificada no existe. | §6.3, reporte de subfase sin evaluaciones. **Verbatim y mal formado** (`isNull(nombreLista)`, `EvaluacionController.java:114-115,76`); el frontend **no lo muestra** y lo trata como subfase sin evaluaciones |
| D7 | 404 | No existen evaluaciones disponibles. | §6.3, historial práctico con página vacía |
| D8 | 404 | Evaluación especificada no existe. | §6.3, detalle de evaluación |
| D9 | 404 | No existen turnos disponibles. | §6.3, turnos del alumno con página vacía |
| D10 | 404 | No existen alertas disponibles. | §2.1 (lista vacía; el frontend muestra S7) |
| D11 | 403 | Solo puede consultar su propio legajo. | §3.1, §5.1, §5.2, §6.1, §6.2, con la dependencia 51 |
| D12 | 404 | No existen alumnos con índices disponibles. | §4.1 (lista vacía; el frontend muestra S25) |
| D13 | 404 | No existen chequeos disponibles. | §6.2 (lista vacía) |
| D14 | 404 | No existen exámenes disponibles. | §5.2 (lista vacía). **Reutiliza el id que `contrato-api-teoria.md:848` retiró** al recortar el historial |
| D15 | 400 | Debe enviar al menos un código de alumno. | §5.3 |
| D16 | 400 | No se pueden consultar más de 100 alumnos a la vez. | §5.3 |
| D17 | 403 | No tiene permiso para ver este grupo. | §2.1, §4.1 |
| D18 | 404 | Grupo especificada no existe. | §2.1, §4.1 (`Response.isNull("Grupo")`) |

**Ids retirados, no reutilizados:** **D19** y **D20** se fueron con la §8. Eran los dos textos del servicio de predicción (`"Alumno no encontrado."` y `"El alumno no tiene evaluaciones registradas."`), que M5 ya no consume; siguen fijados en `contrato-api-aprendizaje.md:434` para quien retome ese servicio.

**Sobre D4, D5 y D18:** `"especificada"` y `"eliminado"` son la plantilla de `Response.java` (`:63-71`), que siempre concuerda así y ya entregó `"Materia eliminado con éxito."` en M2. No se corrige: la consistencia con lo entregado pesa más que la gramática. **D6 es distinto**: no es una plantilla mal concordada sino un mensaje con la cadena equivocada (`nombreLista` donde va `nombreEntidad`), y por eso el frontend lo silencia en lugar de mostrarlo.

Los mensajes de validación de campo (400, arreglo) están en la tabla de cada endpoint y también se muestran literalmente, bajo su campo. Los cuatro mensajes de paginado inválido son los de `contrato-api-matricula.md` › Paginación.

**Ningún mensaje de este contrato es un 409 ni un 410.** M5 no tiene escrituras y por tanto no tiene reglas de estado que rechazar.

## 8. Predicción de riesgo — por qué M5 no la consume

`contrato-api-aprendizaje.md:428-434` reservó `GET /prediction/students` y `GET /prediction/students/{studentId}` para M5 y fijó sus dos mensajes de error. **M5 no las consume, no especifica su forma y no pide ningún cambio en ellas.** Esta sección existe para dejar dicho por qué, con la evidencia, para quien retome ese servicio; no es una especificación y no hay nada que implementar en ella.

La decisión está en spec M5-11 y M5-12 y el análisis completo en spec §17.6. Resumido, con las citas verificadas en `sigeda_chat_status` en el commit `15b4e86`:

1. **Ninguna de las dos rutas autentica ni acota.** `DevAuthMiddleware` se aplica a `'*'` y fija `req.user = { id: '564984ee-448a-424f-b689-57a03b3ea108' }` sin condición (`src/app.module.ts:24`, `src/common/dev-auth.middleware.ts:5-8`), y **ninguna de las dos rutas lee `req.user`** (`src/prediction/prediction.controller.ts:10-20`). El listado además no pagina (`prediction.service.ts:26-69`) y su `instructorId` es un string sin validar (`prediction.controller.ts:11`). Cualquier llamador obtiene el riesgo de todos los alumnos.
2. **No hay manera de nombrar a un alumno de SIGEDA.** `PracticalEvaluation.studentId` es un `@db.Uuid` hacia el `User` de ese repositorio, cuya única clave natural es `email @unique` (`prisma/schema.prisma:56-60,314-320`), mientras el JWT de `sigeda-back` solo trae `sub` = username (`security/config/JwtUtils.java:31-38`). El frontend no puede construir ninguna de las dos formas.
3. **Los datos son sintéticos y desconectados.** Nada en `src/` escribe `PracticalEvaluation`, `ManeuverScore` ni `Maneuver`: el único escritor es el script `src/prediction/seed-prediction-data.ts` (`:134,173,192`), que fabrica tres alumnos (`:39` en adelante) sobre seis nombres de maniobra inventados (`:17-24`).
4. **`currentAverage` no es un promedio.** Es el `overallScore` de la **última** evaluación (`prediction.service.ts:86`), y `currentClassification` es ese único puntaje clasificado (`:87`); igual cada `current` del desglose por maniobra (`:197`).
5. **Los umbrales están anclados donde la escala real no llega.** `classifyScore` corta en `≥16 optimo` y `≥12 regular` sobre una escala que su propio comentario llama «0-20, ajustar según la escala real del programa si difiere» (`engine/risk-classifier.ts:11-17,29-33`), pero `CalculoNota` nunca emite menos de 12 para una evaluación puntuada (`:47-68`): contra datos reales `deficiente` sería inalcanzable y `regular` cubriría 12–15.99.

**Y una advertencia que conviene dejar por escrito aunque ya no pidamos nada.** La versión anterior de este contrato pedía una dependencia (la 69) para que la ruta aceptara un `Persona.codigo` y para recalibrar los umbrales. Esa petición **se retira**, porque sin consumidor no tiene sentido pedirla — pero, sobre todo, porque **concederla sin la dependencia 49 habría empeorado el problema**: hacer la ruta direccionable por un código de seis dígitos, en un servicio que no autentica, la vuelve **trivialmente enumerable** — `111111`, `222222`, `333333`… —, mientras hoy hace falta adivinar un UUID. Quien retome el servicio debe hacer la 49 (acotar, validar y paginar) **antes** o **a la vez** que cualquier cambio en el parámetro, nunca después.

## 9. Datos de los mocks

Los mocks parten de la semilla (`data_prod.sql`) más lo que agregaron M1, M2 y M4 (`src/mocks/sigeda/datos.ts` › `crearDatos`, y `semilla-teoria.ts` › `crearTeoria`) y se reinician por prueba con `reiniciarMocks()`, que `src/test/setup.ts` ejecuta en cada `afterEach`. M5 agrega **ocho** handlers en `src/mocks/sigeda/`:

| Handler | Rutas |
|---|---|
| `seguimiento.ts` | `GET /api/seguimiento/alertas` (§2.1) |
| `desaprobados.ts` | los cinco de §2.2–§2.6 |
| `indices.ts` | `GET /api/personas/{cod}/indices` (§3.1) y `GET /api/reportes/orden-merito` (§4.1) |
| `chequeos.ts` | `GET /api/personas/{cod}/chequeos` (§6.2) |
| `cuestionarios-historial.ts` | `GET /api/cuestionarios` (§5.2) |
| **`alumnos.ts`** | `GET /api/personas/{cod}/alumno` (§6.3) — **no existía** |
| **`reportes-subfase.ts`** | `GET /api/evaluaciones/subfase/{id}/persona/{cod}` y `GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}` (§6.3) — **no existían** |
| `estado-teorico.ts` | ampliado con `causales[]` (§5.1) y la variante en lote (§5.3) |

**`alumnos.ts` y `reportes-subfase.ts` son la corrección más importante de esta sección.** `GET /api/personas/{cod}/alumno`, el reporte de subfase y los promedios de subfase están documentados desde M1 (`contrato-api-turnos.md` §2.1, §2.2 y §4.x) y **ninguno de los tres tiene handler en el repositorio**: `src/mocks/handlers.ts` registra diecisiete conjuntos y ninguno los cubre. Sin ellos, tres criterios de M5 no son probables — la cabecera del legajo (CA-LEG-01), el reporte de subfase (CA-LEG-05) y la media simple de S9 (CA-LEG-06), que es la única cifra Derivada de todo el hito. La §9.9 los fija.

Secuencias: `turnoTeorico` pasa de 6 a **8** y `cuestionario` de 4 a **6** (§9.8 agrega dos turnos teóricos y dos exámenes). Ninguna otra secuencia cambia: nada de M5 se crea desde la interfaz.

Personas y grupos: alumnos `111111` (grupo 1), `222222` (grupo 2), `555555` y `666666` (grupo 3), `777777` (grupo 4), `999999` (grupo 6), `654321` **sin grupo**; instructores `444444` Juan Torres Perez y `888888` Maria Flores Mendoza; grupo 5 sin alumnos. Materias 1–11 con los once coeficientes del PDI.

**Tres de estos datos son invenciones del frontend, no de la semilla** (`docs/decisiones.md` › Datos de prueba): el estado `En Chequeo` de `777777`, la alumna `654321` sin grupo y la evaluación `111111-1`. En `data_prod.sql` todos los alumnos son `Apto`, `654321` no existe y la única persona con evaluaciones es `555555`.

### 9.1 Contadores, estados y un grupo con nombre propio

`PersonaMock` (`src/mocks/sigeda/datos.ts:14-26`) tiene hoy **solo `contEval`**, y las proyecciones de persona y grupo emiten `contChequeo: 0, contMalo: 0, contRegular: 0` a mano (`src/mocks/sigeda/personas.ts:50-56`, `grupos.ts:26-32`). M5 le añade `contChequeo`, `contMalo` y `contRegular` **con los valores de la semilla**, porque son las entradas de la regla de chequeo y hoy el mock y la semilla dicen cosas distintas:

| Alumno | Grupo | Estado | chequeo · eval · malos · regulares | Criterio cumplido | Qué prueba |
|---|---|---|---|---|---|
| `111111` | 1 | Apto | 2 · 5 · 1 · 2 | no | el caso normal; lleva las tres causales teóricas |
| `222222` | 2 | Apto | 3 · 8 · 2 · 3 | no (`malos == 2` exige `regulares == 2`, tiene 3) | el primer puesto del orden de mérito |
| `555555` | 3 | Apto | 2 · 5 · 1 · 2 | no | el legajo completo y la regla del Regular alternado |
| `666666` | 3 | Apto | 1 · 4 · 0 · 1 | no | NFPI incompleto, bloqueo por subsanación, un desaprobado |
| `777777` | 4 | **En Chequeo** | 4 · 10 · **3** · 2 | **sí** (3 Malos) | criterio cumplido **con** el estado ya movido |
| `999999` | **6, «Promoción 2026-A»** | Apto | 3 · 7 · **2** · **2** | **sí** (2 Malos + 2 Regulares) | criterio cumplido **sin** que el estado se haya movido |
| `654321` | — | Apto | 0 · 0 · 0 · 0 | no | sin grupo: no entra en §2.1 ni en §4.1, y su §3.1 viene todo en `null` |

`777777` y `999999` cumplen el criterio con los contadores **de la semilla** (`data_prod.sql:59-69`), no con números inventados, y la pareja es exactamente lo que distingue `ESTADO_CRITICO` de `CHEQUEO_PENDIENTE` (§2.1). **`GET /api/personas/{cod}/legajo` informa estos contadores**, y `criterioCumplido` se calcula sobre ellos; el replay de la §9.3 existe solo para derivar los desaprobados.

**El grupo 6 se renombra a «Promoción 2026-A».** Motivo: hoy los seis grupos se llaman literalmente `Grupo 1`…`Grupo 6`, así que la etiqueta S4 que Escuadrón deriva de `idGrupo` es **indistinguible** del nombre real y CA-SEG-04 no puede fallar nunca. Con el grupo 6 renombrado, Escuadrón muestra «Grupo 6» para `999999` (porque el catálogo de §1 no trae el nombre) y su legajo muestra «Promoción 2026-A» (porque la dependencia 64 sí lo trae): las dos pantallas discrepan a propósito, CA-SEG-04 y CA-LEG-01 se vuelven falsables, y la pareja demuestra para qué existe la dependencia 64. Cuesta ajustar **dos** aserciones existentes: `src/features/turnos-teoricos/formulario-turno-teorico.test.tsx:90` y `src/features/grupos/grupos-page.test.tsx:36`.

**Y hay una tercera prueba que hay que volver a correr aunque no cambie.** `src/mocks/sigeda/cuestionarios-teoria.test.ts:230-242` (CA-RES-10) afirma `[false, null, [], []]` para `999999` entre otros, y los dos turnos teóricos que la §9.8 agrega lo vuelven una aserción con carga: sigue pasando porque `desaprobadosSinSubsanar` (`src/mocks/sigeda/datos.ts:600-616`) exige que la subsanación sea `aprobado === true`, de la misma materia y con `fechaExamen >= ` la del turno desaprobado, y el turno 7 en `hoy − 11` cubre al turno 6 en `hoy − 12`. **Invertir esas dos fechas invierte la aserción sin que nada más avise.**

**Los contadores no cuadran con las evaluaciones, y eso es fiel a la semilla.** `555555` tiene `cont_malo = 1` y ninguna evaluación `Malo` (`data_prod.sql:64` frente a `:177-181`). Los mocks mantienen la separación que describe la §6.1: **contadores para la regla de chequeo, evaluaciones para el historial**, y ninguna prueba intenta reconciliarlos.

**Un aviso que sale de leer el código, no de la semilla:** los contadores de `999999` (2 Malos y 2 Regulares) describen un estado que **`ResultadoController` no puede producir**, porque `esRegularAlternado` congela `contRegular` en 1 (§9.3 y dependencia 71). Como fijación está bien — la semilla es un dato escrito a mano y el criterio la lee tal cual —, pero no se puede llegar a ella volando.

### 9.2 Evaluaciones prácticas — 4 existentes + 8 que M5 agrega

Las cuatro de hoy (`datos.ts:341-452`), todas en fase Adaptación, subfase 1 Contacto:

| Código | Alumno | Fecha | Categoría | Clasificación | Promedio | Previa |
|---|---|---|---|---|---|---|
| `111111-1` | `111111` | 2024-03-01 | Ponderada | Bueno | `'16.5'` | — |
| `555555-1` | `555555` | 2024-03-01 | Ponderada | Regular | `'14.0'` | — |
| `555555-2` | `555555` | 2024-03-08 | Chequeo | Bueno | `null` | `555555-1` |
| `555555-3` | `555555` | 2024-03-15 | Ponderada | Regular | `'15.0'` | `555555-2` |

Las ocho que M5 agrega, cada una con sus seis calificaciones. Los códigos siguen `{codAlumno}-{idTurno}` (`src/lib/dominio/evaluacion.ts:23-25`), así que la tarea de fijaciones agrega los turnos históricos que hagan falta para que estén bien formados.

| Código | Alumno | Fecha | Subfase | Categoría | Clasificación | Promedio | Previa | Para |
|---|---|---|---|---|---|---|---|---|
| `666666-1` | `666666` | `hoy − 30` | 1 Contacto | Ponderada | **Malo** | `'12.0'` | — | un desaprobado por Malo; el segundo alumno del grupo 3 con historial |
| `777777-1` | `777777` | `hoy − 28` | 3 Instrumentos | Ponderada | **Malo** | `'12.0'` | — | primer Malo, siendo `Apto` |
| `777777-2` | `777777` | `hoy − 21` | 3 | Ponderada | **Malo** | `'12.0'` | `777777-1` | segundo Malo |
| `777777-3` | `777777` | `hoy − 14` | 3 | Ponderada | **Malo** | `'12.0'` | `777777-2` | tercer Malo: **cumple el criterio y mueve el estado** |
| `777777-4` | `777777` | `hoy − 7` | 3 | Ponderada | **Malo** | `'12.0'` | `777777-3` | Malo **ya `En Chequeo`**: no abre nada (§9.3) |
| `777777-6` | `777777` | `hoy − 3` | 3 | Ponderada | **Bueno** | `'17.0'` | `777777-4` | da variedad a los promedios de subfase y cumple `pdi:753` (tras un Malo solo Bueno o Malo) |
| `999999-1` | `999999` | `hoy − 20` | 1 Contacto | Ponderada | **Regular** | `'15.0'` | — | un desaprobado por Regular alternado, en un tercer grupo |
| `999999-2` | `999999` | `hoy − 10` | 1 | **Chequeo Sub Fase** | Bueno | `'17.0'` | `999999-1` | la única fila con esa categoría, y la que **deriva** la fila de chequeos (§9.4) |

Por qué `777777` necesita **tres** Malos y no dos Malos con dos Regulares: porque de las cuatro ramas de `comprobarCriterio1` — la que aplica a Adaptación y a Helitransportadas — las **tres** que cuentan Regulares son inalcanzables en un replay (§9.3), y `malos == 3` es la única que queda. Y por qué sus evaluaciones están en la subfase **3** y no en la 1: porque la subfase 1 **no tiene ninguna maniobra** en la semilla (`data_prod.sql:25-35` liga maniobras a las subfases 2, 3 y 4, nunca a la 1), así que un reporte de subfase sobre ella devolvería `maniobras: []` y CA-LEG-05 no sería probable. La subfase 3 tiene las maniobras 9 y 10.

### 9.3 Desaprobados — **derivados**, con la precondición que faltaba

El handler los deriva de las evaluaciones con **la regla completa de `ResultadoController.saveAll`** (`evaluacion/controllers/ResultadoController.java:33-49`), que la primera versión de este contrato citó a medias:

```
si  eval.esPonderada()  Y  alumno.esApto()          ← la condición que faltaba, ResultadoController.java:35
    si eval.esMala()                    → contMalo++,    abre Desaprobado      :37-40
    si eval.esRegular() Y esRegularAlternado → contRegular++, abre Desaprobado :42-45
    si esChequeo(eval, alumno)          → estado = En Chequeo                  :47-48
```

`alumno.esApto()` delega en `Estado.esApto`, que es **estrictamente** `"Apto"` (`grupo/entities/Estado.java:26-28`). Decir «una Ponderada Mala siempre abre un Desaprobado» era falso: **para un alumno que ya no está `Apto` no abre nada, no mueve ningún contador y no dispara ningún chequeo.**

**El replay parte de cero contadores y de estado `Apto`, y es dependiente del orden.** Las dos partes del punto de partida importan. **De cero** porque `ResultadoController` es el único escritor y el mock no tiene historia anterior a sus propias evaluaciones. **Y de `Apto`** porque la guarda de `:35` mira el estado, no los contadores: un autor de handler que tomara el estado inicial de la §9.1 — donde `777777` figura `En Chequeo`, que es una invención del frontend (`docs/decisiones.md:49`) y no de la semilla — obtendría **cero desaprobados para él**, que es exactamente la trampa en la que cayó la versión anterior de esta sección. Los estados de la §9.1 son el resultado del replay, no su entrada.

Es dependiente del orden porque cada paso lee los contadores y el estado que dejó el anterior. El handler recorre las evaluaciones por `fecha` ascendente y, dentro de la misma fecha, por `codigo`. **Todo el estado del replay es por alumno** — los cuatro contadores y el `estado` viven en la `Persona` —, así que intercalar alumnos no cambia ningún resultado; la tabla de abajo está en orden de `fecha`, que es el orden real, y no agrupada por alumno.

La derivación además no es monótona en el backend real: `updateAll` **borra** un Desaprobado cuando una edición quita su causa (`:122-123`) y devuelve el alumno a `Apto` cuando el criterio deja de cumplirse (`:130-131`); M5 no edita evaluaciones, así que el mock solo necesita el camino de alta.

El replay sobre las doce evaluaciones de §9.2:

| # | Fecha | Evaluación | Estado al entrar | Qué pasa |
|---|---|---|---|---|
| 1 | 2024-03-01 | `111111-1` Ponderada Bueno | Apto | ni Malo ni Regular → nada |
| 2 | 2024-03-01 | `555555-1` Ponderada Regular | Apto | `contRegular` 0 es par → alternado → **Desaprobado**, `contRegular` = 1 |
| 3 | 2024-03-08 | `555555-2` Chequeo | Apto | rama `esChequeo()` (`:60-76`): `contChequeo` = 1; **sus seis calificaciones están en el estándar**, así que `hayNotasBajas` es falso, pero no estaba `En Final` → **no** escribe `ChequeoFinal` ni cambia el estado |
| 4 | 2024-03-15 | `555555-3` Ponderada Regular | Apto | `contRegular` 1 es impar → **no** alternado → **nada**. ← la regla del Regular alternado |
| 5 | `hoy − 30` | `666666-1` Ponderada Malo | Apto | **Desaprobado**, `contMalo` = 1. Criterio: `malos == 3`? no |
| 6 | `hoy − 28` | `777777-1` Ponderada Malo | Apto | **Desaprobado**, `contMalo` = 1 |
| 7 | `hoy − 21` | `777777-2` Ponderada Malo | Apto | **Desaprobado**, `contMalo` = 2 |
| 8 | `hoy − 20` | `999999-1` Ponderada Regular | Apto | `contRegular` 0 par → **Desaprobado**, `contRegular` = 1 |
| 9 | `hoy − 14` | `777777-3` Ponderada Malo | Apto | **Desaprobado**, `contMalo` = 3 → `comprobarCriterio1(3, 0)` → **estado = `En Chequeo`** |
| 10 | `hoy − 10` | `999999-2` Chequeo Sub Fase | Apto | rama `esChequeoSubFase()` (`:78-90`): **sus seis calificaciones están en el estándar**, así que `hayNotasBajas` es falso → **escribe `ChequeoFinal`**, estado = `Apto`, `reiniciarCont()` pone los cuatro contadores a cero |
| 11 | `hoy − 7` | `777777-4` Ponderada Malo | **En Chequeo** | la guarda `esApto()` falla → **nada**. ← la precondición |
| 12 | `hoy − 3` | `777777-6` Ponderada Bueno | En Chequeo | igual: nada |

**`hayNotasBajas` es un insumo, no un detalle.** Los pasos 3 y 10 dependen de él y ninguna otra parte de las fijaciones lo fija, así que se dice aquí: las seis calificaciones de `555555-2` y las seis de `999999-2` están **todas en o sobre el estándar**. Si una sola de las de `999999-2` estuviera bajo el estándar, `:80-81` lo pondría `En Complementación` y **no habría ninguna fila de chequeos** en todo el fixture.

**Seis desaprobados**, en cuatro alumnos y tres grupos:

| Código | Alumno | Grupo | Clasificación |
|---|---|---|---|
| `555555-1` | `555555` | 3 | Regular |
| `666666-1` | `666666` | 3 | Malo |
| `777777-1` | `777777` | 4 | Malo |
| `777777-2` | `777777` | 4 | Malo |
| `777777-3` | `777777` | 4 | Malo |
| `999999-1` | `999999` | 6 | Regular |

Suficiente para el filtro por grupo de §2.1, para que `GET /api/desaprobados/persona/777777` devuelva tres filas y `654321` devuelva **404** D3, y para que CA-LEG-07 tenga caso en dos subfases distintas.

**Y un hallazgo del replay que vale una dependencia.** El PDI escribe sus ramas como «calificativos REGULARES **alternados**» (`pdi:750-752`, `:782-783`), y `esRegularAlternado` (`TurnoDesaprobado.java:8-13`) comprueba **la paridad de un contador** — `contRegular == 0 || contRegular % 2 == 0` —, que no es una prueba de que los Regulares alternen con nada. Es además la **única** vía por la que `contRegular` crece (`ResultadoController.java:42-44`, e igual en `updateAll` `:116-118`), así que el contador sube de 0 a 1 y **nunca más**: en 1 la comprobación es falsa, no se incrementa, sigue en 1. Consecuencia: de las **siete** ramas que el PDI define — cuatro en `comprobarCriterio1` (`:16-21`) y tres en `comprobarCriterio2` (`:24-28`) — las **cinco** que cuentan Regulares están muertas (`2M+2R`, `1M+4R`, `6R`, `1M+2R`, `4R`), y solo disparan `malos == 3` y `malos == 2`. No es un contador atascado: es «alternados» mal implementado, y arreglarlo pasa por decidir qué significa sobre la secuencia de clasificaciones del alumno. Es la dependencia **71**.

### 9.4 Chequeos — 1 fila, derivada

Del paso 12 del replay:

| Código | Alumno | Fecha | Tipo | Resultado | Contadores de la foto |
|---|---|---|---|---|---|
| `999999-2` | `999999` | `hoy − 10` | `SUBFASE` | `Aprobado` | 0 · 7 · 0 · 1 |

Es la única fila que el backend real escribiría: `:83-89` solo pide que la evaluación sea un `Chequeo Sub Fase` sin notas bajas. Los contadores de la foto son los del replay **justo antes** del `reiniciarCont()` — `contChequeo` 0 porque la rama de `Chequeo Sub Fase` no lo incrementa, `contRegular` 1 del paso 11 — y `evaluaciones` es el `contEval` que el mock mantiene por su cuenta (`src/mocks/sigeda/evaluaciones.ts:262`).

`777777`, cuyo criterio se cumplió y cuyo estado ya se movió, **no tiene fila**: todavía no ha rendido el chequeo. `555555` tampoco, aunque tenga una evaluación de categoría `Chequeo`, porque no estaba `En Final` (paso 3). Los demás devuelven **404** D13.

**Lo que esta fijación demuestra es justamente lo que falta.** Una sola fila, y de un chequeo **aprobado**, porque hoy no hay ninguna manera de que un chequeo desaprobado llegue a la tabla (§6.2). El panel puede mostrar los chequeos que el alumno pasó y **no** los que lo llevaron al Chequeo de Comando, que son los que interesan. Eso es la dependencia 65, y la fijación es su argumento.

`999999` es además el alumno que satisface CA-LEG-09 y CA-LEG-10 a la vez: tiene fila de chequeo **y** cadena de evaluaciones (`999999-1` → `999999-2` por `codEvalPrevia`). `777777` tiene la cadena más larga (cinco) y el criterio cumplido.

### 9.5 Índices — **fijados, no derivados**, y el contrato dice por qué

El mock **no calcula** los índices: los devuelve fijados. Dos motivos, y uno de ellos no es del software. **Primero**, la mitad práctica no es calculable por nadie mientras falte la tabla de coeficientes de misión del PDI (§3.3 ítem 1), y además las subfases de `NFOH` y `NFOA` no existen en la semilla. **Segundo**, la mitad teórica necesita las siete tablas de la dependencia 6 más una tabla `materias` que `sigeda-back` no tiene.

**Dos formas, las dos en el contrato.** Los mocks devuelven la forma **calculada** que se fija abajo, porque este contrato especifica el endpoint tal como debe quedar una vez implementado; una implementación viva hoy devolvería la forma **`null`** del ejemplo de §3.1, con `nia.motivo` explicando por qué. Las dos son correctas en su momento y las dos están fijadas.

Las cifras por alumno, exactas a dos decimales sin depender de ningún redondeo:

| Alumno | NFAD | NFOH | NFOA | **NIA** | NCT | NEI | **NIT** | **NFPI** |
|---|---|---|---|---|---|---|---|---|
| `222222` | 18.00 | 17.00 | 16.00 | **17.15** | 17.00 | 18.00 | **17.20** | **17.16** |
| `555555` | 17.00 | 16.00 | 15.00 | **16.15** | 18.00 | 16.00 | **17.60** | **16.44** |
| `999999` | 16.00 | 15.00 | 15.00 | **15.40** | 15.00 | 14.00 | **14.80** | **15.28** |
| `111111` | 16.00 | 15.00 | 14.00 | **15.15** | 16.00 | 15.00 | **15.80** | **15.28** |
| `777777` | 13.00 | 13.00 | 12.00 | **12.75** | 14.00 | 13.00 | **13.80** | **12.96** |
| `666666` | 14.00 | **null** | **null** | **null** | 13.00 | 12.00 | **12.80** | **null** |
| `654321` | null | null | null | null | null | null | null | null |

Comprobaciones, para que una prueba pueda repetirlas a mano: `222222` → `18·0.40 + 17·0.35 + 16·0.25 = 7.20 + 5.95 + 4.00 = 17.15`; `17·0.80 + 18·0.20 = 13.60 + 3.60 = 17.20`; `17.20·0.20 + 17.15·0.80 = 3.44 + 13.72 = 17.16`. `999999` → `6.40 + 5.25 + 3.75 = 15.40`; `12.00 + 2.80 = 14.80`; `2.96 + 12.32 = 15.28`. `111111` → `6.40 + 5.25 + 3.50 = 15.15`; `12.80 + 3.00 = 15.80`; `3.16 + 12.12 = 15.28`.

Consecuencias buscadas:

- **`999999` y `111111` empatan en NFPI a 15.28 con NIA distinto** (15.40 frente a 15.15): es el fixture del desempate de §4.1, y lo prueba en su primer nivel (NIA), no en el último.
- **`666666` tiene NIT pero no NIA ni NFPI**: prueba que `null` propaga hacia arriba sin borrar la mitad que sí existe (CA-LEG-14) y que la fila aparece sin puesto en el reporte (CA-REP-05).
- **`654321` viene todo en `null`** con **200**, no 404: prueba que «no calculable» y «no encontrado» son cosas distintas.
- El desglose de cada alumno lleva sus **cinco sub fases de `NFAD`** con los pesos del PDI (0.25 · 0.25 · 0.20 · 0.15 · 0.15) y sus `nsf`, y `NFOH`/`NFOA` con `subfases: []`, porque esas sub fases no existen en la semilla. Un desglose cuyos pesos no sumen 1.00 está mal armado.
- `reduccionPorRezagadoAplicada` es **`false` en todos**, porque la dependencia 70 no existe. Ninguna fijación finge lo contrario.
- Ningún alumno tiene los once `NA`, así que `asignaturasSinNota[]` **nunca está vacío** y la renormalización de §3.3 ítem 5 se ejerce siempre.

### 9.6 Orden de mérito — 5 puestos y 1 sin puesto

Con `programa=PDI` y sin `idGrupo`:

| Puesto | Alumno | Grupo | NFPI | NIA | Nota |
|---|---|---|---|---|---|
| 1 | `222222` | 2 | 17.16 | 17.15 | |
| 2 | `555555` | 3 | 16.44 | 16.15 | |
| 3 | `999999` | 6 | 15.28 | **15.40** | gana el empate por NIA |
| 4 | `111111` | 1 | 15.28 | **15.15** | pierde el empate por NIA |
| 5 | `777777` | 4 | 12.96 | 12.75 | |
| — | `666666` | 3 | null | null | sin puesto, al final, con `motivoSinNfpi` |

`654321` **no aparece**: no tiene grupo. `programa=PDE` → **404** D12, porque todos los grupos sembrados son PDI. Con `idGrupo=3` → `555555` (puesto 1) y `666666` (sin puesto): el **`puesto` se recalcula dentro del alcance pedido**, así que un reporte por grupo empieza en 1. Con `size=6` la lista cabe en una página; con `size=2` son tres páginas y el `puesto` no se reinicia por página.

### 9.7 Alertas — derivadas, salvo las causales

Doce filas, todas derivadas por las reglas de §2.1 excepto las tres causales, que se fijan:

| # | Tipo | Severidad | Alumno | Grupo | Origen |
|---|---|---|---|---|---|
| 1 | `SUBSANACION_PENDIENTE` | **ALTA** | `666666` | 3 | `bloqueadoPorSubsanacion` de M4 |
| 2 | `ESTADO_CRITICO` | MEDIA | `777777` | 4 | `estado = En Chequeo` |
| 3 | `CHEQUEO_PENDIENTE` | MEDIA | `999999` | 6 | contadores 2M+2R con estado `Apto` |
| 4 | `CAUSAL_TEORICO` | MEDIA | `111111` | 1 | `PROMEDIO_ASIGNATURA`, **materia 3** |
| 5 | `CAUSAL_TEORICO` | MEDIA | `111111` | 1 | `PROMEDIO_ASIGNATURA`, **materia 2** ← el mismo código en otra asignatura |
| 6 | `CAUSAL_TEORICO` | MEDIA | `111111` | 1 | `PERIODICOS_GENERALES`, grupo B, materia 2 |
| 7 | `CAUSAL_TEORICO` | MEDIA | `111111` | 1 | `TRES_ASIGNATURAS`, **sin materia** |
| 8 | `VUELO_DESAPROBADO` | BAJA | `555555` | 3 | desaprobado `555555-1` |
| 9 | `VUELO_DESAPROBADO` | BAJA | `666666` | 3 | desaprobado `666666-1` |
| 10–12 | `VUELO_DESAPROBADO` | BAJA | `777777` | 4 | desaprobados `777777-1`, `777777-2`, `777777-3` |
| 13 | `VUELO_DESAPROBADO` | BAJA | `999999` | 6 | desaprobado `999999-1` |

**Trece filas**, con las tres severidades presentes: 1 `ALTA`, 6 `MEDIA`, 6 `BAJA`. Consecuencias buscadas:

- **Las filas 4 y 5 son las que prueban que el `id` sintético no colisiona**, y la versión anterior de estas fijaciones no las tenía: llevaba tres causales de **tres códigos distintos**, de modo que el segmento del código ya las separaba y el `idMateria` de la clave no hacía falta para nada. Con dos `PROMEDIO_ASIGNATURA` en asignaturas distintas, la clave **necesita** la materia o las dos filas colapsan.
- Las cuatro causales cubren además las tres formas de payload: con materia, con grupo **y** materia, y sin ninguna de las dos (`idMateria: null`).
- `777777` tiene **cuatro** alertas (tres desaprobados y su estado) y **ninguna** es `CHEQUEO_PENDIENTE` aunque cumpla el criterio, porque su estado ya se movió; `999999` tiene la `CHEQUEO_PENDIENTE` que él no tiene.
- Los cuatro grupos con alumnos aparecen, así que el filtro por grupo separa. Con `size=10` la lista pagina en **2 páginas** y con `size=6` en 3.
- Un instructor sin `View All Groups` que solo alcanza los grupos 1, 2 y 3 ve **siete** de las trece (las cuatro de `111111`, la de `555555` y las dos de `666666`), que es lo que prueba el alcance de §2.1.
- El orden por defecto pone la de `666666` primera y las seis de vuelo desaprobado al final, lo que prueba que el ordinal de severidad funciona y no el alfabético.
- **Ninguna fila ejerce `ESTADO_CRITICO` en `ALTA` ni en `BAJA`**: el único estado no-`Apto` del fixture es `En Chequeo`, que cae en `MEDIA`. Las otras dos bandas de la tabla de §2.1 se prueban con `server.use(...)` (§9.10).

### 9.8 Estado teórico, causales e historial

Lo de M4 (`contrato-api-teoria.md` §9.3) **no cambia**: `666666` es el único con `bloqueadoPorSubsanacion: true`, con el turno 1 desaprobado (nota 12.00, mínimo 18) y el turno 5 pendiente; el resto viene en `false`.

**Las `causales[]` se fijan, no se derivan**, y es la única fijación de M5 que no tiene forma de derivarse: las siete reglas de §5.1 necesitan historiales de exámenes por asignatura que no existen ni en los mocks ni en la semilla. **Tres** causales, todas en `111111`, elegidas para cubrir las tres formas que una causal puede tener:

| Alumno | `causales` |
|---|---|
| `111111` | **Cuatro.** `PROMEDIO_ASIGNATURA` con `idMateria: 3` («Nota de asignatura 12.50 en Adoctrinamiento de Vuelo, por debajo de 13.»); `PROMEDIO_ASIGNATURA` con `idMateria: 2` («Nota de asignatura 11.80 en Ingeniería del Helicóptero, por debajo de 13.»); `PERIODICOS_GENERALES` con `idMateria: 2` y `grupo` = las cinco asignaturas del grupo B que existen en el catálogo («3 desaprobados consecutivos en periódicos de Ingeniería del Helicóptero.»); `TRES_ASIGNATURAS` con `idMateria: null` y `grupo: null` («3 asignaturas desaprobadas.») |
| todos los demás | `[]` |

Las dos primeras son **el mismo código en dos asignaturas**, que es el caso que obliga a llevar `idMateria` en la clave sintética de §2.1 y el que la versión anterior de estas fijaciones no cubría. Entre las cuatro, `111111` prueba «causal sin bloqueo», las tres formas de payload (con materia, con grupo y materia, sin ninguna) y la colisión de claves; `666666` prueba «bloqueo sin causal». Las otras tres etiquetas — `DOS_EXAMENES`, `SEGUNDA_SUBSANACION`, `PERIODICOS_CRITICOS` — y el `INOPINADOS` se ejercen con `server.use(...)` (§9.10).

**Historial teórico (§5.2).** M5 agrega **dos turnos teóricos** (ids 6 y 7) y **dos exámenes** (ids 4 y 5), para grupo 6, materia 1 Aerodinámica (mínimo 16), de modo que exista una cadena de subsanación **completa** — la de `666666` está pendiente y por tanto no tiene segunda nota:

| Turno | Tipo | Materia | Grupo | Fecha | Origen |
|---|---|---|---|---|---|
| 6 | `TEST` | 1 | 6 | `hoy − 12` | — |
| 7 | `SUBSANACION` | 1 | 6 | `hoy − 11` | turno 6 |

| Examen | Alumno | Turno | Nota | Mínimo | Aprobado |
|---|---|---|---|---|---|
| 4 | `999999` | 6 | **10.00** | 16 | no |
| 5 | `999999` | 7 | **17.00** | 16 | sí |

Historial resultante:

| Alumno | Filas |
|---|---|
| `555555` | turno 1 «Mensual Adoctrinamiento de Vuelo», MENSUAL, `hoy − 7`, ENTREGADO, **20.00**, mínimo 18, aprobado; sin origen y sin `subsanadoPor` |
| `666666` | turno 1, ENTREGADO, **12.00**, mínimo 18, **desaprobado**, con `subsanadoPor` = turno 5, `hoy + 1`, PROGRAMADO, `nota: null` ← subsanación **pendiente** |
| `999999` | turno 6, ENTREGADO, **10.00**, **desaprobado**, con `subsanadoPor` = turno 7 con `nota: 17.00`; y turno 7, ENTREGADO, **17.00**, aprobado, con `idTurnoOrigen: 6` ← cadena **completa**, las dos notas |
| `111111` | turno 3 «Semanal Adoctrinamiento de Vuelo», SEMANAL, `hoy`, **EN_CURSO**, con `nota`, `aprobado`, `fechaEntrega` y `horaEntrega` en `null` |
| `222222`, `777777`, `654321` | ninguna → **404** D14 |

Las dos filas de `999999` son las que prueban CA-LEG-11 y S17: la nota **10.00 es la que prevalece y la que entra en el promedio** (`pdi:683`), la 17.00 levantó el bloqueo y queda como evidencia, y `999999` **no** está bloqueado. `666666` prueba el otro lado: desaprobado con subsanación aún pendiente, y por tanto bloqueado.

### 9.9 Los tres endpoints que no tenían handler

**`GET /api/personas/{cod}/alumno`** (`alumnos.ts`) devuelve `DetallePersona` tal como el backend la serializa, **con sus claves raras incluidas** — `APaterno` y `AMaterno` en mayúscula (`grupo/projections/DetallePersona.java:11,13`) —, para que el adaptador del frontend tenga que tratarlas y CA-LEG-01 lo pruebe:

```json
{ "dni": "78901234", "nombre": "Carlos", "APaterno": "Ramirez", "AMaterno": "Sanchez", "rango": "Mayor", "estado": "En Chequeo",
  "usuario": { "nombre": "alumno.ramirez", "correo": "alumno.ramirez@fap.mil.pe" } }
```

`654321` no tiene cuenta → `usuario: null`. Un código inexistente → **404** D2.

**`GET /api/evaluaciones/subfase/{id}/persona/{cod}`** (`reportes-subfase.ts`). El par que prueba CA-LEG-05 es **(`777777`, subfase 3)**, y es el único que puede: la subfase 1, donde están todas las evaluaciones de `555555`, **no tiene ninguna maniobra** (`data_prod.sql:25-35`), así que su reporte vendría con `maniobras: []`.

```json
{
  "cabecera": { "fase": "Adaptación", "subFase": "Instrumentos", "programa": "PDI", "alumno": "Carlos Ramirez Sanchez" },
  "maniobras": [ { "id": 9, "nombre": "Maniobra 9" }, { "id": 10, "nombre": "Maniobra 10" } ],
  "notas": [
    { "codigo": "777777-1", "categoria": "Ponderada", "clasificacion": "Malo", "promedio": "12.0", "recomendacion": "…",
      "calificaciones": [ { "notaMin": "B", "nota": "I" }, { "notaMin": "B", "nota": "R" } ] }
  ]
}
```

`notas` trae las **cinco** evaluaciones de `777777` en esa subfase, en el orden en que el DAO las devuelve, y cada una sus calificaciones con `notaMin` y `nota`. Un par sin evaluaciones — por ejemplo (`555555`, subfase 2) — responde **404** D6 con su texto mal formado, que el frontend silencia.

**`GET /api/evaluaciones/promedio/subfase/{id}/persona/{cod}`** (mismo handler). Filtrado a `Ponderada` y `Chequeo Sub Fase`, y **nunca 404**: una lista vacía sale como `200 []` (la rama `isNull` de `EvaluacionController.java:96-97` es muerta). Para (`777777`, 3):

```json
[ { "codigo": "777777-1", "promedio": "12.0" }, { "codigo": "777777-2", "promedio": "12.0" },
  { "codigo": "777777-3", "promedio": "12.0" }, { "codigo": "777777-4", "promedio": "12.0" },
  { "codigo": "777777-6", "promedio": "17.0" } ]
```

Cinco promedios cuya media simple es **13.00** exactos (65 ÷ 5), que es la cifra de S9 y la única que M5 calcula. Para (`555555`, 1) son dos filas — `555555-1` 14.0 y `555555-3` 15.0, porque `555555-2` es un `Chequeo` y el filtro lo excluye — con media **14.50**: prueba el filtro por categoría. Para (`999999`, 1) son dos, 15.0 y 17.0, media **16.00**, y una de ellas es la única `Chequeo Sub Fase` del fixture, que prueba el otro brazo del filtro.

### 9.10 Lo que no se fija

Se prueba con `server.use(...)` por prueba, porque las fijaciones por defecto tienen que sostener los caminos felices:

- el escuadrón vacío (D1) y el escuadrón de un instructor sin alumnos (S2);
- la lista de alertas vacía (D10), la de índices vacía (D12) y la de chequeos vacía (D13);
- las **cuatro** etiquetas de causal que el fixture no lleva (`DOS_EXAMENES`, `SEGUNDA_SUBSANACION`, `PERIODICOS_CRITICOS`, `INOPINADOS`);
- las bandas `ALTA` y `BAJA` de `ESTADO_CRITICO`: el fixture solo tiene `En Chequeo`, que es `MEDIA`, así que un alumno `En Deliberación` o `No Apto` (→ `ALTA`) y uno `En Observación` (→ `BAJA`) se devuelven por `server.use(...)`. La tabla de §2.1 cubre los seis estados; las fijaciones por defecto, uno;
- un panel del legajo que falla en su primera carga, uno por uno;
- un `estado-teorico` en lote que no responde (S5) y uno individual que no responde;
- un `GET /api/personas/{cod}/legajo` sin `usuario` y sin `grupo`;
- un 403 D11 o D17 para probar el camino de permiso, y un 403 del panel de desaprobados para un rol sin `View Disapproved` (S29);
- un `GET /api/turnos/alumno` que responde con `cantGrupo` en lugar de `cantAlumno` (S11);
- un `GET /api/personas/{cod}/indices` en la forma **`null`** de §3.1, para probar S14 y `nia.motivo` sobre un alumno que en las fijaciones sí tiene cifras.

**Y una limitación declarada, no un hueco:** el historial práctico de un alumno y sus índices de §9.5 **no son aritméticamente consistentes**. Coinciden en orden — quien tiene desaprobados está abajo, quien no los tiene está arriba — y nada más. La razón está en §9.5: la mitad práctica no es computable por nadie sin la tabla de coeficientes de misión, así que no hay ninguna aritmética que reproducir.

## 10. Dependencias

Numeración de la spec (§10, §13.4, §14.5, §15.5, §16.5 y §17.5). Todas son de `sigeda-back`.

**Qué funciona hoy y qué no.** La pantalla de Escuadrón y **cuatro paneles del legajo** — historial práctico, reporte de subfase, promedios de subfase y vuelos desaprobados — funcionan contra `ec2b0dd` sin ninguna dependencia nueva. Dos de esos endpoints **nunca los ha llamado ninguna pantalla** y **no tenían ni handler de mock**: `contrato-api-turnos.md` §2.1 y §2.2 los documentaron en M1 y quedaron sin consumidor (§9.9). Todo lo demás es contrato. El frontend lo dice en pantalla (S1, S8, S13, S15, S16, S26) y deshabilita cada panel mientras su número no figure en `VITE_DEPENDENCIAS_RESUELTAS`: `verIndices` espera 61 y 62, `verOrdenMerito` espera **6**, 62 y 63, `verAlertas` 66, `verCicloChequeo` 64 y 65, `verHistorialTeorico` 6 y 67, `verCausalesTeoricos` 7 y 68, `verBloqueoTeoricoLote` 7 y 56. Al desplegar una de estas correcciones, avisar para agregar su número.

**Y una que no es de software.** `NIA` no la puede calcular nadie sin la **tabla de coeficientes de misión** del PDI, que el documento promete y no incluye y que no está en el libro de trabajo que lo acompaña (§3.3 ítem 1). Es un dato que la institución tiene que entregar, y va dentro de la dependencia 62 porque sin él la 61 no tiene con qué trabajar.

| # | Cambio | Sección |
|---|---|---|
| 6 (M4) | La API de teoría completa. Sin ella no hay `cuestionarios` ni `materias`, y por tanto no hay NIT, NCT, NEI, NA ni historial teórico. **También bloquea el orden de mérito**, porque sin NIT ninguna fila es rankeable | §3, §4, §5.2 |
| 7 (M4) | `GET /api/personas/{cod}/estado-teorico` | §5.1, §5.3 |
| **8** (paraguas) | NIT / NIA / NFPI y orden de mérito. **Partida aquí en 61, 62 y 63**; 8 sigue siendo el paraguas | §3, §4 |
| 12 (M1) | `TurnoRealizado` proyecta `cantGrupo` contra una columna `cant_alumno`. Abierta desde M1; su consecuencia en M5 es S11 | §6.3 |
| **17** (M1) | `@PreAuthorize` en los cuatro endpoints de `DesaprobadoController` y en `GET /api/subfases/assigned`. **La amplía la 66.** `contrato-api-turnos.md:589` la dejó explícitamente a M5 | §2.2–§2.6 |
| 18 (M1) | `contD` nunca se acumula, así que la rama «todas demostrativas → 20.0» de `CalculoNota` está muerta; y `GrupoController.detail` no hace `return`, así que un id inexistente responde 200 con cuerpo vacío. Lo primero lo hereda cualquier índice calculado sobre `promedio`; lo segundo lo hereda quien lea los contadores por `GET /api/grupos/{id}` | §3.2, §6.1 |
| 19 (M1) | Mojibake del rol Comandante en la semilla y ninguna cuenta con `id_rol = 5`. Sin eso, el único rol con `View All Groups` además del Administrador no puede iniciar sesión contra el backend real | Permisos |
| 20 (M1) | Propiedad del alumno en el servidor: `/api/evaluaciones/**` y `/api/turnos/alumno` solo piden `Read`. La comprobación del frontend es de interfaz | Convenciones, §6.3 |
| 51 (M4) | Resolver quién llama (`sub` → `Usuario` → `Persona.codigo`) y aplicar la propiedad en el servidor. En M5 es lo que convierte D11 en una comprobación real | Convenciones, §3.1, §5, §6 |
| 56 (M4) | `GET /api/estado-teorico?codAlumnos=` en lote. **Se consume aquí por primera vez** | §5.3 |
| 58 (M4) | **Bug:** `GET /api/personas/{cod}/status` devuelve 404 para todo alumno cuyo estado no sea `Apto` **ni `En Observación`** — `puedeSerEvaluado()` es `esApto() || estaEnObservacion()` (`grupo/entities/Estado.java:50-52`), así que falla para cinco de los siete estados, no para los seis no-`Apto`. **M5 no lo llama** y por eso no lo pide: usarlo empeoraría el legajo justo para los alumnos que lo necesitan | — (spec §17.6) |
| **61** | `GET /api/personas/{cod}/indices`: NFPI, NIT, NIA, NA, con el desglose que baja hasta la sub fase, cada valor nullable. **Las diez fórmulas y sus operandos están en el PDI, Título V caps. I–III** (§3.2); lo que falta son los cinco datos de §3.3. Los once coeficientes de asignatura son los del PDI (`pdi:633-669`) y **`sigeda-back` no los guarda: no hay tabla `materias` ni columna `coeficiente` en `src/main`** — llegan con la 6 y la 53. El núcleo de la 8 | §3 |
| **62** | **Esquema y datos, y es prerrequisito de 61 y 63.** (a) `evaluaciones_practicas.promedio` a columna **numérica** (hoy `varchar(255)`), porque ordenar y promediar texto es lexicográfico. (b) `fase` con FK a `fases` (hoy un string denormalizado con sus tres valores escritos a mano en la entidad), porque un renombre rompe en silencio todo agregado por fase. (c) **Los pesos de sub fase del PDI como dato**: 0.25 · 0.25 · 0.20 · 0.15 · 0.15 en Adaptación, 0.30 · 0.30 · 0.40 en Helitransportadas, 0.50 · 0.50 en Aerotácticas (`pdi:698-723`), y qué sub fase corresponde a cada símbolo — el leyendario del PDI está cruzado y la semilla solo tiene cinco sub fases (§3.3 ítem 2). (d) **La tabla de coeficientes de misión**, que el PDI promete y no entrega (§3.3 ítem 1): **sin ella `NSF` no es computable por nadie**, ni por este sistema ni con lápiz | §3.1, §3.2, §4.1 |
| **63** | `GET /api/reportes/orden-merito` con el desempate NFPI ↓ / NIA ↓ / código ↑ — que es de este contrato, porque el PDI no lo define — y los no rankeables al final sin puesto. Se calcula en cada lectura: no devuelve sello de tiempo porque no hay ningún trabajo programado del que colgarlo. **El primer endpoint que `Create Reports` protegería de verdad** | §4.1 |
| **64** | `GET /api/personas/{cod}/legajo`: `codigo`, `tipo`, `idGrupo`, nombre y programa del grupo, los cuatro contadores y el bloque `chequeo` derivado de `TurnoDesaprobado`, incluido `cuentaConEsteEstado`. **Precisión sobre el motivo:** el Jefe de Operaciones **sí** tiene `Manage Groups` (`Role.java:33`) y ya puede leer los contadores por `GET /api/grupos/{id}`; quienes no pueden son el **Instructor** y el **Comandante** (`Role.java:25-29`, `:18-23`), que son la audiencia del panel. Y aun para él, `GET /api/grupos/{id}` devuelve la entidad `Grupo` completa con todas sus personas, no una cabecera de legajo, y responde 200 con cuerpo vacío para un id inexistente (dependencia 18) | §6.1 |
| **65** | `GET /api/personas/{cod}/chequeos`, **y antes las columnas y las filas que le faltan a `chequeos_finales`**: `fecha`, `tipo` (OPERACIONES · COMANDO · SUBFASE) y `resultado`, **y escribir también los chequeos desaprobados**. Hoy la tabla guarda un código y cuatro contadores, no tiene ninguna ruta porque su único escritor es un `@Component` sin `@RequestMapping`, y sus dos escrituras ocurren **solo al aprobar** y van seguidas de `reiniciarCont()` — así que una fila significa «chequeo aprobado» y los chequeos que llevaron al alumno al Chequeo de Comando no dejan rastro (§6.2). **Peligro que traen las filas nuevas:** `Persona.recuperarCont` (`grupo/entities/Persona.java:238-245`), que `ResultadoController` llama en `:166`, `:176`, `:230` y `:240`, **restaura** los contadores desde una fila; en cuanto existan filas de chequeos desaprobados, `resultado` tiene que formar parte de esa consulta o un chequeo malo devolverá contadores que el alumno ya había limpiado | §6.2 |
| **66** | `GET /api/seguimiento/alertas`, **y las dos correcciones de seguridad que arrastra**: (a) `findByCodPersona` es `findByCodigoContaining`, un `LIKE %cod%` sobre el código de la evaluación, así que cualquier titular de `View Disapproved` vuelca los desaprobados de todos los alumnos con un valor de un carácter; (b) los cuatro endpoints sin `@PreAuthorize`, uno de ellos un `DELETE` sin comprobación de existencia que cualquier usuario autenticado, **incluido un Alumno**, puede llamar. Amplía la 17. **Depende además de la 7, la 64 y la 68**, porque tres de los cinco tipos de alerta se derivan del estado teórico, de los contadores y de las causales | §2 |
| **67** | `GET /api/cuestionarios?codAlumno=&idMateria=&estado=`: el historial teórico del alumno, con `idTurnoOrigen` y `subsanadoPor` para poder mostrar las dos notas de una subsanación. Recortado de M4 (spec §16.6 ítem 1); recupera el id **D14**. Amplía la 6 | §5.2 |
| **68** | `causales[]` en `estado-teorico`, con **siete** códigos tomados del PDI Título IV (`pdi:738-745`). Los dos de periódicos cuentan **por grupo de asignaturas** («cualquiera de ellos»), no por asignatura, y se reconcilian con el catálogo de once por pares (asignatura, `tipoExamen`) usando la tabla de periodicidad (`pdi:527-547`); la única ausencia real es **«Instrumentos»**, que el PDI evalúa y nombra y que no está entre las once (§5.1). Amplía la 7 | §5.1 |
| **70** | Inasistencias: `PUT /api/turnos-teoricos/{id}/inasistencias/{codAlumno}`, la columna `inasistencia_justificada` y la reducción del **50 %** del rezagado injustificado. `pdi:558` y `:685` la aplican a **«un test o examen»** sin restringirla a los periódicos, así que afecta a `PT`, a `PE`, y por tanto a `NA` y a `NCT`, además del `NEI`. Recortada de M4 (spec §16.6 ítem 2). **M5 no construye pantalla para esto**: hasta que exista, `reduccionPorRezagadoAplicada` es siempre `false` y ninguna nota se reduce | §3.4 |
| **71** | **Bug, encontrado al derivar las fijaciones de §9.3, y es «alternados» mal implementado antes que un contador atascado.** El PDI escribe sus ramas como «calificativos REGULARES **alternados**» (`pdi:750-752`, `:782-783`), y `esRegularAlternado` (`evaluacion/utils/TurnoDesaprobado.java:8-13`) comprueba **la paridad de un contador** (`contRegular == 0 || contRegular % 2 == 0`), que no prueba que los Regulares alternen con nada. Es además la única vía por la que `contRegular` crece (`ResultadoController.java:42-44`, `:116-118`), así que sube de 0 a 1 y **nunca más**. Consecuencia: de las **siete** ramas que el PDI define — cuatro en `comprobarCriterio1` (`:16-21`) y tres en `comprobarCriterio2` (`:24-28`) — las **cinco** que cuentan Regulares son **inalcanzables** (`2M+2R`, `1M+4R`, `6R`, `1M+2R`, `4R`), y solo disparan `3 Malos` en Adaptación/Helitransportadas y `2 Malos` en Aerotácticas. Arreglarlo pasa por definir «alternados» sobre la secuencia de clasificaciones del alumno, no por cambiar cómo se incrementa un contador. La comparación es además por igualdad estricta (`malos == 3`), inofensivo solo porque el estado se mueve exactamente en 3 | §9.3 |

**Ids retirados:** la **69** se pedía para el servicio de predicción (aceptar un `Persona.codigo` y recalibrar los umbrales) y **se retira con la §8**, sin reutilizar el número. La advertencia de por qué no debe concederse sin la 49 está en §8.

**Lo primero que hay que decidir, antes de escribir una línea de la §3:** los cinco puntos `[CONFIRMAR]` de §3.3. Ninguno es una fórmula — las diez están publicadas — y el primero no lo puede resolver ningún programador: es una tabla que falta en la norma, y sin ella `NIA` y `NFPI` son `null` por mucho que la 61 esté implementada.
