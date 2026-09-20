# Contrato API — Aprendizaje (documentos, cuestionarios y consultas)

**Versión:** 1 · 2026-09-20
**Implementa:** `sigeda_chat_status` (NestJS, `:3000`), branch `feat/migracion-sigeda-back` (leído en `15b4e86`)
**Consume:** `sigeda-web` M3. Los mocks MSW (`src/mocks/ia/`) implementan exactamente este documento.
**Para:** quien implementa `sigeda_chat_status`

Fuentes: lectura del código con evidencia archivo:línea (spec §15.1), decisiones M3-1 a M3-16 (spec §15.2) y dependencias 39–50 (spec §15.5). Las rutas de este documento son relativas a la raíz de `sigeda_chat_status`.

Cada sección lleva una etiqueta:
- **Sin cambios** — el backend ya se comporta así; no tocar. Se documenta la forma real porque el frontend la consume.
- **Corrección** — hoy está roto, incompleto o es inseguro; hay que corregirlo.
- **Nuevo** — el endpoint no existe hoy.

Dentro de un endpoint, cada regla que no existe lleva **[Nuevo — dependencia N]** y cada arreglo **[Corrección — dependencia N]**.

La §6 resume dónde el backend de hoy difiere de este contrato y qué hace el frontend mientras tanto.

---

## Convenciones

- **Base.** `http://localhost:3000`, sin prefijo global (`src/main.ts:6-19`): las rutas cuelgan de la raíz (`/documents/upload`, no `/api/documents/upload`). La URL sale de `VITE_IA_API_URL`.
- **Autenticación.** `Authorization: Bearer <access token>` en todas las peticiones (el frontend ya lo envía, `src/lib/api/ia.ts`). Ver §0.
- **CORS.** `origin: true, credentials: true` (`main.ts:16`). El origen `http://localhost:5173` ya queda permitido; el frontend no envía cookies.
- **Cuerpos.** JSON `application/json`, salvo la subida de archivos (multipart, §1.1). `ValidationPipe` global con `whitelist`, `transform` y `forbidNonWhitelisted` (`main.ts:8-13`): **una propiedad no declarada en el DTO devuelve 400**. El frontend envía exactamente los campos de este documento.
- **Ids.** UUID **v4** en todos los recursos. La validación de versión (`@IsUUID('4')`) solo existe en los **cuerpos** de los DTO: ahí un UUID v1 o un texto cualquiera devuelve 400. **En los parámetros de ruta no hay ninguna validación** — ningún `ParseUUIDPipe` en `documents.controller.ts:52,57`, `quiz.controller.ts:19` ni `chat.controller.ts:19` —, así que un id mal formado llega a Prisma contra una columna `@db.Uuid` y **devuelve 500**, no 400 ni 404. Cada endpoint con parámetro de ruta lo repite abajo. **[Corrección — dependencia 47]** Agregar `ParseUUIDPipe` en los cuatro: id mal formado → 400. Los mocks usan ids v4 válidos (§7).
- **Fechas.** ISO-8601 UTC con milisegundos: `"2026-09-18T14:02:11.000Z"`.
- **Envoltura de error.** No existe ningún `ExceptionFilter` (confirmado por grep), así que todo error sale con la forma por defecto de Nest:
  ```json
  { "statusCode": 404, "message": "Documento no encontrado.", "error": "Not Found" }
  ```
  En los fallos de validación de DTO, `message` es un **arreglo** de textos en inglés de class-validator:
  ```json
  { "statusCode": 400, "message": ["questionCount must not be greater than 20"], "error": "Bad Request" }
  ```
  `src/lib/api/errors.ts` ya entiende ambas formas (`statusCode` + `message` texto o arreglo). **[Corrección — dependencia 50]** Traducir esos mensajes al español; mientras tanto el frontend valida lo mismo en el navegador y nunca muestra el arreglo.
- **Listas.** `GET /documents` responde `200 []` cuando no hay nada (no 404, a diferencia de `sigeda-back`). Ningún listado está paginado.
- **Mensajes visibles.** El frontend solo muestra literalmente los mensajes de la §5; cualquier otro texto del servidor se reemplaza por uno fijo y no se registra (M3-5, dependencia 50).
- **Nunca al cliente.** `extractedText`, `storageKey` y `storageUrl` no aparecen en ninguna respuesta de este contrato.

---

## 0. Autenticación — **Corrección** (dependencia 39)

**Hoy.** `DevAuthMiddleware` se aplica a todas las rutas (`src/app.module.ts:23-25`) y fija `req.user = { id: '564984ee-448a-424f-b689-57a03b3ea108' }` ignorando el encabezado `Authorization` (`src/common/dev-auth.middleware.ts:5-8`). No hay ninguna librería de JWT en `package.json`, ni guard, ni columna `username` en `User` (`prisma/schema.prisma:56-74`). **Todas las peticiones son el mismo usuario**, así que los documentos de una persona aparecen en la lista de todas.

**Lo que envía el frontend, hoy y después:** `Authorization: Bearer <token>`, donde el token es el que emite `sigeda-back` en `POST /auth/login`. Es HS256, firmado con la clave de `jwt.secret.key` (codificada en base64), y sus únicos claims son `sub` (el **username**, no un id), `iat` y `exp` (`sigeda-back`, `security/config/JwtUtils.java:31-38`). Caduca a las 24 h; el frontend lo renueva contra `sigeda-back` y reintenta una vez ante un 401.

**Lo que hace falta del lado del servidor:**

1. Reemplazar `DevAuthMiddleware` por un guard que verifique el token con la **misma clave** (variable de entorno nueva, p. ej. `SIGEDA_JWT_SECRET`, con el mismo valor base64 que usa `sigeda-back`) y rechace con `401 {"statusCode":401,"message":"No autorizado.","error":"Unauthorized"}` si falta, está vencido o la firma no coincide.
2. Agregar `username String @unique` a `User` y resolver `sub → User.id`. El token **no trae correo ni nombre**, así que no se puede aprovisionar al vuelo: los usuarios de `sigeda-back` (`usuarios.nombre`) deben existir aquí, sembrados o sincronizados. Un `sub` sin fila → `401` (no 404: para el cliente es un token que no sirve).
3. `req.user.id` se sigue usando como FK de `Document.ownerId`, `Quiz.ownerId` y `ChatSession.userId`; no cambia nada más.

