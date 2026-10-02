# Correr SIGEDA de punta a punta — guion de demostración

**Todos los comandos de aquí se ejecutaron y funcionaron el 1 oct 2026**, ahora sí con los **tres**
backends arriba: SIGEDA, el módulo de aprendizaje con IA, y sus dependencias. La versión anterior de
este documento dejaba fuera `sigeda_chat_status` porque sus dependencias 39–50 no estaban hechas; ya
lo están.

## 0. Lo que hay que tener corriendo

| Proceso | Puerto | De dónde sale |
|---|---|---|
| PostgreSQL de SIGEDA (`sigeda-pg`) | **5544** | contenedor Docker |
| **sigeda-back** (Spring) | **8080** | `sh ./mvnw -o spring-boot:run` |
| PostgreSQL del módulo de aprendizaje (`learning-module-postgres`, con pgvector) | 5432 | `docker compose up -d` |
| Redis (`learning-module-redis`) | 6379 | `docker compose up -d` |
| **MinIO** (almacén S3 de los documentos) | 9000 / 9001 | `brew`, **no Docker** — ver §3.2 |
| **sigeda_chat_status** (NestJS) | **3000** | `pnpm start:dev` |
| **sigeda-web** (Vite) | 5173 | `pnpm dev` |

Docker Desktop tiene que estar arriba antes de nada (`open -a Docker`), y el cliente necesita su
helper de credenciales en el PATH:

```sh
export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"
```

## 1. PostgreSQL de SIGEDA

El perfil `dev` apunta a `localhost:5432/sigeda`, pero **ese puerto lo ocupa el Postgres del módulo
de aprendizaje**. La base de la demo va en el **5544** y el backend se sobrescribe por variable de
entorno, sin tocar configuración ni contenedores ajenos.

```sh
docker start sigeda-pg          # si ya existe de una corrida anterior
until docker exec sigeda-pg pg_isready -U postgres -d sigeda_demo >/dev/null 2>&1; do sleep 1; done
```

La primera vez, en cambio:

```sh
docker run -d --name sigeda-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sigeda \
  -p 5544:5432 postgres:16
docker exec sigeda-pg psql -U postgres -c 'create database sigeda_demo'
```

**El esquema no se carga a mano.** Con el perfil `dev`, `spring.sql.init.mode=always` hace que el
backend ejecute `schema_prod.sql` y `data_prod.sql` en **cada arranque**, y `schema_prod.sql`
**empieza borrando las tablas**. Es reproducible, pero **lo que se cargue durante la demo se pierde
al reiniciar**.

## 2. El backend de SIGEDA

```sh
cd sigeda-back
export JAVA_HOME=/opt/homebrew/opt/openjdk@17        # java no está en el PATH
SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5544/sigeda_demo?prepareThreshold=0' \
  sh ./mvnw -o spring-boot:run -Dspring-boot.run.profiles=dev
```

El wrapper **no es ejecutable** en este clon: siempre `sh ./mvnw`. Arranca en ~4.3 s en
`http://localhost:8080`. Comprobación rápida:

```sh
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/materias        # 401 sin token
curl -s -X POST http://localhost:8080/auth/login -H 'Content-Type: application/json' \
     -d '{"username":"admin.sistema","password":"123"}'                            # 200 + token
```

## 3. El backend de IA (módulo de aprendizaje)

### 3.1. Postgres con pgvector, y Redis

```sh
cd sigeda_chat_status
docker compose up -d            # learning-module-postgres (5432) y learning-module-redis (6379)
docker compose ps               # esperar a que los dos digan healthy
```

### 3.2. MinIO — va por Homebrew, no por Docker

`STORAGE_ENDPOINT` apunta a `http://localhost:9000`, o sea MinIO local. **La imagen de Docker ya no
se puede bajar**: `minio/minio` responde `pull access denied`, `quay.io/minio/minio` responde 401 y
`bitnami/minio` ya no existe, así que las instrucciones del README de ese repo (opción B, vía
`docker-compose.yml`) **no funcionan hoy**. Por Homebrew sí:

```sh
brew install minio
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin MINIO_DOMAIN=localhost \
  /opt/homebrew/opt/minio/bin/minio server --address :9000 --console-address :9001 \
  /opt/homebrew/var/minio
```

