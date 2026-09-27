# Casos de uso: camino feliz y alternativas

**Todo lo de aquí se ejecutó contra el sistema real el 27 sep 2026** — backend Spring sobre
PostgreSQL 16, no mocks. Las respuestas y los mensajes están copiados de lo que devolvió el
servidor, no del contrato. Si un mensaje aquí no coincide con el sistema, el documento está mal.

Cómo leerlo: cada caso lleva su **actor**, su **camino feliz** y una tabla de **alternativas** con
el código HTTP y lo que el usuario ve. Las alternativas están en el orden en que el servidor las
evalúa, que importa: la primera que se cumple es la que responde.

Para levantar el entorno, ver `demo-runbook.md`. Cuentas: contraseña `123` para todas.

---

## 1. Iniciar sesión

**Actor:** cualquiera. **Camino feliz:** `admin.sistema` / `123` → **200** con el token y el
refresh token. El mismo usuario puede entrar **tantas veces como quiera** (eso estaba roto y se
arregló durante esta preparación; ver §9).

| Alternativa | HTTP | Qué pasa |
|---|---|---|
| Contraseña incorrecta | **403** | Cuerpo vacío. La interfaz muestra su propio mensaje de credenciales inválidas |
| Usuario sin rol asignado | **401** | El seed trae `raul.paredes` solo en los mocks; en el backend real no existe |
| Petición sin token a cualquier ruta | **401** | `{"error":"Unauthorized","message":"No authorization token found"}` |
| Token inválido o vencido | **401** | `{"message":"Token is not valid"}` |

---

## 2. Gestionar materias

**Actor:** Administrador Web o Comandante de Escuadrón (permiso `Manage Subjects`).
**Camino feliz:** crear una materia con nombre único, `notaMinima` entera de 0 a 20,
`coeficiente` de 0 a 1 con dos decimales y una `parte` válida → **201**
`{"mensaje":"Materia guardada con éxito.","materia":{…}}`. El índice devuelve las **11** sembradas,
ordenadas por parte y luego por nombre.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Nombre repetido (ignora mayúsculas) | 400 | `'nombre': Ya existe una materia con ese nombre.` |
| `notaMinima` con decimales | 400 | `'notaMinima': La nota mínima debe ser un entero entre 0 y 20.` — **se rechaza, no se trunca** |
| `parte` que no es de las tres | 400 | `'parte': Ingresar parte del curso válida.` |
| Nombre de menos de 3 o más de 60 | 400 | `'nombre': El nombre debe tener entre 3 y 60 caracteres.` |
| Un Alumno intenta crear | **403** | `Acceso denegado · No tienes permisos para realizar esta acción` |
| Borrar una materia que tiene preguntas | **409** | `La materia no se puede eliminar, tiene preguntas o turnos teóricos.` |
| Materia inexistente | 404 | `Materia especificada no existe.` |

Los errores de validación llegan como **arreglo JSON crudo** y la interfaz los reparte por campo.

---

## 3. Registrar un turno práctico

**Actor:** Jefe de Operaciones (permiso `Manage Shifts`).
**Precondición:** **elegir la sub fase 2, 3 o 4.** La semilla solo enlaza maniobras a esas tres;
las sub fases 1 y 5 no tienen ninguna y el selector sale vacío.
**Camino feliz:** nombre de 10 a 30 caracteres, fecha futura, programa, instructor, aeronave, al
menos un alumno con horas `HH:mm` y al menos una maniobra con su nota mínima → **200** con el turno
guardado.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Fecha de hoy o anterior | 400 | `'fechaEval': La fecha del turno debe ser posterior a hoy.` |
| El mismo alumno con horas que se cruzan | 400 | `'alumnosTurno[i].codAlumno': El alumno <cod> tiene un horario que se cruza con otro turno del mismo día.` — **la regla es del alumno, no de la aeronave** |
| Nombre corto y sin maniobras | 400 | dos elementos: `'nombre': Nombre debe tener de 10 a 30 caracteres.` y `'maniobrasTurno': La asignación de maniobras es requerida` |
| Hora con formato inválido | 400 | `'alumnosTurno[0].horaInicio': La hora debe estar en formato HH:mm (09:00, 14:00)` |
| Un Alumno intenta crear | 403 | `Acceso denegado` |
| Modificar o borrar un turno cuya fecha ya pasó | **410** | `No se puede modificar. El turno ya ha sido evaluado.` ⚠️ **el mensaje miente**: la regla es de fecha, no de evaluaciones (`permiteCambios()` es `now().isBefore(fechaEval)`). Está anotado desde M1-7 |

**Cruce de aeronave, no de alumno:** que dos turnos del mismo día usen la misma aeronave a la vez
**se avisa pero se deja guardar** (decisión M1-10): una aeronave se puede reasignar y el Escuadrón
sabe cosas que el sistema no. Que un alumno esté en dos turnos a la vez **se rechaza**, porque es
imposible.

---

## 4. Registrar una evaluación práctica