Mientras el guard no exista, el frontend **igual envía el token** (es el mismo cliente HTTP de toda la aplicación), y este servicio lo recibe sin usarlo: queda en sus logs de acceso, en los de cualquier proxy intermedio y en el historial de `docker logs`. Es un token de 24 h válido contra `sigeda-back`, así que conviene implementar la 39 pronto y, mientras tanto, no publicar esos logs.

Hasta que esto exista, el frontend deshabilita **Subir documento** y **Eliminar documento** fuera del modo mock y muestra un aviso de que los documentos son compartidos (spec M3-1).

---

## 1. Documentos

Controlador `src/documents/documents.controller.ts`. Todas las respuestas usan `DocumentResponseDto`, proyectado por `toDocumentResponse` (`src/documents/documents.mapper.ts:9-31`).

### Forma `DocumentResponseDto`

```json
{
  "id": "d0c00000-0000-4000-8000-000000000001",
  "filename": "PDI EA-510 Título III.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 2411008,
  "status": "ready",
  "errorMessage": null,
  "tags": ["autorrotación", "emergencias"],
  "createdAt": "2026-09-18T14:02:11.000Z",
  "processedAt": "2026-09-18T14:02:58.000Z"
}
```

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | string (uuid v4) | no | |
| `filename` | string | no | Nombre original del archivo, con extensión |
| `mimeType` | string | no | Uno de los tres de §1.1. La interfaz lo muestra como etiqueta corta: `application/pdf` → **PDF**, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → **DOCX**, `text/plain` → **TXT**; cualquier otro valor se muestra como "—" |
| `sizeBytes` | number | no | Entero. En la base es `BigInt`; el mapper lo convierte (`documents.mapper.ts:24`) |
| `status` | `"processing" \| "ready" \| "error"` | no | Ver §1.5 |
| `errorMessage` | string | **sí** | Solo con `status: "error"` |
| `tags` | string[] | no | `[]` mientras procesa y si el etiquetado falla |
| `createdAt` | string ISO | no | |
| `processedAt` | string ISO | **sí** | `null` hasta que el documento queda `ready` o `error` |

`extractedText`, `extractedCharCount`, `storageKey`, `storageUrl`, `ownerId` y `updatedAt` **no** salen y no deben agregarse. La misma regla vale para cualquier otra respuesta de este contrato: el frontend nunca muestra texto extraído, claves de almacenamiento ni identificadores de dueño.

### 1.1 `POST /documents/upload` — **Sin cambios** (+ límite nuevo)

```
POST /documents/upload      Content-Type: multipart/form-data
```

- Un solo archivo en el campo **`file`** (`@UseInterceptors(FileInterceptor('file'))`, `documents.controller.ts:26`). El frontend no envía ningún otro campo; los que lleguen se ignoran (no hay DTO).
- Tipos aceptados (`src/documents/dto/document.dto.ts:13-17`, verificados en `documents.controller.ts:31-35`):

  | Extensión | `mimeType` |
  |---|---|
  | `.pdf` | `application/pdf` |
  | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
  | `.txt` | `text/plain` |

- **201** con el `DocumentResponseDto` recién creado, siempre con `status: "processing"`, `tags: []`, `errorMessage: null` y `processedAt: null` (`src/documents/documents.service.ts:30-45`). El archivo ya está guardado; la extracción ocurre después (§1.5).
- **400** `"No se recibió ningún archivo."` — no vino el campo `file` (`documents.controller.ts:29`).
- **400** `` `Tipo de archivo no soportado: ${file.mimetype}. Solo se aceptan PDF, DOCX y TXT.` `` (`documents.controller.ts:32-34`).
- **[Nuevo — dependencia 43]** Límite de tamaño: `FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024 } })` con `MAX_UPLOAD_SIZE_MB` (25, ya documentado en `.env.example:36` y hoy nunca leído). Al excederlo:
  ```json
  { "statusCode": 413, "message": "El archivo supera el tamaño máximo de 25 MB.", "error": "Payload Too Large" }
  ```
  Hoy no hay ningún límite y Multer guarda el archivo completo en memoria antes de cualquier verificación. Ojo: al superar `limits.fileSize`, Nest traduce el error de Multer a un `PayloadTooLargeException` cuyo `message` por defecto está **en inglés** (`"File too large"`); hay que reemplazarlo por el texto de arriba, porque el frontend solo muestra literalmente los mensajes de la §5.
- **[Nuevo — dependencia 43]** Si el navegador envía `mimetype` vacío o `application/octet-stream`, deducir el tipo por la extensión antes de rechazar.

El frontend verifica extensión y tamaño antes de enviar (M3-6), así que en la práctica el 413 y el segundo 400 solo aparecen por un `mimeType` inesperado.

### 1.2 `GET /documents` — **Sin cambios**

```
GET /documents
```

**200** — arreglo de `DocumentResponseDto` del usuario autenticado (`where: { ownerId }`), ordenado por `createdAt` descendente (`documents.service.ts:48-65`). Sin paginación ni filtros. Sin documentos: `200 []`.

Es el endpoint que el frontend consulta en bucle mientras algún documento esté `processing` (§1.5).

### 1.3 `GET /documents/{id}` — **Corrección** (dependencia 47)

```
GET /documents/{id}
```

**200** `DocumentResponseDto`. **404** `"Documento no encontrado."` (`documents.service.ts:69`). Un `{id}` que no es un UUID devuelve hoy **500** (`documents.controller.ts:52`, sin `ParseUUIDPipe`); con la dependencia 47 debe ser 400.

**[Corrección — dependencia 47]** Hoy es `findUnique({ where: { id } })` sin filtrar por `ownerId` (`documents.service.ts:68`): cualquiera puede leer cualquier documento por su UUID. Agregar el filtro por dueño y responder el mismo **404** (no 403) cuando el documento es de otra persona, para no revelar su existencia.

### 1.4 `DELETE /documents/{id}` — **Corrección** (dependencia 47)

```
DELETE /documents/{id}
```

**200** `{"deleted": true}` — no es 204 y tiene cuerpo (`documents.controller.ts:59`). El contrato lo conserva. **404** `"Documento no encontrado."`. Un `{id}` mal formado devuelve hoy **500** (`documents.controller.ts:57`); con la dependencia 47, 400.

El borrado no es transaccional: primero se elimina el objeto del almacenamiento y después la fila (`documents.service.ts:76-77`). Si el almacenamiento falla, la excepción sale como **500** y **la fila queda**, con su archivo posiblemente ya borrado; el frontend deja el documento en la lista y muestra su mensaje genérico. Conviene invertir el orden o tolerar el "no existe" del almacenamiento.