**`MINIO_DOMAIN=localhost` no es opcional, y sin él la subida de documentos falla con un 500 que no
dice por qué.** `StorageService` construye su `S3Client` sin `forcePathStyle`, que es lo correcto
para Cloudflare R2 y para S3; contra MinIO eso hace que el SDK pida
`http://learning-module-documents.localhost:9000/...` —estilo *virtual host*—, y un MinIO sin
`MINIO_DOMAIN` lee esa ruta como estilo *path*, se queda con el primer segmento como nombre del
bucket y responde **`NoSuchBucket`** aunque el bucket exista. Con `MINIO_DOMAIN=localhost` MinIO
reconoce el subdominio como bucket y la subida pasa. Comprobado en los dos sentidos el 1 oct 2026.

El bucket hay que crearlo una vez. Desde `sigeda_chat_status` (usa su propio `@aws-sdk/client-s3`):

```sh
cat > crear-bucket.mjs <<'EOF'
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'
const s3 = new S3Client({
  endpoint: 'http://localhost:9000', region: 'us-east-1', forcePathStyle: true,
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
})
await s3.send(new CreateBucketCommand({ Bucket: 'learning-module-documents' }))
EOF
node crear-bucket.mjs && rm crear-bucket.mjs
```

O a mano en la consola web, `http://localhost:9001` (`minioadmin` / `minioadmin`).

### 3.3. Esquema y usuarios

```sh
pnpm prisma:generate
pnpm prisma:migrate       # prisma migrate deploy
pnpm seed:usuarios        # los 11 usuarios de sigeda-back, idempotente
```

`seed:usuarios` es el puente entre los dos backends: graba `users.sigeda_persona_code`, sin el cual
`/prediction/**` responde 404 para alumnos que sí existen. Un token cuyo `username` no esté sembrado
es un token válido que acá no sirve, y la respuesta es **401**.

### 3.4. Levantarlo

```sh
pnpm start:dev            # Backend escuchando en http://localhost:3000
```

```sh
TOKEN=$(curl -s http://localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin.sistema","password":"123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s http://localhost:3000/documents -H "Authorization: Bearer $TOKEN"
```

**El JWT es el mismo de sigeda-back.** `SIGEDA_JWT_SECRET` tiene que valer exactamente lo mismo que
`jwt.secret.key` en `application-dev.properties`, en base64 y sin decodificar a mano.

## 4. El frontend

`sigeda-web/.env` ya existe (está en `.gitignore`) y apunta a los dos backends:

```
VITE_SIGEDA_API_URL=http://localhost:8080
VITE_IA_API_URL=http://localhost:3000
VITE_MOCK_API=false
VITE_DEPENDENCIAS_RESUELTAS=1,2,4,5,6,7,12,13,14,15,16,17,18,19,20,21,22,24,30,32,33,37,39,41,43,45,46,47,49,50,51,52,53,54,55,56,57,58,61,62,63,64,65,66,67,68,70
```

```sh
cd sigeda-web && pnpm dev     # http://localhost:5173
```

`pnpm dev:mock` es lo contrario: usa `.env.mock` y no toca ningún servidor. El CORS del backend ya
permite `http://localhost:5173`.

## 5. Las cuentas

Todas con contraseña **`123`**.

| Usuario | Código | Rol | Para ver |
|---|---|---|---|
| `admin.sistema` | 000001 | Administrador Web | todo |
| `comandante.aguirre` | 222444 | Comandante de Escuadrón | materias, seguimiento, legajo, orden de mérito |
| `jefe.operaciones` | 333333 | Jefe de Operaciones | turnos, estándares |
| `instructor.perez` | 444444 | Instructor | banco de preguntas, turnos teóricos, **evaluar sus turnos** |
| `instructor.mendoza` | 888888 | Instructor | lo mismo, sobre los turnos 5, 6 y 7 |
| `alumno.lopez` | 111111 | Alumno | sus turnos, **su examen abierto hoy**, su legajo |
| `alumno.garcia` | 555555 | Alumno | el alumno completo: 17 evaluaciones y NFPI |

El **Alumno** también entra al módulo de Aprendizaje: las tres pantallas piden `Read` y ese permiso
lo tienen los cinco roles.

**Las once cuentas, con sus permisos y lo que cada alumno tiene sembrado, están en
`cuentas-de-la-demo.md`.**

## 6. El módulo de IA, comprobado de punta a punta