**Actor:** **el instructor del turno**, y nadie más, para `Ponderada` y `Chequeo Sub Fase`.
**Camino feliz:** entrar como `instructor.perez` (que es el `444444` de los turnos sembrados),
enviar una nota por **cada** maniobra del turno con notas del DIRBE de su nota mínima → evaluación
registrada, con su promedio y su clasificación calculados por el servidor.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| **Cualquier otro usuario**, incluido el Administrador | **403** | `Solo el instructor asignado al turno puede registrar esta evaluación.` — se evalúa **antes que todo lo demás**, y mira **quién llama**, no el `codEvaluador` del cuerpo |
| Nota bajo el estándar sin justificar | 400 | tres elementos: `'calificaciones[0].causa': La causa es requerida para calificaciones bajo el estándar.`, más `observacion` y `recomendacion` |
| Nota que la maniobra no admite | 400 | `{"mensaje":["Las notas con id: 1 no utilizan el sistema de calificación."]}` |
| Faltan calificaciones | 400 | `{"mensaje":"Todas las notas son requeridas."}` |
| Nombre de menos de 10 caracteres | 400 | `'nombre': Nombre debe tener de 10 a 30 caracteres.` |

«Bajo el estándar» es `RI`, `BI` y `BR`, tomado de `Dirbe.calificacionBajoEstandar` y no de una
lista aparte, para que ampliarlo sea un solo cambio.

---

## 5. Gestionar el banco de preguntas

**Actor:** Instructor o Administrador (permiso `Manage Questions`).
**Camino feliz:** el índice devuelve las **24** sembradas con sus cinco filtros combinables
(`idMateria`, `dificultad`, `tipo`, `origen`, `texto`); crear una pregunta con las alternativas que
su tipo exige → **201** `{"mensaje":"Pregunta guardada con éxito.","pregunta":{…}}`.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Opción múltiple sin exactamente 4 alternativas | 400 | `'alternativas': Una pregunta de opción múltiple debe tener exactamente 4 alternativas.` |
| Más de una alternativa correcta | 400 | `'alternativas': Debe marcar exactamente una alternativa como correcta.` |
| `COMPLETAR` sin el marcador `_____` | 400 | `'enunciado': El enunciado de una pregunta de completar debe incluir el marcador _____.` |
| Materia inexistente | **404** | `Materia especificada no existe.` — un id anidado que no existe es 404, no error de campo |
| Borrar una pregunta usada en un turno | **409** | `La pregunta se usa en un turno teórico y no se puede eliminar.` |
| Un Alumno entra al banco | 403 | `Acceso denegado` |

**El filtro `texto` no distingue mayúsculas ni tildes**: buscar `adoctrinamiento` encuentra
`Adoctrinamiento`. Ojo que la vista por defecto (sin filtro) **devolvía 500 en PostgreSQL** hasta
esta preparación; ver §9.

**Modificar una pregunta conserva el `id` de cada alternativa.** No es un detalle interno: la
respuesta del alumno se guarda como el **id** de la alternativa, así que renumerarlas le borraría
la respuesta a quien esté rindiendo, sin aviso.

---

## 6. Programar un turno teórico

**Actor:** Instructor o Administrador (permiso `Manage Exams`).
**Camino feliz:** materia, tipo de examen, fecha y ventana futuras, un grupo **del propio
instructor**, y preguntas de esa materia cuyos puntajes **sumen exactamente 20** → **201**
`{"mensaje":"Turno teórico guardado con éxito.","turnoTeorico":{…}}`.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Los puntajes no suman 20 | 400 | `'preguntas': Los puntajes de las preguntas deben sumar 20.` |
| Ventana de menos de 10 minutos | 400 | `'horaFin': La ventana del examen debe durar al menos 10 minutos.` |
| Grupo que no es del instructor | 400 | `'codInstructor': El grupo no corresponde al instructor.` |
| Modificar o borrar un turno cuya ventana ya empezó | **409** | `El turno teórico ya no se puede modificar: su ventana comenzó.` |
| Fecha y hora de inicio en el pasado | 400 | `El examen debe comenzar en el futuro.` |

Los grupos del instructor se derivan **por los alumnos con los que ya voló**
(`turnos.cod_instructor` → `alumnos_turno` → `personas.id_grupo`), porque **no hay relación
instructor-grupo en el esquema**. El catálogo solo ofrece grupos **con alumnos**, precisamente para
que no se pueda elegir uno que la validación va a rechazar.

---

## 7. Rendir un examen teórico

**Actor:** Alumno (permiso `Take Exams`).
**Camino feliz:** `alumno.lopez` ve su examen pendiente → lo inicia → responde → se autoguarda →
lo entrega → ve su nota, su mínimo aplicado y si aprobó. **Iniciar es idempotente**: recargar la
página retoma el mismo examen con las respuestas guardadas, con **200** en vez de 201.