Borra el objeto del almacenamiento y luego la fila; la base propaga en cascada a `DocumentChunk`, `QuizDocument` y `ChatSessionDocument`, y pone `Question.sourceDocumentId` en `null`. **Consecuencias que el frontend advierte antes de confirmar:** una conversación que se queda sin documentos deja de recuperar fragmentos (la búsqueda devuelve `[]` con la lista vacía, `src/chat/retrieval.service.ts:30`) y las citas anteriores ya no se pueden resolver (§3.3); un cuestionario ya generado no se ve afectado, porque sus preguntas se guardaron.

**[Corrección — dependencia 47]** Mismo filtro por dueño que §1.3.

### 1.5 Estados, procesamiento y consulta periódica — **Sin cambios**

- El enum tiene cuatro valores (`prisma/schema.prisma:21-26`) pero **`uploading` es inalcanzable**: la fila se crea ya en `processing` (`documents.service.ts:37`), después de subir el archivo dentro de la misma petición HTTP. Los estados reales son **`processing → ready`** o **`processing → error`**. El frontend dibuja solo tres y trata un eventual `uploading` como `processing`.
- El trabajo lo hace una cola BullMQ (`document-processing`, job `process-document`). El worker descarga el archivo, extrae el texto, genera etiquetas con el LLM y lo indexa para RAG; **el etiquetado y la indexación no son bloqueantes**: si fallan, el documento igual queda `ready` con `tags: []` y sin fragmentos para el chat (`src/documents/document-processing.processor.ts:46-60`). Con un matiz: la indexación está envuelta en su propio `try` en el procesador (`:54-60`), pero **el etiquetado no** — aguanta solo porque `src/documents/document-tagging.service.ts:31-36` atrapa su propia excepción y devuelve `[]`. Si esa captura se quitara, un fallo del LLM dejaría el documento en `error`.
- Si el texto extraído tiene menos de 20 caracteres, el documento queda en `error` con `errorMessage` = `"No se pudo extraer contenido legible del documento (posiblemente escaneado sin OCR)."` (`document-processing.processor.ts:40-44`).
- Cualquier otro fallo queda en `error` con el mensaje crudo de la excepción (`:76-83`). **[Corrección — dependencia 50]** Guardar un texto fijo en español y dejar el detalle solo en el log. El frontend ya reemplaza por un texto propio todo `errorMessage` que no sea el del punto anterior.
- **El worker nunca relanza la excepción**, así que BullMQ da el trabajo por exitoso: un `error` es **terminal**, no se reintenta solo. Volver a intentar = subir el archivo otra vez.
- **No hay webhook, SSE ni websocket.** Recomendación de consulta periódica, que es la que implementa el frontend: `GET /documents` cada **3 s** mientras alguna fila esté `processing`, detenerse al primer estado terminal de todas, y rendirse a los **2 minutos** (40 consultas) ofreciendo un refresco manual.

---

## 2. Cuestionarios

Controlador `src/quiz/quiz.controller.ts`.

### 2.1 `POST /quizzes/generate` — **Sin cambios**

```
POST /quizzes/generate
```

Cuerpo (`src/quiz/dto/generate-quiz.dto.ts:5-20`):

