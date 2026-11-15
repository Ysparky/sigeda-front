# Guion de la demo para la sustentación

Una sola historia: **el ciclo de vida de una cohorte del curso de Piloto de Helicóptero (PDI EA-510)**,
desde que un aspirante postula hasta la constancia de egreso y la licencia PP-H. Cada acto lo cuenta el rol
que usa el sistema en ese momento. Duración de la demo en vivo: **12 a 15 minutos**.

El video **`tesis-project/sustentacion/presentacion-sigeda.mp4`** (3 min 20 s) sigue exactamente este guion:
úselo para ensayar y como respaldo si algo falla en vivo. Para volver a grabarlo, con todos los servicios
arriba y la base recién reiniciada:

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web
pnpm exec playwright test --config playwright.presentacion.config.ts
```

El video queda en `test-results/` (cópielo antes de correr otra prueba: Playwright borra esa carpeta).

---

## 0. Antes de la sustentación (30 minutos antes)

### 0.1 Levantar los servicios

Abra una terminal por servicio, en este orden.

**1) Bases de datos** (Docker Desktop abierto):

```bash
docker start sigeda-pg learning-module-postgres learning-module-redis
```

**2) Almacenamiento de archivos del módulo de aprendizaje (MinIO):**

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda_chat_status
set -a; . ./.env; set +a
MINIO_DOMAIN=localhost MINIO_ROOT_USER="$STORAGE_ACCESS_KEY_ID" MINIO_ROOT_PASSWORD="$STORAGE_SECRET_ACCESS_KEY" minio server ../.demo-data/minio --address :9000 --console-address :9001
```

**3) Reiniciar la base del demo** (deja los datos exactamente como en el guion):

```bash
docker exec sigeda-pg psql -U postgres -c 'drop database if exists sigeda_demo' -c 'create database sigeda_demo'
```

**4) Backend SIGEDA** (puerto 8080; al arrancar carga el esquema y la semilla):

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-back
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5544/sigeda_demo?prepareThreshold=0' sh ./mvnw -o spring-boot:run -Dspring-boot.run.profiles=dev
```

Espere la línea `Started SigedaBackApplication`.

**5) Servicio de IA** (puerto 3000; aprendizaje y proyección):

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda_chat_status
pnpm build && node dist/main.js
```

Espere `Backend escuchando en http://localhost:3000`.

**6) Web** (puerto 5173):

```bash
cd /Volumes/ORICO/projects/personal/tesis-project/sigeda-web
pnpm dev
```

Abra **http://localhost:5173** en Chrome, en ventana normal, con zoom al 100 %.

### 0.2 Comprobaciones rápidas

- Entre como `instructor.perez`: en **Mi cohorte** debe verse el turno de hoy a las **15:00–16:30** con Oscar Lopez.
- Entre como `alumno.lopez` → **Documentos**: deben estar los cuatro documentos del PDI con estado *Listo*.
- Entre como `alumno.quispe`: debe verse el pase dorado **Egresaste** con la constancia `CE-<año>-008-01` (egresó hace 4 días).

Si algo de esto no aparece, repita el paso 3 y reinicie el backend (paso 4).

### 0.3 Cuentas (contraseña de todas: `123`)

| Rol | Usuario | Persona |
|---|---|---|
| Coordinador Académico | `coordinador.rivas` | Elena Rivas |
| Instructor | `instructor.perez` | Juan Torres |
| Jefe de Operaciones | `jefe.operaciones` | Carlos Vargas |
| Comandante de Escuadrón | `comandante.aguirre` | Jorge Aguirre |
| Alumno en curso | `alumno.lopez` | Oscar Lopez (Grupo 1) |
| Alumna egresada | `alumno.quispe` | Rosa Quispe (Promoción 2026-II) |

Para cambiar de rol: menú del usuario (arriba a la derecha) → **Cerrar sesión**, y entrar con la otra cuenta.

---

## Acto 1 · Inicio del curso (3 min)

**Mensaje:** el aeroclub no tenía reglas escritas; SIGEDA las fija y las hace cumplir.

1. Abra **http://localhost:5173** (la web pública, sin sesión). Baje a **Cursos**.
   > «La postulación solo se abre cuando el curso tiene una convocatoria de admisión: aquí, Admisión 2026-I.»
