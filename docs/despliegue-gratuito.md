# Desplegar SIGEDA con capas gratuitas

**Relevado el 2 oct 2026.** Las capas gratuitas cambian rápido —tres de las que este documento
descarta existían hace un año—, así que **antes de comprometerse hay que volver a mirar los números**.
Cada cifra lleva su fuente al final.

Esto decide **dónde** vive cada cosa. El **cómo** —migraciones, secreto compartido, siembra de
usuarios y el orden entre servicios— está en `despliegue.md`, y no cambia según el proveedor.

> **ESTO ES PARA LA TESIS, NO PARA USO REAL.** No hay alumnos de verdad, no hay registro académico
> que perder y no hay nadie usándolo un martes a las tres. El único requisito que manda es que
> **esté arriba y responda rápido cuando el jurado mire**, y que se pueda volver a levantar en
> minutos si algo se cae. Alta disponibilidad, réplicas, observabilidad y copias de seguridad
> **no aplican**, y perseguirlas acá es tiempo que no vuelve.

## 1. Qué hay que colocar

Siete piezas, no tres:

| # | Pieza | Qué necesita |
|---|---|---|
| 1 | **sigeda-web** | estático: 1.8 MB de `dist` |
| 2 | **sigeda-back** | JVM Java 17, Spring Boot 3.4.2 |
| 3 | **sigeda_chat_status** | Node ≥18, **y un worker BullMQ que no duerme** |
| 4 | PostgreSQL de SIGEDA | 27 tablas, datos de demostración: decenas de MB |
| 5 | PostgreSQL del módulo de aprendizaje | **con `pgvector`**, columna `vector(1024)` |
| 6 | Redis | cola BullMQ del procesamiento de documentos |
| 7 | Almacén S3 | los documentos subidos |

Más Anthropic y Voyage, que ya tienen clave y se pagan aparte.

## 2. Las cuatro restricciones que eliminan casi todo

Son las que deciden, y ninguna es de precio:

1. **`pgvector`.** El chat guarda embeddings de 1024 dimensiones. De las capas gratuitas de Postgres,
   **Neon lo soporta explícitamente**; en las demás hay que comprobarlo antes, y si no está, el
   módulo de consultas no existe.
2. **BullMQ no sobrevive a un Redis por comando.** Un worker de BullMQ mantiene una conexión
   bloqueante y repregunta en bucle: se ha medido en **más de 2000 comandos por minuto**. Los 500 000
   mensuales de Upstash se agotan en **unas cuatro horas** de worker encendido. **Redis por comando y
   BullMQ son incompatibles**, y es el error más caro de este despliegue porque no falla: factura.
3. **Una JVM en 512 MB no tiene margen.** La JVM se come 200–300 MB antes de la primera línea de
   código, y metaspace, pilas de hilos, caché JIT y buffers directos quedan **fuera del heap** pero
   **dentro** del límite del contenedor. Arranca con `-XX:MaxRAMPercentage=75 -Xss256k
   -XX:+UseContainerSupport`, pero sin holgura.
4. **Dos backends que no pueden dormir.** La única PaaS con capa gratuita **siempre encendida** da
   **un** servicio. Render da 750 horas mensuales pero **duerme a los 15 minutos y tarda 30–50 s en
   despertar** — delante de un jurado eso es la demostración arruinada.

## 3. Opción A — una VM gratuita con `docker-compose` (recomendada)

Las siete piezas en una sola máquina, con el mismo `docker-compose` que ya corre en desarrollo.

| | |
|---|---|
| **Oracle Cloud Always Free** | **2 OCPU ARM · 12 GB RAM**, sin vencimiento. Era 4/24 y Oracle lo **partió por la mitad en junio de 2026**, terminando las instancias que excedían el nuevo límite en agosto |
| GCP Always Free | 1× `e2-micro`, **0.25 vCPU / 1 GB** — **no alcanza** para esta pila |
| AWS | 12 meses o créditos, **no es permanente** |

**Por qué gana:** resuelve de un plumazo las cuatro restricciones. `pgvector` lo instalás vos,
Redis es un contenedor con precio fijo, MinIO es otro contenedor, la JVM tiene gigas en vez de
megas, y nada duerme. Es además **la misma topología que ya está probada en desarrollo**, así que
no hay que reconfigurar nada: ARM no molesta —Java 17, Node y `pgvector/pgvector:pg16` tienen
imágenes `arm64`—.

**Los tres riesgos, con su mitigación:**

- **Oracle recupera instancias ociosas.** La regla está publicada: en una ventana de 7 días, si el
  percentil 95 de CPU queda bajo 20 %, el de red bajo 20 % y —en las A1— el de memoria bajo 20 %, se
  reclama. Una VM de demostración que no se usa **entra justo en ese perfil**. Mitigación: un cron
  que haga trabajo real, o aceptar que hay que volver a levantarla.
- **Pide tarjeta** para crear la cuenta, aunque no cobre.
- **Es una VM, no una PaaS**: parches, TLS y reinicios son tuyos. Con Caddy el TLS es una línea.