```json
{
  "documentIds": ["d0c00000-0000-4000-8000-000000000001"],
  "questionTypes": ["multiple_choice", "true_false", "fill_blank"],
  "questionCount": 5
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `documentIds` | string[] | al menos 1, cada uno UUID v4 |
| `questionTypes` | string[] | al menos 1, cada uno `multiple_choice`, `true_false` o `fill_blank` |
| `questionCount` | number | entero, mínimo 2, máximo 20 |

Ninguna otra propiedad: `forbidNonWhitelisted` la rechaza con 400. El frontend aplica las mismas tres reglas con zod antes de enviar.

**201** — fila de `Quiz` con sus preguntas ordenadas por `position` (`quiz.service.ts:94-97`):

```json
{
  "id": "c0e50000-0000-4000-8000-000000000001",
  "ownerId": "564984ee-448a-424f-b689-57a03b3ea108",
  "title": "Cuestionario sin título",
  "questionTypes": ["multiple_choice", "true_false", "fill_blank"],
  "requestedCount": 3,
  "modelName": "claude-opus-5",
  "generationPromptVersion": "v1",
  "createdAt": "2026-09-19T09:15:00.000Z",
  "questions": [
    {
      "id": "9e500000-0000-4000-8000-000000000001",
      "quizId": "c0e50000-0000-4000-8000-000000000001",
      "type": "multiple_choice",
      "position": 0,
      "prompt": "¿Qué permite la autorrotación?",
      "options": [
        { "id": "a", "text": "Un descenso controlado sin potencia del motor" },
        { "id": "b", "text": "Aumentar la velocidad de ascenso" },
        { "id": "c", "text": "Mantener el vuelo estacionario indefinidamente" },
        { "id": "d", "text": "Reducir el consumo de combustible en crucero" }
      ],
      "correctAnswer": "a",
      "explanation": "El rotor gira por el flujo de aire ascendente.",
      "sourceDocumentId": null,
      "sourceExcerpt": "…",
      "createdAt": "2026-09-19T09:15:00.000Z"
    }
  ]
}
```

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `title` | string | no | Siempre `"Cuestionario sin título"` (valor por defecto de la columna); el frontend titula la pantalla con los documentos elegidos |
| `ownerId` | string (uuid) | no | Viene porque la respuesta es la fila cruda de Prisma. **El frontend lo ignora y nunca lo muestra**, como `storageKey` o `extractedText` en §1; si el backend prefiere quitarlo, el frontend no se entera |
| `modelName` | string | no | Depende de `LLM_PROVIDER` (`claude-opus-5`, `gemini-2.0-flash`, `qwen3:14b`…). **El frontend no asume ningún valor** y no lo muestra |
| `questions[].options` | arreglo de `{id, text}` \| `null` | **sí** | Exactamente 4 opciones con `id` `"a"`–`"d"` en `multiple_choice`; `null` en los otros dos tipos |
| `questions[].correctAnswer` | string | no | `"a"`–`"d"` en `multiple_choice`; `"true"` o `"false"` (**texto**, no booleano) en `true_false`; texto libre de 1 a 200 caracteres en `fill_blank` |
| `questions[].explanation` | string | **sí** | La columna admite `null`; la generación siempre la exige (1–1000 caracteres), así que en la práctica viene |
| `questions[].sourceDocumentId` | string \| null | **sí** | **Siempre `null`** hoy: la atribución por pregunta no está implementada (`quiz.service.ts:87-90`) |
| `questions[].sourceExcerpt` | string \| null | **sí** | ≤ 500 caracteres; `null` si el modelo no lo dio |
| `questions[].position` | number | no | Índice desde 0, sin huecos |

Reglas del generador que el frontend refleja en la interfaz (`src/quiz/quiz-schema.ts`): en `fill_blank` el `prompt` contiene el marcador literal `_____` (cinco guiones bajos), que la pantalla reemplaza por el campo de texto; en `multiple_choice` `correctAnswer` siempre coincide con el `id` de una de las opciones.

Errores:

- **404** `"Uno o más documentos no existen o no te pertenecen."` — algún id no existe o es de otro dueño (`quiz.service.ts:21-23`).
- **400** `` `Los siguientes documentos aún no están listos: ${nombres}` `` — nombres de archivo separados por `, ` (`quiz.service.ts:25-30`).
- **400** `` `No se pudo generar el cuestionario tras 3 intentos: ${detalle}` `` — el modelo devolvió algo que no cumple el esquema tres veces (`src/quiz/quiz-generation.service.ts:58-60`). **[Corrección — dependencia 50]** El `detalle` es el error crudo de `JSON.parse` o de Zod: dejarlo en el log y responder `"No se pudo generar el cuestionario. Intente nuevamente."`. El frontend ya muestra un texto propio.

**Tiempo.** La generación es **síncrona dentro de la petición**: hasta 3 llamadas al LLM sobre hasta 300 000 caracteres de texto concatenado (`quiz-generation.service.ts:6,12,33-56`), sin cola y sin tiempo máximo. El frontend corta a los **120 s** y ofrece reintentar. **[Nuevo — dependencia 42]** Pasarla a cola como los documentos (`202 {"quizId": "…", "status": "generating"}` + consulta periódica de `GET /quizzes/{id}`) o documentar un presupuesto de tiempo.

### 2.2 `GET /quizzes/{id}` — **Corrección** (dependencias 41 y 47)

```
GET /quizzes/{id}
```

**200** — misma forma que §2.1. **404** `"Cuestionario no encontrado."` (`quiz.service.ts:106`). Un `{id}` que no es un UUID devuelve hoy **500** (`quiz.controller.ts:19`, sin `ParseUUIDPipe`); con la dependencia 47, 400.

- **[Corrección — dependencia 47]** Hoy no filtra por dueño (`quiz.service.ts:102`): agregar `ownerId` y responder 404 para el cuestionario de otra persona.
- **[Nuevo — dependencia 41]** Aceptar `?includeAnswers=false` y omitir `correctAnswer` y `explanation` de cada pregunta. Hoy ambos vienen **siempre**, así que no existe una vista "para rendir".

El frontend usa este endpoint solo para recuperar el cuestionario al recargar la página, y califica en el navegador (spec M3-2); oculta `correctAnswer` y `explanation` hasta que el usuario entrega.

### 2.3 Intentos — **Nuevo** (dependencia 40)

Las tablas `quiz_attempts` y `quiz_attempt_answers` existen (`prisma/schema.prisma:207-241`) y **ninguna ruta las toca**. M3 no consume estos endpoints y los mocks no los implementan: se especifican para que el backend pueda guardar el intento y la nota, y para que una versión posterior del frontend los adopte sin renegociar la forma.

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /quizzes/{id}/attempts` | — | **201** `{"id","quizId","status":"in_progress","startedAt","answers":[]}` |
| `PUT /attempts/{id}/answers` | `{"answers":[{"questionId":"uuid","userAnswer":"a"}]}` | **200** `{"id","status":"in_progress","answeredCount":3,"totalCount":5}` — guarda o reemplaza cada respuesta (único `(attemptId, questionId)`) |
| `POST /attempts/{id}/submit` | — | **200** resultado completo |
| `GET /attempts/{id}` | — | **200** resultado completo si `completed`, o el estado en curso |

Resultado completo:

```json
{
  "id": "…", "quizId": "…", "status": "completed",
  "score": 66.67, "correctCount": 2, "totalCount": 3,
  "startedAt": "…", "completedAt": "…",
  "answers": [
    { "questionId": "…", "userAnswer": "a", "isCorrect": true, "correctAnswer": "a", "explanation": "…" }
  ]
}
```

- `score` es el **porcentaje de aciertos** de 0 a 100 con 2 decimales (cabe en `Decimal(5,2)`). No se usa la escala 0–20 del PDI: el cuestionario de práctica no tiene peso académico.
- `correctAnswer` y `explanation` solo aparecen en la respuesta de `submit`/`GET` de un intento ya entregado.
- Comparación de `userAnswer`, la misma que aplica el frontend hoy: `multiple_choice` y `true_false`, igualdad exacta del texto; `fill_blank`, igualdad tras recortar espacios, pasar a minúsculas, quitar tildes y colapsar espacios internos.
- Errores: **404** `"Cuestionario no encontrado."` / `"Intento no encontrado."`; **400** `"El intento ya fue entregado."` al reenviar; **404** si el intento es de otra persona.

### 2.4 `GET /quizzes` — **Nuevo** (dependencia 48, opcional)

No existe, y por eso M3 no ofrece "Mis cuestionarios". Forma propuesta: **200** `[{"id","title","createdAt","requestedCount","questionCount","documents":[{"id","filename"}]}]` del usuario autenticado, más reciente primero. Junto con la atribución por pregunta (`sourceDocumentId`, hoy siempre `null`) queda para una versión posterior.

---

## 3. Consultas (chat con RAG)

Controlador `src/chat/chat.controller.ts`. Recuperación: embeddings Voyage (`voyage-3`, 1024 dimensiones) y búsqueda pgvector por distancia coseno, `TOP_K = 6` y umbral de similitud `0.5` (`src/chat/retrieval.service.ts:13,16,38-68`). Si ningún fragmento supera el umbral, `sources` viene vacío y el modelo recibe un contexto que dice que no encontró nada (`src/chat/chat-prompt.ts:29-31`).

### 3.1 `POST /chat/sessions` — **Corrección** (dependencia 45)

```
POST /chat/sessions
```

Cuerpo (`src/chat/dto/chat.dto.ts:3-12`):

```json
{ "documentIds": ["d0c00000-0000-4000-8000-000000000001"], "title": "Emergencias" }
```

