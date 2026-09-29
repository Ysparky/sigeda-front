# Correr SIGEDA de punta a punta — guion de demostración

**Todos los comandos de aquí se ejecutaron y funcionaron el 27 sep 2026.** No incluye el backend
de IA (`sigeda_chat_status`): sus dependencias 39–50 no están hechas.

## 1. PostgreSQL

El perfil `dev` apunta a `localhost:5432/sigeda`, pero **ese puerto puede estar ocupado** por
contenedores de otros proyectos que Docker Desktop arranca solo. La base de la demo va en el
**5544** y el backend se sobrescribe por variable de entorno, sin tocar configuración ni
contenedores ajenos.

```sh
# el cliente docker necesita su helper de credenciales en el PATH
export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"

docker run -d --name sigeda-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sigeda \
  -p 5544:5432 postgres:16

docker exec sigeda-pg psql -U postgres -c 'create database sigeda_demo'
until docker exec sigeda-pg pg_isready -U postgres -d sigeda_demo >/dev/null 2>&1; do sleep 1; done
```

**El esquema no se carga a mano.** Con el perfil `dev`, `spring.sql.init.mode=always` hace que el
backend ejecute `schema_prod.sql` y `data_prod.sql` en **cada arranque**, y `schema_prod.sql`
**empieza borrando las tablas**. Es reproducible, pero **lo que se cargue durante la demo se pierde
al reiniciar**.

## 2. El backend

```sh
cd sigeda-back
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

## 3. El frontend

Crear `sigeda-web/.env` (está en `.gitignore`):

```
VITE_SIGEDA_API_URL=http://localhost:8080
VITE_IA_API_URL=http://localhost:3000
VITE_MOCK_API=false
VITE_DEPENDENCIAS_RESUELTAS=1,2,5,6,7,12,13,14,15,16,17,18,19,20,21,22,24,52,53,54,55,58,61,63,64,65,66,67,68,70
```

```sh
cd sigeda-web && pnpm dev     # http://localhost:5173
```

`pnpm dev:mock` es lo contrario: usa `.env.mock` y no toca el servidor. El CORS del backend ya
permite `http://localhost:5173` (comprobado).

## 4. Las cuentas

Todas con contraseña **`123`**.

| Usuario | Rol | Para ver |
|---|---|---|
| `admin.sistema` | Administrador Web | todo |
| `comandante.aguirre` | Comandante de Escuadrón | materias, seguimiento, legajo |
| `jefe.operaciones` | Jefe de Operaciones | turnos, estándares (**grupos ya no**: la dependencia 4 dejó `Manage Groups` solo en el Administrador Web) |
| `instructor.perez` | Instructor | banco de preguntas, turnos teóricos, evaluar |
| `alumno.lopez` | Alumno | sus turnos, sus exámenes, su legajo |

## 5. Lo que funciona, comprobado ruta por ruta

Las 22 rutas que se probaron con `curl` contra la base real devolvieron lo esperado, **incluidas
las cinco de turnos que estaban caídas antes de la tanda E1**:

- Turnos: la lista con sus cuatro ramas de filtro, el detalle, `/turnos/alumno`, aeronaves.
- Teoría: materias, banco de preguntas, turnos teóricos, el catálogo de grupos, el detalle de
  turno, los exámenes pendientes, el estado teórico.
- Seguimiento: índices, orden de mérito, legajo, alertas, historial teórico.
- Matrícula: personas, grupos, maniobras, fases, subfases, roles.
- Seguridad: 401 sin token; **403 al pedir los datos de otro alumno** y 200 con los propios.

## 6. El recorrido, con las cifras que va a mostrar

Los dos alumnos del **grupo 3** son la historia, y son deliberadamente opuestos:

| | `555555` Pedro | `666666` Ana |
|---|---|---|
| Materia 3 (mínimo 18) | `PT` 18.00 · `PE` 18.00 → **`NA` 18.00**, aprueba | `PT` 12.00 · `PE` 12.00 → **`NA` 12.00**, desaprueba |
| `NCT` · `NEI` | 18.00 · 20.00 | 12.00 · 12.00 |
| **`NIT`** | **18.40** | **12.00** |
| Causales | ninguna | **`PROMEDIO_ASIGNATURA`** en Adoctrinamiento de Vuelo (12.00 < 13) |
| Bloqueo por subsanación | no | **sí**, con 3 exámenes desaprobados sin subsanar |
| `NIA` · `NFPI` | `null` · `null` | `null` · `null` |

Las diez asignaturas restantes salen en `asignaturasSinNota`, así que **la renormalización del
`NCT` se ve funcionando**: se calcula sobre la única materia con nota, no sobre las once.

Recorrido sugerido:

1. **Entrar como `instructor.perez`** → banco de preguntas (24 preguntas, filtros, importar desde
   IA deshabilitado porque es otro backend), y programar un turno teórico.
2. **Entrar como `alumno.lopez`** → sus exámenes pendientes, rendir uno (autoguardado, cuenta
   atrás), y ver el resultado. Intentar ver el legajo de otro alumno → **403**.
3. **Entrar como `comandante.aguirre`** → materias (CRUD completo), y el **legajo de `666666`**:
   el ciclo de chequeo, el estado teórico con su bloqueo y su causal, y los índices con el `NIT`
   calculado y el `NIA` explicando qué falta.