## 4. Opción B — repartir en capas gratuitas administradas

Si se prefiere no administrar una máquina:

| Pieza | Dónde | Capa gratuita | Lo que hay que saber |
|---|---|---|---|
| Frontend | **Cloudflare Pages** | estáticos sin costo | sin pegas; 1.8 MB |
| `sigeda-back` | **Koyeb** | 1 servicio, **512 MB, sin dormir** | el único hueco siempre encendido; **tarjeta desde feb 2026** |
| `sigeda_chat_status` | **Render** | 750 h/mes, 512 MB | **duerme a los 15 min**, 30–50 s de arranque en frío |
| Las dos Postgres | **Neon** | 0.5 GB, 100 CU-hora/mes, **`pgvector` sí** | los límites son **duros**: al tocarlos se suspende el cómputo hasta el mes siguiente |
| Redis | — | **no hay opción gratuita viable** | ver la restricción 2 |
| Almacén | **Cloudflare R2** | **10 GB, egreso gratis**, 1 M clase A / 10 M clase B | la mejor pieza del conjunto, sin asteriscos |

**Esta opción no cierra**: el Redis de BullMQ se queda sin casa, y el backend que vaya a Render va a
dormirse. Sirve si se acepta que el módulo de documentos quede fuera de la demostración.

## 5. La recomendación

**Opción A sobre Oracle Always Free, con el frontend en Cloudflare Pages.**

El frontend va aparte aunque la VM podría servirlo: son 1.8 MB de estáticos, Pages los pone en CDN
sin costo, y así la VM no expone nada al público salvo las dos APIs. El resto —dos backends, dos
Postgres con `pgvector`, Redis y MinIO— en un `docker-compose` sobre la VM.

**Lo que esto cuesta si la capa gratuita falla:** la pila entera entra en un VPS de ~5 USD al mes
(Hetzner, por ejemplo), con el mismo `docker-compose` y sin cambiar una línea. Esa es la razón de
fondo para elegir A: **la salida de emergencia es cambiar de máquina, no de arquitectura.**

## 6. Antes de desplegar, leer `despliegue.md`

Dos pasos de ese documento fallan **en silencio** y ningún proveedor los resuelve:

- En producción `spring.sql.init.mode=never`, así que **las migraciones hay que correrlas a mano**,
  en orden numérico. Hoy son **21**.
- Sin `pnpm seed:usuarios`, el backend de IA arranca perfecto y **todas** sus peticiones responden
  401, con un síntoma idéntico al de un secreto mal configurado.

## 7. Lo que falta en el código, que pesa más que el proveedor

Relevado el 2 oct 2026 sobre el código, no sobre la infraestructura.

**Arreglado hoy — el origen de CORS estaba fijo.** `SecurityConfig` tenía
`setAllowedOrigins(List.of("http://localhost:5173"))` clavado, así que **el frontend publicado
quedaba bloqueado por el navegador** y el backend ni se enteraba: el preflight muere en el cliente,
no hay log, no hay 4xx en el servidor. Ahora sale de `cors.allowed-origins` / `CORS_ALLOWED_ORIGINS`
y por omisión no cambia nada en desarrollo. **Hay que fijarla en el despliegue o no funciona nada.**

**Lo que sigue pendiente, en orden de lo que más duele:**

| Falta | Por qué importa al desplegar |
|---|---|
| **Migraciones automáticas** (Flyway o Liquibase) | hoy son **21 scripts a mano** con `psql`. `despliegue.md` ya avisa que saltarse uno no da error: deja la base sin la mitad de sus restricciones. Un arranque que las aplique y verifique convierte el riesgo operativo más grande en un no-problema |
| **Endpoint de salud** | ni `sigeda-back` ni el de IA exponen uno. Sin él ninguna PaaS, balanceador ni `docker-compose healthcheck` puede decir si el servicio está vivo, y no hay despliegue sin corte |
| **CORS del backend de IA** | `main.ts` hace `enableCors({ origin: true, credentials: true })`, que refleja **cualquier** origen. Es el extremo opuesto al de `sigeda-back` y merece la misma lista |
| **`hikari.maximum-pool-size=20`** | contra una Postgres gratuita con tope de conexiones bajo, una sola instancia ya se lleva casi todo; dos instancias no entran |

**Para la tesis, de esa tabla sólo pesa la primera fila, y a medias.** Las migraciones a mano hay
que correrlas **una vez**, sobre una base que se puede recrear entera; automatizarlas con Flyway
protege contra un error que, acá, se arregla volviendo a sembrar. El endpoint de salud sirve para
desplegar sin corte, y un despliegue con corte no le molesta a nadie. El `pool-size` sólo se nota
con carga que no va a existir.

**Copias de seguridad: tampoco.** `evaluaciones_practicas` y `calificaciones` serían el registro
académico de un alumno piloto si hubiera alumnos; acá son datos sembrados que se regeneran con
`data_prod.sql`. Lo que sí conviene tener a mano es **cómo volver a levantar todo en diez minutos**,
que es un `docker-compose up` y las 21 migraciones.