| Campo | Tipo | Regla |
|---|---|---|
| `documentIds` | string[] | al menos 1, UUID v4, propios y en `ready` |
| `title` | string | opcional. **El frontend nunca lo envía**: deja que se aplique el valor por defecto `` `Consulta sobre ${nombres de archivo}` `` (`chat.service.ts:39`) y muestra ese título. Por eso `title` en la respuesta **no es nulo** |

**201** — forma del contrato:

```json
{
  "id": "5e550000-0000-4000-8000-000000000001",
  "title": "Consulta sobre PDI EA-510 Título III.pdf",
  "createdAt": "2026-09-19T10:30:00.000Z",
  "documents": [ { "id": "…", "filename": "…", "mimeType": "…", "sizeBytes": 2411008, "status": "ready", "errorMessage": null, "tags": [], "createdAt": "…", "processedAt": "…" } ]
}
```

**[Corrección — dependencia 45]** Hoy la respuesta es `include: { documents: { include: { document: true } } }` (`chat.service.ts:44`), es decir el arreglo de filas de la tabla puente con la fila cruda de `Document` adentro. Eso:

1. **falla siempre con 500**: `Document.sizeBytes` es `BigInt` (`prisma/schema.prisma:87`) y `JSON.stringify` no lo sabe serializar — el mismo fallo que `documents.mapper.ts:3-8` dice haber corregido para `/documents/*`. Como el DTO exige al menos un documento, **ninguna sesión se puede crear ni leer**;
2. filtra `extractedText` (puede pesar megabytes) y `storageKey`.

Corrección: aplanar a `documents: DocumentResponseDto[]` pasando cada documento por `toDocumentResponse`. `userId` no se devuelve (el cliente ya sabe quién es). Los mocks implementan **solo** esta forma: la actual no llega a serializarse nunca, así que no hay nada que tolerar.

**Efecto secundario que conviene atender junto con la corrección:** el `create` ya escribió la sesión y sus filas puente cuando la serialización falla (`chat.service.ts:36-45`), así que cada intento contra el servidor real **deja una sesión huérfana** — sin mensajes y sin forma de recuperarla, porque §3.3 falla igual — en la cuenta compartida. Al implementar la 45 conviene limpiar las sesiones sin mensajes que hayan quedado.

Errores: **404** `"Uno o más documentos no existen o no te pertenecen."` (`chat.service.ts:26`); **400** `` `Los siguientes documentos aún no están listos: ${nombres}` `` (`:31-33`).

### 3.2 `POST /chat/messages` — **Sin cambios**

```
POST /chat/messages
```

Cuerpo (`chat.dto.ts:14-21`): `{ "sessionId": "uuid v4", "message": "texto" }` (`message` mínimo 1 carácter).

**201**:

```json
{
  "message": {
    "id": "3e550000-0000-4000-8000-000000000002",
    "sessionId": "5e550000-0000-4000-8000-000000000001",
    "role": "assistant",
    "content": "La autorrotación permite un descenso controlado sin potencia [1]. El régimen de rotor se mantiene con el flujo ascendente [1][2].",
    "citedChunkIds": ["cc000000-0000-4000-8000-000000000001", "cc000000-0000-4000-8000-000000000002"],
    "createdAt": "2026-09-19T10:31:12.000Z"
  },
  "sources": [
    {
      "referenceNumber": 1,
      "documentId": "d0c00000-0000-4000-8000-000000000001",
      "documentFilename": "PDI EA-510 Título III.pdf",
      "excerpt": "La autorrotación es la condición de vuelo en la que…",
      "similarity": 0.812
    }
  ]
}
```

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `message.role` | `"assistant"` | no | Es texto libre en la base, no un enum; aquí siempre `assistant` |
| `message.citedChunkIds` | string[] (uuid) | no | Ids de fragmentos, en el mismo orden que `sources`. El frontend no los usa |
| `sources` | arreglo | no | Puede ser `[]`; máximo 6 (`TOP_K`) |
| `sources[].referenceNumber` | number | no | Empieza en 1 y corresponde a los `[n]` del `content` **de esta respuesta** |
| `sources[].excerpt` | string | no | Primeros 300 caracteres del fragmento (`chat.service.ts:137`) |
| `sources[].similarity` | number | no | 0 a 1, 3 decimales. El frontend lo muestra como porcentaje |

Detalles que el frontend da por ciertos:

- **El mensaje del usuario no vuelve en la respuesta**; se guarda en el servidor (`chat.service.ts:67-69`) y el cliente ya lo tiene. El historial que se envía al modelo son los últimos 8 turnos **anteriores** a la pregunta actual (`chat.service.ts:10,72-75`).
- **Nadie verifica que los `[n]` del texto correspondan a `sources`**: es una convención del prompt (`chat-prompt.ts:13-21`). El frontend solo convierte en enlace los marcadores con `1 ≤ n ≤ sources.length` y deja el resto como texto.
- **Un fallo del modelo no es un error HTTP**: se responde 201 con `content` = `"No se pudo generar una respuesta. Intenta reformular tu pregunta."` y `sources` con lo que se hubiera recuperado (`chat.service.ts:98-99`).
- **Un fallo de la recuperación (embeddings) no deja nada escrito**: ocurre en `chat.service.ts:64`, antes de guardar la pregunta en `:67`, y hoy es el único paso que puede fallar la petición — el error del modelo está atrapado (`:98-99`) y la respuesta se escribe al final (`:103`). Por eso el frontend reenvía la misma pregunta tras un error. **Un fallo entre `:67` y `:103` sí dejaría la pregunta guardada** y el reintento la duplicaría; si se agrega algún paso ahí (o se invierte el orden), avisar, porque el cliente no puede distinguir los dos casos.

### 3.3 `GET /chat/sessions/{id}` — **Corrección** (dependencias 45 y 46)

```
GET /chat/sessions/{id}
```

**200** — forma del contrato:

```json
{
  "id": "5e550000-0000-4000-8000-000000000001",
  "title": "Consulta sobre PDI EA-510 Título III.pdf",
  "createdAt": "2026-09-19T10:30:00.000Z",
  "documents": [ { "id": "…", "filename": "…", "…": "DocumentResponseDto" } ],
  "messages": [
    { "id": "…", "sessionId": "…", "role": "user", "content": "¿Qué es la autorrotación?", "createdAt": "…", "sources": [] },
    { "id": "…", "sessionId": "…", "role": "assistant", "content": "…[1]…", "createdAt": "…",
      "sources": [ { "referenceNumber": 1, "documentId": "d0c0…", "documentFilename": "PDI EA-510 Título III.pdf", "excerpt": "…", "similarity": null } ] }
  ]
}
```