2. Pulse **Postular** y luego **Llenar con un aspirante de ejemplo** (el botón punteado sobre «Tus datos»; solo
   aparece en modo desarrollo, `pnpm dev`). Llena los datos de Mateo Quispe Rojas con un DNI nuevo cada vez y
   adjunta los siete archivos, incluidos la constancia de inglés (opcional) y el certificado médico.
   Recorra el formulario mostrando los datos, el modelo de **declaración jurada** prellenado y los documentos, y
   pulse **Enviar postulación**.
   > Si prefiere llenarlo a mano, los archivos están en [`archivos-de-ejemplo/`](archivos-de-ejemplo/).
   > «Sin crear cuenta: el aspirante recibe un **código de postulación** para seguir su trámite.»
   Anote el código que aparece.
3. Entre como **`coordinador.rivas`**. Vaya a **Convocatorias** y luego a **Matrículas**.
   > «La convocatoria fija vacantes y fechas, y enruta a los admitidos a la cohorte Promoción 2026-I.»
4. Abra la postulación de Mateo Quispe:
   - **Validar documentación**.
   - En la pestaña de validadas, abra de nuevo la postulación y pulse **Aceptar** en el certificado médico:
     se abre un diálogo que pide **Vigente hasta** (por ejemplo, dentro de 10 meses) → **Aceptar documento**.
     > «El médico se acepta con su vencimiento: la ficha de licencia lo toma de aquí, y si vence durante el curso
     > el instructor recibe una alerta.»
   - **Aceptar** la constancia de inglés: **Nivel de inglés** `Operacional (4)` y su vigencia → **Aceptar documento**.
   - **Citación**: fecha de hoy, 09:00, Hangar 2 → **Citar**.
   - **Evaluación de admisión**: examen 16 → **Registrar evaluación**.
     > «El resultado no se elige: se **deriva** de la nota (mínimo 14), la entrevista y la evaluación psicológica.»
   - **Pago de matrícula**: monto 1500, N.º de operación `OP-001` → **Registrar pago**.
5. Vaya a **Grupos** → **Promoción 2026-I** → **Modificar**. Marque a Mateo Quispe, elija como instructor
   responsable a **Juan Torres Perez** → **Guardar grupo**.
   > «Hasta 20 alumnos por grupo, con un instructor responsable.»
6. En el detalle del grupo pulse **Iniciar cohorte**.
   > «Exige instructor, alumnos y pagos confirmados. Si falta algo, dice qué. Al iniciar fija el inicio y el
   > fin previsto: 81 días hábiles.»

## Acto 2 · Desarrollo: el aula virtual (2 min)

**Mensaje:** la plataforma se ordena por el programa PDI EA-510, no por menús.

1. Entre como **`alumno.lopez`**. Llega a **Mi curso**.
   > «Su próximo vuelo como pase de embarque: fecha, aeronave, misión e instructor. Debajo, todo el programa:
   > instrucción en tierra y las 5 fases con sus 12 sub fases. La sub fase en curso está en dorado y cada punto
   > es una misión de la Tabla 4.»
2. Entre como **`instructor.perez`**. Llega a **Mi cohorte**.
   > «Los turnos de hoy con sus alumnos, cuántos alumnos hay en cada sub fase, los vuelos por evaluar y las
   > alertas (por ejemplo, la primera parte de tierra pendiente o una subsanación).»

## Acto 3 · Instrucción en tierra y en el aire (2 min)

1. Siga como **`instructor.perez`**. Vaya a **Turnos teóricos** y luego a **Banco de preguntas**.
   > «Clases y exámenes en línea por asignatura, calificados automáticamente. La primera parte de tierra se
   > aprueba antes de volar solo; un desaprobado va a subsanación.»
2. Vuelva a **Inicio** (Mi cohorte). En el turno de hoy pulse **Evaluar** junto a Oscar Lopez.
3. El formulario ya viene prellenado: nombre propuesto («Ponderada Control Básico»), categoría sugerida y
   **cada maniobra en su estándar requerido (B)**. Marque **E** en una maniobra que estuvo sobre el estándar
   y pulse **Guardar evaluación**.
   > «Calificación por excepción, como se hace en la práctica: el instructor solo cambia las maniobras que
   > estuvieron bajo o sobre el estándar. Escala DIRBE contra el estándar de cada maniobra; el servidor calcula
   > la nota de misión y la clasifica (Bueno, Regular o Malo). Tres vuelos MALOS en la fase disparan el chequeo
   > de operaciones.»

