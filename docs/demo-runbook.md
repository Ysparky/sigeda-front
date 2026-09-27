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
| `jefe.operaciones` | Jefe de Operaciones | turnos, grupos, estándares |
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

## 6. Cinco cosas que conviene saber antes de demostrar

1. **Al registrar un turno, elegir la sub fase 2, 3 o 4.** La semilla enlaza maniobras solo a esas
   tres; las sub fases **1 (Contacto) y 5 (Formación) no tienen ninguna**, así que el selector de
   maniobras sale vacío y `GET /api/maniobras/subfase/1` responde 404. No es un defecto: es la
   semilla. (Y los siete turnos sembrados usan justamente la sub fase 1.)
2. **El panel de chequeos sale vacío.** `GET /api/personas/{cod}/chequeos` responde 404, que el
   frontend muestra como panel vacío, porque **la semilla no tiene ninguna fila en
   `chequeos_finales`**.
3. **El orden de mérito está FUERA DE ALCANCE por ahora, y no se demuestra.** El endpoint está
   implementado y probado, pero falta la tabla de coeficientes de misión del PDI (dependencia 62),
   que **no está en el documento ni en su libro de trabajo**, así que ningún alumno tiene `NFPI`
   calculable y el reporte devolvería todas las filas sin puesto. **Un orden de mérito sin puestos
   no es un orden de mérito**, así que no se presenta como funcionalidad terminada. La pantalla
   queda deshabilitada sola (la acción exige la 62) y explica cuál es el dato que falta. El
   `NFPI` del legajo dice lo mismo. **No es una carencia del software**: el día que llegue la tabla,
   vuelve al alcance sin código nuevo.
4. **`NCT` y las causales salen vacíos.** La semilla **no tiene ni un turno de tipo `EXAMEN`**, y
   `PE` solo se alimenta de ese tipo, así que ningún `NA` es calculable. `NEI` **sí** se calcula
   (`555555` da 20.00). Se arregla con datos: hay una propuesta escrita en las notas.
5. **Cada reinicio del backend re-siembra la base.** Ideal para repetir la demo, fatal si se quiere
   conservar lo que se cargó en vivo.

## 7. Lo que no se puede demostrar

- **El módulo de aprendizaje con IA**: dependencias 39–50, en otro repositorio, sin empezar.
- **Eliminar persona**: dependencia 30 incompleta — falla con FK si el usuario **alguna vez inició
  sesión**, porque `refresh_tokens` no tiene cascada.
- **Modificar maniobra** (32, 33) y **eliminar fase** (37, que es **pérdida de datos**): siguen
  deshabilitadas por el propio frontend.
- **El `NFPI`**: ver el punto 3.

## 8. Un defecto que esta preparación encontró y arregló

`GET /api/preguntas` devolvía **500 contra PostgreSQL** siempre que el filtro `texto` viniera
ausente o vacío — o sea **en la vista por defecto del banco de preguntas**. PostgreSQL no puede
inferir el tipo de un parámetro nulo dentro de `concat()`, lo bindea como `bytea` y rechaza la
comparación (`operator does not exist: text ~~ bytea`). **Ninguna prueba de las 900 podía
atraparlo: H2 infiere el tipo y responde 200.** Arreglado con un `cast(:texto as String)`, y la
razón quedó escrita sobre la consulta.

Es el argumento de por qué este paso existe: **una suite verde sobre H2 no dice que el sistema
funcione sobre PostgreSQL.**