Mensajes ordenados por `createdAt` ascendente. **404** `"Sesión de chat no encontrada."` tanto si no existe como si es de otro usuario (ya verificado, `chat.service.ts:126-128`). Un `{id}` que no es un UUID devuelve hoy **500** (`chat.controller.ts:19`, sin `ParseUUIDPipe`); con la dependencia 47, 400. Hasta la dependencia 45, **cualquier** id válido de una sesión existente también devuelve 500.

- **[Corrección — dependencia 45]** Mismo aplanado de `documents` que §3.1: hoy `chat.service.ts:123` devuelve la fila cruda y el endpoint responde **500** para cualquier sesión con documentos, es decir para todas.
- **[Nuevo — dependencia 46]** Resolver `citedChunkIds` a `sources` en cada mensaje: `JOIN document_chunks` con `documents.filename`, conservando el orden del arreglo, `referenceNumber` desde 1 y `excerpt` con los primeros 300 caracteres. **`similarity` es `null`**: la similitud dependía de la pregunta y no se guarda. Un fragmento ya borrado (porque se eliminó su documento) conserva su lugar con `documentId: null`, `documentFilename: null` y `excerpt: null`, para que la numeración de los `[n]` siga cuadrando.
- `citedChunkIds` puede seguir viniendo; el frontend no lo lee. `userId` no se devuelve.

Mientras la dependencia 46 no exista y los mensajes lleguen sin `sources`, el frontend muestra los `[n]` de las respuestas anteriores como texto y lo advierte en pantalla (spec M3-10).

### 3.4 `GET /chat/sessions` — **Nuevo** (dependencia 44, opcional)

No existe: `ChatController` solo tiene crear sesión, leer una sesión y enviar un mensaje (`chat.controller.ts:9-27`). Por eso M3 no ofrece historial de conversaciones y la sesión solo se recupera por su identificador en la URL. Forma propuesta: **200** `[{"id","title","createdAt","messageCount","documentCount"}]` del usuario autenticado, más reciente primero.

---

## 4. Predicción de desempeño — fuera de M3

`GET /prediction/students` y `GET /prediction/students/{studentId}` las consume **M5**, no M3; su forma se fija cuando se escriba esa etapa. Lo que sí es urgente y no puede esperar:

**[Corrección — dependencia 49]** Ninguna de las dos rutas lee `req.user` y `instructorId` es un `@Query()` sin validación (`src/prediction/prediction.controller.ts:10-20`): cualquiera puede enumerar el riesgo y el historial de todos los alumnos. Hace falta restringirlas al alcance de quien llama (un instructor ve su grupo, el comandante ve todos, un alumno solo a sí mismo), validar `instructorId` como UUID y paginar la lista.

Mensajes ya existentes, por si se reutilizan: **404** `"Alumno no encontrado."` (`prediction.service.ts:73`), **400** `"El alumno no tiene evaluaciones registradas."` (`:82`).

---

## 5. Mensajes que el frontend muestra literalmente

Cualquier otro texto del servidor se reemplaza por uno fijo del frontend y no se registra (spec M3-5).

| ID | Estado | Texto exacto | Origen |
|---|---|---|---|
| C1 | 400 | No se recibió ningún archivo. | `documents.controller.ts:29` |
| C2 | 400 | Tipo de archivo no soportado: `{mimeType}`. Solo se aceptan PDF, DOCX y TXT. | `documents.controller.ts:32-34` |
| C3 | 404 | Documento no encontrado. | `documents.service.ts:69,75` |
| C4 | `errorMessage` | No se pudo extraer contenido legible del documento (posiblemente escaneado sin OCR). | `document-processing.processor.ts:41-43` |
| C5 | 404 | Uno o más documentos no existen o no te pertenecen. | `quiz.service.ts:22` · `chat.service.ts:26` |
| C6 | 400 | Los siguientes documentos aún no están listos: `{archivos}` | `quiz.service.ts:27-29` · `chat.service.ts:31-33` |
| C8 | 404 | Cuestionario no encontrado. | `quiz.service.ts:106` |
| C9 | 404 | Sesión de chat no encontrada. | `chat.service.ts:58,127` |
| C10 | 201 (como contenido de la respuesta) | No se pudo generar una respuesta. Intenta reformular tu pregunta. | `chat.service.ts:99` |
| C13 | 413 | El archivo supera el tamaño máximo de 25 MB. | **[Nuevo — dependencia 43]**; hoy no existe |

C2, C6 y C13 llevan datos variables o se comparan por prefijo; el frontend las reconoce por su comienzo fijo (`Tipo de archivo no soportado:`, `Los siguientes documentos aún no están listos:`, `El archivo supera el tamaño máximo`) y el resto por igualdad exacta. La comparación se hace sobre el mensaje ya normalizado por `src/lib/api/errors.ts`, no sobre el cuerpo crudo.

C7 (`No se pudo generar el cuestionario tras 3 intentos: …`, `quiz-generation.service.ts:58-60`) **no** está en la lista: lleva el error técnico adentro. Al corregirse con la dependencia 50 pasa a mostrarse. Si se agregan o cambian mensajes, avisar: el frontend los tiene en una lista cerrada.

---

## 6. Diferencias entre este contrato y el backend de hoy

