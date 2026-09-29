# Despliegue de los tres servicios

Lo que hay que hacer, en orden, y **lo que falla en silencio si se salta**. Cada paso dice cómo se
comprueba que salió bien, porque los dos errores más caros de este sistema no dan mensaje: uno deja
todas las peticiones en 401 y el otro deja la base sin la mitad de sus restricciones.

## 0. Antes que nada: las dos bases son distintas

| Servicio | PostgreSQL | Base |
|---|---|---|
| `sigeda-back` | **5544** (contenedor `sigeda-pg` en desarrollo) | `sigeda_demo` |
| `sigeda_chat_status` | **5432** (`learning-module-postgres`) | `learning_module` |

Confundirlas es fácil y el síntoma no es evidente. En producción son dos servidores, pero la regla
vale igual: **el servicio de IA nunca toca la base de `sigeda-back`**; le habla por HTTP con el token
del llamador.

## 1. `sigeda-back`

### El paso que falla en silencio: las migraciones

En **desarrollo**, `application-dev.properties` pone `spring.sql.init.mode=always` sobre un
`schema_prod.sql` con 27 `drop table`: **cada arranque recrea y resiembra las 27 tablas**, así que
todo lo que las migraciones agregan ya viene puesto. En **producción**, `application-prod.properties`
pone `spring.sql.init.mode=never`: **no se recrea nada y las migraciones hay que correrlas a mano.**

Son **18**, en `src/main/resources/migraciones/`, y van **en orden numérico**. Todas son idempotentes
—se pueden correr dos veces— y cada una abre su propia transacción con `\set ON_ERROR_STOP on`:

```sh
for f in src/main/resources/migraciones/0*.sql; do
  psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f "$f" || break
done
```

**Cómo se comprueba.** Las nueve consultas de coherencia tienen que dar **0**; si alguna no da 0, una
migración no corrió. Las dos más baratas:

```sql
select count(*) from turnos t join subfases s on s.id=t.id_sub_fase join fases f on f.id=s.id_fase
 where t.fase <> f.nombre;                                   -- columnas desnormalizadas
select count(*) from pg_constraint where conname = 'uk_usuarios_nombre';  -- debe dar 1
```

La segunda es la que más se salta: `usuarios.nombre` es el nombre de usuario y sin esa restricción
dos altas simultáneas dejan dos cuentas iguales, y `findByNombre` —por donde entra el login— devuelve
una de las dos sin decir cuál.

### Variables

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` y **`JWT_SECRET_KEY`**, que es el
secreto en **base64** con el que se firman los tokens. Anotá su valor: el servicio de IA necesita
exactamente el mismo.

## 2. `sigeda-web`

Un `.env` a partir de `.env.example`, con `VITE_SIGEDA_API_URL`, `VITE_IA_API_URL` y
`VITE_MOCK_API=false`.

`VITE_DEPENDENCIAS_RESUELTAS` es la lista de dependencias del backend que **ya están resueltas** y por
lo tanto habilitan su acción en la interfaz; lo que no figure queda deshabilitado con su aviso. La
lista verificada está en `.env.example`. **Las pruebas no leen este archivo** —`vitest.config.ts` fija
su propio entorno— justamente para que una lista con dependencias resueltas no contradiga a las
pruebas que verifican lo deshabilitado.

## 3. `sigeda_chat_status` (el servicio de IA)

Tres pasos, **en este orden**:

```sh
# 1. el secreto compartido: el MISMO valor base64 de JWT_SECRET_KEY de sigeda-back
export SIGEDA_JWT_SECRET='...'
export SIGEDA_API_BASE_URL='https://…'   # dónde vive sigeda-back

# 2. el esquema
pnpm prisma:migrate

# 3. las cuentas
pnpm seed:usuarios
```

**Por qué el orden importa, y qué pasa si se salta cada uno:**

- **Sin `SIGEDA_JWT_SECRET` el servicio no arranca**, a propósito. Falla fuerte y claro. (Y tiene que
  ser el valor **base64**: la clave HMAC son los bytes decodificados, no la cadena. Con la cadena
  cruda **toda** verificación falla y el síntoma es idéntico a un secreto equivocado.)
- **Sin `pnpm seed:usuarios` el servicio arranca perfecto y TODAS las peticiones responden 401.** El
  token de `sigeda-back` valida bien; lo que falta es a quién mapear el `sub`. Desde afuera es
  indistinguible de un secreto mal configurado, y se pierde el tiempo depurando la integración de
  auth. Por eso el arranque ahora lo avisa —`NO HAY NINGÚN USUARIO SEMBRADO…`— y el log de cada 401
  nombra el comando. **Si agregás cuentas en `sigeda-back`, volvé a correrlo.**

**Cómo se comprueba, de punta a punta:**

```sh
T=$(curl -s -X POST "$SIGEDA/auth/login" -H 'Content-Type: application/json' \
      -d '{"username":"admin.sistema","password":"..."}' | jq -r .token)
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $T" "$IA/documents"   # 200
curl -s -o /dev/null -w '%{http_code}\n' "$IA/documents"                                  # 401
```

Un 401 en la primera línea con un token válido **es la siembra**, no el secreto.

### Dos cosas que hoy no funcionan y no son de este trabajo

- **`STORAGE_ENDPOINT` apunta a MinIO y no hay nada escuchando ahí**, así que **cualquier subida de
  documento responde 500**. Hace falta un MinIO o un S3/R2 real antes de demostrar esa mitad.
- **Las claves de Anthropic y de Voyage responden 401**, así que generar un cuestionario y mandar un
  mensaje de chat dan 500. Todo lo que no dependa del LLM funciona.

## 4. El orden entre servicios

`sigeda-back` primero —el de IA verifica sus tokens y le pide las evaluaciones—, después el de IA,
después el frontend. El de IA arranca sin `sigeda-back` vivo, pero no podrá verificar a nadie.
