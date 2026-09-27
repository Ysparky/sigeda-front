# Correr SIGEDA de punta a punta — guion de demostración

> **Estado: BORRADOR SIN VERIFICAR.** Cada comando de aquí se verifica ejecutándolo antes de la
> demostración; lo que no esté marcado como comprobado puede estar mal. (Se verifica en cuanto la
> tanda D5 libere el árbol del backend.)

Esto levanta el sistema real: PostgreSQL, el backend Spring y el frontend apuntando al backend en
vez de a los mocks. **No** incluye el backend de IA (`sigeda_chat_status`), cuyas dependencias
39–50 no están hechas.

## 1. La base de datos

El perfil `dev` apunta a `localhost:5432/sigeda`, pero **ese puerto puede estar ocupado** por los
contenedores de otro proyecto que Docker Desktop arranca solo (`learning-module-postgres`). Por eso
la base de la demo va en el **5544** y el backend se sobrescribe por variable de entorno, sin
tocar ninguna configuración ni los contenedores ajenos.

```sh
# el binario de docker necesita su helper de credenciales en el PATH
export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"

docker run -d --name sigeda-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sigeda \
  -p 5544:5432 postgres:16

# esperar a que acepte conexiones
until docker exec sigeda-pg pg_isready -U postgres -d sigeda >/dev/null 2>&1; do sleep 1; done
```

**No hace falta cargar el esquema a mano.** Con el perfil `dev`,
`spring.sql.init.mode=always` hace que el backend ejecute `schema_prod.sql` y `data_prod.sql` en
cada arranque — y `schema_prod.sql` **empieza borrando las tablas**, así que cada arranque deja la
base como recién sembrada. Es reproducible, pero **lo que se cargue durante la demo se pierde al
reiniciar**.

## 2. El backend

```sh
cd sigeda-back
SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5544/sigeda?prepareThreshold=0' \
  sh ./mvnw -o spring-boot:run -Dspring-boot.run.profiles=dev
```

El wrapper **no es ejecutable** en este clon: siempre `sh ./mvnw`. Queda en
`http://localhost:8080`.

## 3. El frontend

Crear `sigeda-web/.env` (está en `.gitignore`, así que no se commitea):

```
VITE_SIGEDA_API_URL=http://localhost:8080
VITE_MOCK_API=false
VITE_DEPENDENCIAS_RESUELTAS=<la lista de abajo>
```

```sh
cd sigeda-web && pnpm dev
```

`pnpm dev:mock` es lo contrario: usa `.env.mock` y no toca el servidor.

## 4. Qué poner en `VITE_DEPENDENCIAS_RESUELTAS`

El frontend deshabilita una acción mientras su dependencia no figure aquí. Esta es la lista de las
que **están hechas y verificadas**:

```
1,2,5,6,7,12,13,14,15,16,17,18,19,20,21,22,24,52,53,54,55,58,61,63,64,65,66,67,68
```

Con eso se habilitan: gestionar materias, gestionar e importar preguntas, programar turnos
teóricos, rendir exámenes, el bloqueo por subsanación, las alertas, el ciclo de chequeo, el
historial teórico y las causales, y registrar personas.

**Deliberadamente NO se incluyen**, y las pantallas lo van a decir en pantalla:

| Dependencia | Por qué no |
|---|---|
| **62** | La tabla de coeficientes de misión **no existe en el PDI ni en su libro de trabajo**. Sin ella `NSF`, `NIA` y `NFPI` no son calculables **por nadie**. Deja fuera los índices y el orden de mérito. |
| 30 | El borrado de persona falla con FK si el usuario **alguna vez inició sesión** (`refresh_tokens` no tiene cascada). |
| 32, 33, 37 | Modificar maniobra y eliminar fase; la 37 es **pérdida de datos**. |
| 39 | Todo el módulo de IA, en otro repositorio. |
| 56 | La consulta en lote del estado teórico. |

Incluir la 62 no arregla nada: haría que la pantalla pidiera datos que el servidor devuelve nulos,
en vez de explicar por qué faltan.

## 5. Cuentas

Todas con contraseña `123` (semilla de `data_prod.sql`).

| Usuario | Rol | Para ver |
|---|---|---|
| `admin.sistema` | Administrador Web | todo |
| `comandante.aguirre` | Comandante de Escuadrón | materias, seguimiento, legajo |
| `jefe.operaciones` | Jefe de Operaciones | turnos, grupos, estándares |
| `instructor.perez` | Instructor | banco de preguntas, turnos teóricos, evaluar |
| `alumno.lopez` | Alumno | sus turnos, sus exámenes, su legajo |

## 6. Recorrido sugerido

_(por completar y verificar corriendo el sistema)_

## 7. Lo que NO se puede demostrar, y por qué

- **`NFPI` y el orden de mérito**: falta un dato de la norma (dependencia 62), no código.
- **Las causales teóricas y el `NCT`**: la semilla **no tiene ni un turno de tipo `EXAMEN`**, y
  `PE` solo se alimenta de ese tipo, así que ningún `NA` es calculable y las causales que dependen
  de él no pueden dispararse. **Se arregla con datos**, y hay una propuesta escrita.
- **El módulo de aprendizaje con IA**: dependencias 39–50, sin empezar.