## Acto 4 · Simulador: evaluación práctica (3 min)

**Mensaje:** hay evaluaciones prácticas que se hacen en el simulador antes de volar, y SIGEDA recibe los datos de
la cabina para proponer la calificación.

1. Entre como **`jefe.operaciones`**. Vaya a **Programación de turnos**.
   > «Hasta 5 alumnos por turno y solo cohortes en curso. Y una regla nueva: **Autorrotación** no se programa
   > sin aprobar antes en simulador «Emergencia en vuelo – falla de motor», y **Emergencias IFR y
   > Recuperación** sin aprobar «Pérdida de referencias visuales (IMC)». Si falta, el sistema lo dice al
   > programar el turno.» (En **Mi curso** el alumno ve esas sub fases con «Simulador · pendiente/aprobado».)
2. Vaya a **Sesiones** (simulador) → **Planificar sesión**. Elija el alumno **Oscar Lopez** y el instructor
   **Juan Torres** de las listas (la fecha ya es hoy) → **Planificar**.
3. Pulse **Iniciar**. La sesión pasa a *En curso* y aparece el panel **Cabina FNPT II**.
   > «En este momento el alumno vuela en el simulador físico. SIGEDA no ejecuta la simulación: la cabina le
   > envía sus datos y SIGEDA los evalúa.»
4. Pulse **Conectar cabina (simulación)** y deje correr el ejercicio (unos 25 s).
   > «Altitud, velocidad, RPM del rotor y velocidad vertical en vivo, con los eventos: falla de motor, entrada
   > en autorrotación, listas de chequeo, MAYDAY y la toma. Aquí la cabina es simulada; en producción estos
   > datos los envía el adaptador del simulador real.»
5. Al terminar aparece la **Propuesta del sistema**: un grado por competencia con su motivo.
   > «Reglas fijas sobre la telemetría: tiempo de reacción a la falla, RPM del rotor en rango, cuándo declaró
   > la emergencia, cuántas listas ejecutó y a qué velocidad vertical terminó.»
6. Pulse **Calificar con esta propuesta**: los grados y comentarios llegan precargados. Ajuste uno si quiere y
   pulse **Guardar calificación**.
   > «El instructor decide: la propuesta no califica sola. Un indicador en 1 da **No competente**; aprobar el
   > escenario habilita volar la sub fase que lo exige. Las horas de simulador acreditan a la licencia, con
   > tope de 5 h, y la sesión no altera la nota DIRBE ni el NFPI.»

## Acto 5 · Aprendizaje asistido por IA (2 min)

1. Entre como **`alumno.lopez`**. Vaya a **Documentos**.
   > «El material del PDI que sube el alumno se procesa y se etiqueta automáticamente.»
2. Vaya a **Cuestionario de práctica**. Marque **pdi-calificacion-del-vuelo.txt**, cantidad **3**,
   **Generar cuestionario** (tarda de 10 a 60 segundos).
   > «La IA genera las preguntas solo a partir del material elegido; se corrigen al entregar.»
3. Vaya a **Consultas**. Marque **pdi-calificacion-del-vuelo.txt** y pregunte: *¿Cuándo un vuelo se califica como VUELO MALO?* →
   **Enviar**.
   > «El asistente responde con el material del curso, no de memoria.»

## Acto 6 · Seguimiento y proyección (2 min)

1. Entre como **`comandante.aguirre`** (ve a todos los alumnos; un instructor solo ve a los suyos). Vaya a
   **Seguimiento → Proyección**.
   > «Riesgo y tendencia de cada alumno, calculados con sus evaluaciones de vuelo reales.»
2. Abra **Ana Torres**.
   > «Riesgo alto con tendencia a la baja: proyección, desglose por maniobra y recomendaciones, antes de que
   > llegue el chequeo. Con menos de 3 evaluaciones el sistema dice que no hay datos suficientes.»
3. Abra el legajo de Ana Torres (**Seguimiento**, alumno `666666`), luego **Alertas** y **Reportes**
   (orden de mérito).
   > «La cadena del PDI: nota → NSF → NIT → NIA → NFPI, con sus causales. El orden de mérito sale del NFPI.»

## Acto 7 · Finalización: egreso, constancia y licencia (3 min)

**Mensaje:** el curso termina con reglas, no con una firma suelta.