| Endpoint | Hoy | Contrato | Qué hace el frontend mientras tanto |
|---|---|---|---|
| Todas | Un único usuario fijo, se ignora el `Authorization` (y queda en los logs del servicio) | Guard JWT compartido con `sigeda-back` (dep. 39) | Envía el token igual; fuera del modo mock deshabilita subir y eliminar, y avisa que los documentos son compartidos. Generar cuestionarios y abrir consultas sí funcionan: sus filas no las lista ningún endpoint |
| Parámetros de ruta | Sin `ParseUUIDPipe`: un id mal formado devuelve 500 | 400 (dep. 47) | Solo abre ids con forma de UUID salidos de sus propias listas o de la URL ya validada por zod |
| `POST /documents/upload` | Sin límite de tamaño | 413 a los 25 MB (dep. 43) | Verifica extensión y tamaño en el navegador antes de enviar |
| `GET`/`DELETE /documents/{id}`, `GET /quizzes/{id}` | Sin filtro por dueño | Filtro por dueño, 404 ajeno (dep. 47) | Solo abre ids salidos de sus propias listas |
| `Document.errorMessage` | Texto crudo de la librería | Texto fijo en español (dep. 50) | Muestra C4 tal cual; cualquier otro motivo se reemplaza |
| `POST /quizzes/generate` | Síncrono, sin tiempo máximo; 400 con el error técnico | Cola opcional (dep. 42); mensaje limpio (dep. 50) | Espera bloqueante explicada, corte a los 120 s, mensaje propio |
| `GET /quizzes/{id}` | Siempre con `correctAnswer` y `explanation` | `?includeAnswers=false` (dep. 41) | Califica en el navegador y no muestra las respuestas antes de entregar |
| Intentos de cuestionario | No existen | §2.3 (dep. 40) | No los llama; la nota no se guarda |
| `POST /chat/sessions` | 500 por `BigInt` **después** de crear la fila, así que deja sesiones huérfanas; filtra `extractedText` y `storageKey` | `documents` aplanado a `DocumentResponseDto[]` (dep. 45) y limpieza de las sesiones sin mensajes | Los mocks implementan solo la forma corregida; contra el servidor real la pantalla no funciona |
| `DELETE /documents/{id}` | Borra en el almacenamiento y luego la fila, sin transacción | Tolerar el fallo del almacenamiento o invertir el orden | Ante el 500 deja el documento en la lista |
| `GET /chat/sessions/{id}` | 500 por `BigInt`; mensajes sin fuentes | Aplanado (dep. 45) + `sources` por mensaje (dep. 46) | Un error al recuperar muestra "no se pudo recuperar la conversación"; sin `sources`, los `[n]` quedan como texto |
| `GET /chat/sessions` | No existe | §3.4 (dep. 44) | Sin historial; la sesión vive en la URL |
| `GET /quizzes`, `sourceDocumentId` | No existe / siempre `null` | §2.4 (dep. 48) | Sin "Mis cuestionarios"; no nombra el documento de cada pregunta |
| `/prediction/**` | Sin alcance ni validación | Restringido y paginado (dep. 49) | No se consume en M3 |
| Validación de DTO | Mensajes en inglés de class-validator | Mensajes en español (dep. 50) | Valida lo mismo con zod y muestra sus propios textos |

---

## 7. Datos de los mocks

Todos los ids son UUID **v4** válidos (los DTO validan la versión). Usuario: el mismo que fija el middleware, `564984ee-448a-424f-b689-57a03b3ea108`.

**Estado y reinicio.** Algunos mocks son *stateful* (el contador de consultas de un documento, las sesiones creadas durante la prueba). El contador es **por documento y se cuenta desde su propia creación**: cada respuesta de `GET /documents` o `GET /documents/{id}` en la que ese documento aparece todavía en `processing` suma uno. `src/mocks/ia/` expone `reiniciarIaMock()`, que `reiniciarMocks()` (`src/mocks/reiniciar.ts`) llama y `src/test/setup.ts:47` ya ejecuta en cada `afterEach`: vuelve a los documentos, cuestionarios y conversaciones de este apartado y pone todos los contadores en cero.

### 7.1 Documentos

`GET /documents` los devuelve en este orden (`createdAt` descendente):

| Id | `filename` | `mimeType` | `sizeBytes` | `status` | `tags` | Para |
|---|---|---|---|---|---|---|
| `d0c00000-0000-4000-8000-000000000006` | Reglamento de operaciones.pdf | `application/pdf` | 3 145 728 | `processing` **para siempre** | `[]` | CA-DOC-06: nunca termina, así que la consulta periódica llega al tope de 40 |
| `d0c00000-0000-4000-8000-000000000004` | Apuntes de aerodinámica.txt | `text/plain` | 12 288 | `processing` → `ready` | `[]` → `["aerodinámica"]` | CA-DOC-04: pasa a `ready` en su **tercera** consulta |
| `d0c00000-0000-4000-8000-000000000003` | Manual de vuelo escaneado.pdf | `application/pdf` | 5 242 880 | `error` | `[]` | CA-DOC-05: `errorMessage` = C4 |
| `d0c00000-0000-4000-8000-000000000002` | Procedimientos de emergencia.docx | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 184 320 | `ready` | `["emergencias", "autorrotación"]` | Segundo documento listo: cuestionarios y consultas con dos documentos |
| `d0c00000-0000-4000-8000-000000000001` | PDI EA-510 Título III.pdf | `application/pdf` | 2 411 008 | `ready` | `["instrucción", "maniobras"]` | Documento principal |

`createdAt` entre `2026-09-18T14:02:11.000Z` (el `…0001`) y `2026-09-19T08:00:00.000Z` (el `…0006`); `processedAt` no nulo solo en los `ready`.

Consecuencia querida del `…0006`: con las fijaciones por defecto **la lista nunca queda sin filas en `processing`**, que es justo lo que CA-DOC-06 necesita. La prueba de que el intervalo se detiene al llegar a un estado terminal usa un `server.use(...)` con solo filas terminales.

| Caso | Detalle |
|---|---|
| Subida correcta | **201** con `status: "processing"` e id `d0c00000-0000-4000-8000-000000000005`, `createdAt` = ahora (encabeza la lista); pasa a `ready` en su tercera consulta, con su propio contador |
| Subida rechazada | Un archivo `image/png` devuelve C2 con ese `mimeType`; sin campo `file`, C1 |
| Tamaño excedido | Un archivo de más de 25 MB devuelve **413** con C13 (el frontend normalmente lo corta antes, A11) |
| Detalle | `GET /documents/{id}` devuelve el documento y suma al contador si está `processing`; cualquier otro UUID v4 devuelve C3 |
| Eliminar | `DELETE` responde siempre `{"deleted": true}` y saca el documento de la lista; un id desconocido devuelve C3 |
| Sin documentos (CA-DOC-01) | No hay fijación: se prueba con `server.use(...)` devolviendo `200 []` |

### 7.2 Cuestionarios

Cuestionario fijo `c0e50000-0000-4000-8000-000000000001`, con tres preguntas, una de cada tipo:

| Id | `type` | `correctAnswer` | Nota |
|---|---|---|---|
| `9e500000-0000-4000-8000-000000000001` | `multiple_choice` | `"a"` | Cuatro opciones `a`–`d` |
| `9e500000-0000-4000-8000-000000000002` | `true_false` | `"true"` | Sin `options` (`null`) |
| `9e500000-0000-4000-8000-000000000003` | `fill_blank` | `"autorrotación"` | El `prompt` contiene `_____` |