**Las tres claves del `.env` de `sigeda_chat_status` son válidas y los tres caminos funcionan**,
comprobado el 1 oct 2026 con `LLM_PROVIDER=anthropic` y `ANTHROPIC_MODEL=claude-haiku-4-5`:

| Camino | Comprobación |
|---|---|
| Subir un documento | `ready` con **5 tags** y **1 chunk indexado**, el log lo dice |
| Generar un cuestionario | 3 preguntas sobre el contenido real del documento |
| Consultar (chat RAG) | responde citando `[1]` y devuelve la fuente con su `similarity` |

**No borres ninguna de las tres claves del `.env`, ni siquiera la que no se usa.** `GeminiService` y
`EmbeddingsService` hacen `getOrThrow` **en el constructor**, y Nest los instancia aunque
`LLM_PROVIDER` sea `anthropic`: sin `GEMINI_API_KEY` el backend **no arranca**, aunque Gemini no
intervenga en nada. Que una clave esté vencida no impide arrancar; que falte, sí.

**Anthropic no vende embeddings**, así que `VOYAGE_API_KEY` no es opcional ni sustituible por la de
Anthropic: `EmbeddingsService` está cableado a `voyage-3` con 1024 dimensiones, que tienen que
coincidir con el `vector(1024)` de `document_chunks.embedding`. Sin ella el chat **revienta con un
500**, no se degrada: `RetrievalService.search()` se llama en `chat.service.ts:85` **fuera** del
`try/catch`, que sólo cubre la llamada al modelo, y la sesión no puede abrirse sin documentos
(`CreateChatSessionDto` exige `@ArrayMinSize(1)`), así que no hay forma de esquivar el embedding.

**Los documentos subidos antes de que las claves funcionaran no sirven y no se pueden arreglar:**
quedaron con **0 chunks**, no hay ruta de reindexado (`/documents` sólo tiene upload, list, get y
delete) y además su archivo vivía en el almacenamiento anterior, que ya no existe. Hay que
**volver a subirlos**.

**La predicción de desempeño responde bien pero no tiene pantalla.**
`GET /prediction/students` y `GET /prediction/students/{id}` funcionan —`555555` da
`evaluationCount: 16`, `latestScore: 17`, `riskLevel: "bajo"`, `trendDirection: "up"` y 10 filas de
`maneuverBreakdown`— pero **ninguna vista del frontend los consume todavía**. Se demuestra con
`curl`, no con el navegador.

**Los tipos de pregunta del cuestionario son una sugerencia, no un contrato.** Pidiendo
`["multiple_choice","true_false"]` volvió además una `fill_blank`: el prompt los **nombra** y el
esquema Zod acepta los tres sin mirar lo pedido, así que nada obliga al modelo. No se endureció a
propósito: validarlo estrictamente convertiría una pregunta de más en un fallo de generación tras
tres reintentos, que es peor durante una demostración.

## 7. Un defecto que esta preparación encontró y arregló

**Dar de alta un turno abortaba contra PostgreSQL**, con

```
ERROR: duplicate key value violates unique constraint "turnos_pkey"
Detail: Key (id)=(18) already exists.
```

La migración `019` sembró filas con id explícito —dos fases, dos sub fases, cinco misiones y dos
turnos— y **no movió las secuencias** de las que Hibernate saca el id de una fila nueva. Las cuatro
quedaron apuntando dentro del rango ya ocupado:

| tabla | `max(id)` | arrancaba en | arranca en |
|---|---|---|---|
| `fases` | 5 | 4 | **6** |
| `subfases` | 12 | 11 | **13** |
| `misiones` | 73 | 69 | **74** |
| `turnos` | 19 | 18 | **20** |

Son cuatro rutas de alta, no una. **Ninguna de las 1194 pruebas podía atraparlo**: la suite corre
sobre H2 con `ddl-auto=create-drop`, donde Hibernate crea las secuencias a partir del `initialValue`
de la entidad, así que el valor de `schema_prod.sql` —el que corre en dev y en producción— no
participa. Arreglado en `schema_prod.sql` y en la migración `020-secuencias-de-la-tabla-4.sql`, con
`setval` sobre `max(id)` y no con un literal, para que también sirva sobre una base viva. Lo cubre
`unit_test/SecuenciasDeLaSemillaTest`, que compara los dos archivos sin base de datos.

Es otra vez la misma moraleja que la del `cast` de `/api/preguntas` y la del `flush()` del login:
**una suite verde sobre H2 no dice que el sistema funcione sobre PostgreSQL.**