1. Entre como **`coordinador.rivas`**. Vaya a **Grupos → Grupo 1** y baje a **Cierre de la cohorte**.
   > «Un alumno egresa con las 12 sub fases completas, toda la tierra aprobada y sin chequeo ni deliberación
   > abiertos. La cohorte no cierra mientras alguien no egrese o tenga baja (decisión del Consejo de Evaluación
   > de Vuelos o retiro); el sistema dice quién falta. Vencido el plazo máximo de 120 días hábiles, los
   > pendientes quedan como *No culminó*.»
2. Vaya a **Grupos → Promoción 2026-II** (cohorte ya cerrada) y baje al **Acta de cierre**.
   > «Al cerrar se congelan el NFPI, el puesto, las horas y el número de constancia: después ya no cambian.»
3. En la fila de Rosa Quispe pulse **Licencia**.
   > «La ficha de licencia PP-H solo se abre para egresados, y al egresar ya viene casi completa: las horas por
   > tipo salen de las misiones del curso (el programa tiene misiones **solo**, de **travesía**, la travesía de
   > 100 NM y la fase **nocturna**); la secundaria, el médico y el inglés salen de la admisión; y la declaración
   > del instructor se emite al egresar. **Solo le falta el examen teórico ante la DGAC**, que se rinde
   > después del curso.»
4. Entre como **`alumno.quispe`**.
   > «La alumna ve su pase de egreso: constancia, NFPI y orden de mérito, y la ruta hacia su licencia: solo le
   > falta el examen teórico DGAC.»
5. Pulse **Ver constancia** (y, si quiere, **Imprimir**).
   > «La constancia de egreso acredita el curso del CIAC que exige el §61.235 de la RAP 61 para rendir el
   > examen teórico ante la DGAC.»

---

## Preguntas probables del jurado

- **«¿La cabina está realmente conectada?»** En la demo, no: un generador reproduce lo que enviaría la cabina, y
  el botón solo existe en modo desarrollo. Lo real es todo lo demás: el endpoint de ingesta que recibe los datos,
  las reglas que proponen los grados y el registro de la sesión. Conectar un simulador real es escribir su
  adaptador hacia ese endpoint.
- **«¿Por qué la evaluación de vuelo viene prellenada?»** Para pedir menos datos: el instructor confirma el
  estándar y marca solo las excepciones, que es como se califica en la práctica.

- **«¿De dónde salen las horas solo y nocturnas si la Tabla 4 no las indica?»** De una regla fija documentada
  (migración 041): son solo CM-7, CP-4/5, NL-5/6, NR-6/7 y NC-3/4 (11.3 h, 5.5 h de travesía); NC-4 es la
  travesía de 100 NM; la fase Vuelo Nocturno da las horas y los 10 despegues y aterrizajes nocturnos. Así el
  curso cubre los mínimos de la RAP 61 para el PP-H.

- **«¿El sistema corre la simulación?»** No. La simulación la ejecuta el simulador certificado (FNPT II). SIGEDA
  gestiona su ciclo (planificar, iniciar, calificar, debrief) y lleva las horas a la licencia, con tope de 5 h.
  Integrar la telemetría del simulador (por ejemplo, importar los datos de vuelo para el debrief) queda como
  trabajo futuro; la calificación sigue siendo del instructor, como exige el enfoque CBTA.
- **«¿Por qué la sesión de simulador no cambia la nota del alumno?»** Porque es una evaluación formativa por
  competencias (escala CBTA 1–5), separada del cálculo DIRBE del PDI EA-510.

## Si algo falla en vivo

- **Una pantalla de IA tarda o falla** (cuestionario o consultas): diga que depende del proveedor del modelo
  y muestre ese tramo en el video. Si el registro del servicio de IA dice `invalid x-api-key`, la clave de
  Anthropic venció: cámbiela en `sigeda_chat_status/.env` (`ANTHROPIC_API_KEY=`) y reinicie el servicio.- **El turno de hoy no aparece**: la semilla pone el turno en la fecha del día en que se reinició la base;
  repita el paso 0.1-3 y reinicie el backend.
- **«La cohorte aún no puede iniciar»** en el acto 1: falta el pago o el instructor; el mensaje dice cuál.
  Es también una buena demostración de las reglas.
- Cada demo deja datos (la postulación, la evaluación, la sesión de simulador). Para ensayar de nuevo,
  reinicie la base (paso 0.1-3 y 4).