| Alternativa | HTTP | Mensaje literal |
|---|---|---|
| Pedir los pendientes de otro alumno | **403** | `Solo puede consultar sus propios exámenes.` |
| Iniciarle el examen a otro alumno | **403** | igual — **se comprueba antes** de si está habilitado |
| Iniciar un turno de un grupo que no es el suyo | 403 | `El alumno no está habilitado para este examen.` |
| Iniciar cuando la ventana no abrió o ya cerró | 409 | `La ventana del examen cerró.` |
| Entregar dos veces | 409 | `El examen ya fue entregado.` |
| Ver el examen de otro alumno | **403** | `Solo puede consultar sus propios exámenes.` |
| **El Instructor** ve el examen de cualquiera | **200** | misma ruta, permiso `Manage Exams`: el cuerpo llega **completo** |

**La misma ruta devuelve dos cuerpos distintos según quién pregunta.** Mientras el turno no esté
`FINALIZADO`, el alumno recibe `calificaciones: []` —para no revelar respuestas a quien todavía
rinde— aunque sí recibe su nota; con `Manage Exams` llega el detalle completo en cualquier estado.

**`COMPLETAR` se califica ignorando mayúsculas, tildes, espacios de los extremos y espacios
internos repetidos**: `"Rotor  de   Cola "` acierta `"Rotor de cola"`.

**Si la ventana venció y el alumno cerró la pestaña**, el examen se cierra y se califica solo, la
próxima vez que alguien lo lea, y la hora de entrega que queda registrada es **la del cierre de la
ventana**, no la de la lectura.

---

## 8. Consultar el seguimiento de un alumno

**Actor:** Comandante, Instructor o Jefe de Operaciones (`Read`, con alcance por grupo).
Los dos alumnos del grupo 3 son la historia, y son opuestos a propósito:

| | `555555` Pedro | `666666` Ana |
|---|---|---|
| **`NIT`** | **18.40** | **12.00** |
| `NCT` · `NEI` | 18.00 · 20.00 | 12.00 · 12.00 |
| Causales | ninguna | **`PROMEDIO_ASIGNATURA`** en Adoctrinamiento de Vuelo |
| Bloqueo por subsanación | no | **sí**, 3 exámenes desaprobados |
| `NIA` · `NFPI` | `null` · `null` | `null` · `null` |

| Alternativa | HTTP | Qué pasa |
|---|---|---|
| Un alumno pide el legajo de otro | **403** | `Solo puede consultar su propio legajo.` |
| Un alumno pide **el suyo** | 200 | legajo completo |
| Un alumno sin ningún chequeo | **404** | `No existen chequeos disponibles.` → la interfaz muestra el panel vacío |
| Código de persona inexistente | 404 | `Persona especificada no existe.` |
| Persona que **no es alumno** | **200** | con el bloqueo en `false` y los arreglos vacíos: «no calculable» y «no encontrado» son cosas distintas |
| `NIA` y `NFPI` | 200 | `null`, con `nia.motivo`: `Falta la tabla de coeficientes de misión del PDI: sin ella no se puede calcular ninguna nota de sub fase.` |

**Un índice ausente nunca vale 0.** Cero es una nota posible, y confundir las dos cosas es
exactamente cómo se publica un orden de mérito falso. Por eso `null` se propaga hacia arriba:
sin `NSF` no hay fase, sin fase no hay `NIA`, y sin `NIA` no hay `NFPI` **aunque el `NIT` exista**.

**El orden de mérito está fuera de alcance** mientras falte la dependencia 62; ver el runbook.

---

## 9. Dos defectos que esta preparación encontró

Los dos solo aparecen contra PostgreSQL, y los dos están arreglados y empujados.

1. **Un usuario no podía volver a iniciar sesión.** El primer login de cada usuario funcionaba y
   **todos los siguientes devolvían un 403 con el cuerpo vacío**. `refresh_tokens` es única por
   usuario y el servicio borraba e insertaba en la misma transacción; Hibernate ordena los INSERT
   antes que los DELETE, así que el insert chocaba con la fila que el delete aún no había escrito.
   Faltaba un `flush()`. **Ninguna de las 903 pruebas lo veía porque cada clase se autentica una
   sola vez por usuario** — y la prueba nueva lo reproduce también en H2, así que lo único que hacía
   falta era un segundo login.
2. **El banco de preguntas devolvía 500 en su vista por defecto.** Sin filtro de texto, PostgreSQL
   no puede inferir el tipo del parámetro nulo dentro de `concat()`, lo bindea como `bytea` y
   rechaza la comparación. Faltaba un `cast`. **Aquí H2 sí difiere del motor real**: infiere el tipo
   y responde 200, así que ninguna prueba de la suite podía atraparlo.

## 10. Alternativas que el servidor todavía no cubre

Encontradas probando; **hoy las cubre la interfaz**, así que no se ven en la demostración, pero
existen para cualquier otro cliente:

| Situación | Qué hace hoy | Qué debería hacer |
|---|---|---|
| `horaFin` anterior a `horaInicio` en un alumno del turno | **200, lo guarda** | 400 de campo. La interfaz sí lo valida |
| `codAlumno` inexistente en un turno | **500** con el error de FK de PostgreSQL en el mensaje | 404 o error de campo, y sin filtrar detalle de la base |
| Una ruta que no existe bajo `/api` | **500** «Error inesperado» | 404 |