## 7 bis. El catálogo de maniobras dejó de ser relleno

La semilla traía diez maniobras llamadas «Maniobra 1» … «Maniobra 10», y la `019` las repartió sobre
las doce sub fases para que el selector nunca saliera vacío — con el resultado de que **la maniobra 1
pertenecía a ocho sub fases**, Control Básico y Emergencias IFR entre ellas. La migración `021` las
sustituye por **61 maniobras, cada una en una sola sub fase**, y pone la **escalada `D → I → R → B`**
en los cuatro turnos que no tienen evaluación:

```
Circuitos y Maniobras (2)  CM-1 D → CM-2 B      Navegación Local (4)  NL-1 R → NL-2 B
Control Preciso (3)        CP-1 I → CP-2 B      Aprox. IFR (11)       PA-1 R → PA-2 B
```

El piso sube con el **orden del programa**. Y el mínimo **acota** además de exigir: el DIRBE prohíbe
`ID`, `IB` e `IE`, así que una maniobra pedida en `I` sólo admite `I` o `R`, y una pedida en `D` se
califica `D` y nada más. Por eso el turno que el guion usa para registrar una evaluación —el **4**—
lleva `R`: ahí sí se puede calificar bajo, al y sobre el estándar. La tabla completa está en
`casos-de-uso-demo.md` §4.

Eso hace demostrable una regla que el borrador de tesis afirma —«las maniobras nuevas dentro de una
subfase se introducen como demostración … es natural que el nivel se vuelva más riguroso en turnos
posteriores»— y que con `B` en los 71 registros no se veía en ninguna pantalla.

**Los nombres son dato de demostración, no normativa.** La tesis dice que el catálogo lo define el
Comandante de Escuadrón, así que no hay tabla publicada que cumplir. El `PCPH 2024.xlsx` sí trae uno
completo con su escalada, pero es del Escuadrón Aéreo 510 de la FAP —tres fases, 14 sub fases, 118 h—
y la tesis es sobre el Aeroclub Sudamericano de los Andes, escuela civil bajo RAP 141 con 94 h:
importarlo habría afirmado una conformidad que no existe.

**Control Básico se queda sin escalada** y no es un olvido: sus tres turnos están evaluados, y
`calificaciones` guarda el estándar desnormalizado del que salió el promedio ya grabado. Cambiarlo
movería el `14.70`, el `15.83` y el `16.34`. Las 55 calificaciones conservan nota y nota mínima
idénticas; lo único que cambió en ellas es a qué maniobra apuntan.

## 8. Lo que sigue sin poder demostrarse

- **Eliminar persona**: dependencia 30 incompleta — falla con FK si el usuario **alguna vez inició
  sesión**, porque `refresh_tokens` no tiene cascada.
- **El panel de chequeos sale vacío.** `GET /api/personas/{cod}/chequeos` responde 404, que el
  frontend muestra como panel vacío, porque **la semilla no tiene ninguna fila en
  `chequeos_finales`**.
- **Cada reinicio del backend re-siembra la base.** Ideal para repetir la demo, fatal si se quiere
  conservar lo que se cargó en vivo.

## 9. Dos defectos que la preparación anterior encontró

Siguen valiendo como argumento de por qué este paso existe.

`GET /api/preguntas` devolvía **500 contra PostgreSQL** siempre que el filtro `texto` viniera
ausente o vacío — o sea **en la vista por defecto del banco de preguntas**. PostgreSQL no puede
inferir el tipo de un parámetro nulo dentro de `concat()`, lo bindea como `bytea` y rechaza la
comparación (`operator does not exist: text ~~ bytea`). Arreglado con un `cast(:texto as String)`.

Y el panel de estado teórico del legajo hacía `estado.data.causales.length` sobre un campo que **el
backend real no manda** — `causales[]` es la dependencia 68 y el contrato la deja fuera de M4, pero
**el mock sí la emite**. El tipo decía `causales: Causal[]`, o sea **TypeScript mintiendo**, porque
`sigeda.get<T>` es un genérico sin validación en runtime. Esa pantalla pasaba contra el mock y
**habría estallado la primera vez que tocara el servidor**.

Las dos comparten moraleja: **el frontend no valida las respuestas en runtime**, así que una
diferencia de forma entre el mock y el servidor no se ve hasta que se conectan de verdad.