4. **Entrar como `jefe.operaciones`** → registrar un turno práctico. **Elegir la sub fase 2, 3 o 4**
   (ver el punto 1 de abajo), y probar el cruce de horarios poniendo al mismo alumno dos veces.

## 7. Tres cosas que conviene saber antes de demostrar

1. **Cualquier sub fase sirve para registrar un turno.** Desde la migración `019` las **doce** tienen
   maniobras enlazadas (44 filas en `maniobras_subfase`), así que el selector de maniobras nunca sale
   vacío. Antes sólo las tenían tres, y `GET /api/maniobras/subfase/1` respondía 404: esa advertencia ya
   no aplica.
2. **El panel de chequeos sale vacío.** `GET /api/personas/{cod}/chequeos` responde 404, que el
   frontend muestra como panel vacío, porque **la semilla no tiene ninguna fila en
   `chequeos_finales`**.
3. **El orden de mérito SÍ se demuestra**, y es lo que más cambió. `555555` sale **puesto 1** con
   `nfpi` **16.34** y `nia` **15.83**; los otros cinco alumnos salen **sin puesto, cada uno con su
   motivo**, que es la mitad útil de la pantalla: cuatro por la mitad teórica y `666666` porque le falta
   nota de sub fase. Comprobado con `curl` contra PostgreSQL el 29 sep 2026.

   **La cadena completa, para contarla en orden:** el legajo de `555555` muestra **14.70** en Control
   Básico —ponderado sobre el **44 %** de la sub fase, y la pantalla lo dice—, las cinco notas de fase
   (**14.99 · 15.36 · 16.20 · 16.94 · 16.44**), el `nia` **15.83** y el `nfpi` **16.34**. El `nia.motivo`
   viene en `null`: no queda nada que advertir, porque las doce sub fases que el NIA pondera tienen nota.

   **El 14.70 no es un promedio y conviene decirlo:** las cuatro notas de Control Básico son 13, 15.5, 15
   y 15, y su promedio simple daría **14.63**. Sale 14.70 porque `CB-1` vale 1.0 h y `CB-3` vale 1.2, o
   sea que la ponderación por horas se **ve** en la cifra.

   **Antes de la demo, volver a pedir `/api/personas/555555/indices`.** Las cifras dependen de la
   semilla y la semilla se mueve; el guion de arriba vale para el estado del 29 sep 2026.
4. **~~`NCT` y las causales salen vacíos.~~ ARREGLADO el 27 sep 2026.** Faltaba que la semilla
   tuviera un turno de tipo **`EXAMEN`** — `PE` solo se alimenta de ese tipo, así que ningún `NA`
   era calculable. Se sembraron un `TEST` y un `EXAMEN` de la materia 3 para el grupo 3
   (migración `010`), y **la mitad teórica ya se puede demostrar**, comprobado contra PostgreSQL.
5. **Cada reinicio del backend re-siembra la base.** Ideal para repetir la demo, fatal si se quiere
   conservar lo que se cargó en vivo.

## 8. Lo que no se puede demostrar

- **El módulo de aprendizaje con IA**: dependencias 39–50, en otro repositorio, sin empezar.
- **Eliminar persona**: dependencia 30 incompleta — falla con FK si el usuario **alguna vez inició
  sesión**, porque `refresh_tokens` no tiene cascada.
- **Modificar maniobra** (32, 33) y **eliminar fase** (37, que es **pérdida de datos**): siguen
  deshabilitadas por el propio frontend.
- **El `NFPI`**: ver el punto 3.

## 9. Dos defectos que esta preparación encontró y arregló

`GET /api/preguntas` devolvía **500 contra PostgreSQL** siempre que el filtro `texto` viniera
ausente o vacío — o sea **en la vista por defecto del banco de preguntas**. PostgreSQL no puede
inferir el tipo de un parámetro nulo dentro de `concat()`, lo bindea como `bytea` y rechaza la
comparación (`operator does not exist: text ~~ bytea`). **Ninguna prueba de las 900 podía
atraparlo: H2 infiere el tipo y responde 200.** Arreglado con un `cast(:texto as String)`, y la
razón quedó escrita sobre la consulta.

**Y antes de arrancar nada, leyendo:** el panel de estado teórico del legajo hacía
`estado.data.causales.length` y `.map(...)` sobre un campo que **el backend real no manda** —
`causales[]` es la dependencia 68 y el contrato la deja fuera de M4, pero **el mock sí la emite**.
El tipo decía `causales: Causal[]`, o sea **TypeScript mintiendo**, porque `sigeda.get<T>` es un
genérico sin validación en runtime. Esa pantalla pasaba contra el mock y **habría estallado la
primera vez que tocara el servidor**. Arreglado con el campo opcional y una prueba que manda la
respuesta real del backend.

Las dos comparten una moraleja: **el frontend no valida las respuestas en runtime**, así que una
diferencia de forma entre el mock y el servidor no se ve hasta que se conectan de verdad.

Es el argumento de por qué este paso existe: **una suite verde sobre H2 no dice que el sistema
funcione sobre PostgreSQL.**