`POST /quizzes/generate` decide por **`questionCount`**, para que ningún documento tenga dos papeles a la vez:

| Disparador | Respuesta | Para |
|---|---|---|
| `questionCount` = 7 | **400** C7 | CA-CUE-05 (mensaje técnico reemplazado por A5) |
| `questionCount` = 13 | Nunca responde (`delay('infinite')`) | CA-CUE-06 (corte a los 120 s) |
| `questionCount` = 20 | 3 s de espera y después el cuestionario fijo | CA-CUE-03 (estado de espera con A3) |
| `documentIds` con un UUID v4 que no está en §7.1 | **404** C5 | CA-CUE-04, CA-CON-03 |
| `documentIds` con `…0003`, `…0004` o `…0006` | **400** C6 con esos nombres de archivo | CA-CUE-04 |
| Cualquier otro caso válido | **201** con el cuestionario fijo y `requestedCount` = lo pedido | Camino feliz |

El mock devuelve siempre las tres preguntas fijas, cualquiera sea `questionCount`: las pruebas necesitan un cuestionario determinista, y `requestedCount` conserva lo que se pidió.

`GET /quizzes/{id}`: el id fijo devuelve el cuestionario completo; cualquier otro UUID v4 devuelve **404** C8 (CA-CUE-12). Los endpoints de intentos (§2.3) **no** están en los mocks: M3 no los llama.

### 7.3 Consultas

Dos conversaciones fijas, que se diferencian **solo** en si sus mensajes traen `sources`, para que los dos caminos de CA-CON-09 sean reales:

| Id | Cómo se restaura | Para |
|---|---|---|
| `5e550000-0000-4000-8000-000000000001` — "con fuentes" | `GET /chat/sessions/{id}` devuelve cada mensaje con su arreglo `sources` resuelto y `similarity: null` (forma del contrato, dependencia 46) | CA-CON-09 primer caso: las citas anteriores se abren, sin porcentaje, y **no** aparece A8 |
| `5e550000-0000-4000-8000-000000000002` — "sin fuentes" | Los mensajes llegan **sin** la clave `sources` (el backend de hoy) | CA-CON-09 segundo caso: los `[n]` quedan como texto y aparece A8 |
| `5e550000-0000-4000-8000-000000000009` — "ilegible" | **500** `{"statusCode":500,"message":"Internal server error"}` (la forma que produce el fallo de `BigInt`, sin clave `error`) | CA-CON-10: A7 y Nueva consulta |
| Cualquier otro UUID v4 | **404** C9 | CA-CON-11 |

Ambas conversaciones son sobre el documento `…0001` y tienen dos mensajes: `3e550000-…-0001` del usuario y `-0002` del asistente citando `[1]` y `[2]` (en la "sin fuentes", `3e550000-…-0011` y `-0012`). Los fragmentos citados son `cc000000-0000-4000-8000-000000000001` y `-0002`.

| Caso | Detalle |
|---|---|
| Crear conversación | **201** con id `5e550000-0000-4000-8000-000000000003`, `title` por defecto a partir de los nombres de archivo, y `documents` aplanado. Se restaura como la "con fuentes" |
| Documento inexistente o no listo | C5 y C6, con los mismos disparadores que §7.2 |
| Respuesta normal | Cita `[1]` y `[2]` con dos `sources` (`similarity` 0.812 y 0.774) |
| Respuesta sin fuentes | Una pregunta que contenga "clima" devuelve `sources: []` (CA-CON-06, A9) |
| Respuesta del modelo fallida | Una pregunta que contenga "error" devuelve C10 como `content`, con `sources: []` (CA-CON-07) |
| Envío fallido | Una pregunta que contenga "falla" devuelve **500**, y nada queda guardado en la conversación (CA-CON-08) |
| `sessionId` desconocido | C9 |

### 7.4 Lo que no se fija

Los tres casos de **ausencia** — sin documentos (CA-DOC-01), sin documentos listos para el cuestionario (CA-CUE-02) y sin documentos listos para consultar (CA-CON-01) — no tienen fijación propia: se prueban con `server.use(...)` por prueba, como en M2, porque las fijaciones por defecto tienen que sostener los caminos felices.

---

## 8. Dependencias

Numeración de la spec (§10, §13.4, §14.5 y §15.5). Todas son de `sigeda_chat_status`. El frontend habilita **Subir documento** y **Eliminar documento** solo cuando la 39 figura en `VITE_DEPENDENCIAS_RESUELTAS`; al desplegar la corrección, avisar para agregar el número.

| # | Cambio | Sección |
|---|---|---|
| 9 (M3/M5) | Aceptar el JWT de `sigeda-back`; su parte de M3 la detalla la 39 | §0 |
| 39 | **Seguridad:** guard JWT con la clave compartida, `User.username @unique`, aprovisionamiento de usuarios | §0 |
| 40 | Intentos de cuestionario: crear, guardar respuestas, entregar, consultar | §2.3 |
| 41 | `GET /quizzes/{id}?includeAnswers=false` sin `correctAnswer` ni `explanation` | §2.2 |
| 42 | Generación de cuestionarios en cola, o presupuesto de tiempo documentado | §2.1 |
| 43 | Límite de tamaño de subida (413 con el mensaje C13, no el "File too large" de Nest) y respaldo por extensión del `mimeType` | §1.1, §5 |
| 44 | `GET /chat/sessions` — historial de conversaciones | §3.4 |
| 45 | **Error y filtración:** aplanar `documents` con `toDocumentResponse` en las dos rutas de sesión (hoy 500 por `BigInt`, y filtra `extractedText` y `storageKey`) | §3.1, §3.3 |
| 46 | `sources` resueltas por mensaje en `GET /chat/sessions/{id}` | §3.3 |
| 47 | **Seguridad:** filtro por dueño en `GET`/`DELETE /documents/{id}` y `GET /quizzes/{id}`, y `ParseUUIDPipe` en los cuatro parámetros de ruta (hoy un id mal formado devuelve 500) | Convenciones, §1.3, §1.4, §2.2, §3.3 |
| 48 | `GET /quizzes`, `sourceDocumentId` por pregunta y paginación de los listados | §1.2, §2.4 |
| 49 | **Seguridad:** alcance, validación y paginación en `/prediction/**` | §4 |
| 50 | Mensajes de error sin internos y en español (documento, generación, validación de DTO) | Convenciones, §1.5, §2.1 |
