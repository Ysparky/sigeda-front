# Decisiones técnicas

Registro de decisiones que no se leen en el código. El código no lleva comentarios; su porqué vive aquí.

## Herramientas

- **TypeScript 6.0, no 7.** La plantilla oficial de Vite (2026-09) fija `~6.0.2`; TypeScript 7 (compilador nativo) aún no es la base del ecosistema.
- **oxlint, no ESLint.** Es el linter de la plantilla oficial. `src/components/ui` y `src/hooks/use-mobile.ts` son código generado por shadcn y se excluyen.
- **shadcn/ui con base Radix y preset Nova.** Los componentes se generan con `pnpm dlx shadcn@4.21.0 add …` y no se editan a mano; cualquier ajuste visual va en `src/theme.css`.
- **`src/routeTree.gen.ts` se versiona.** Lo genera el plugin de TanStack Router, pero `tsc -b` lo necesita antes del build.
- **Las pruebas no viven en `src/routes/`.** El plugin del router trataría esos archivos como rutas.

## Sesión y permisos

- **Token de acceso en memoria, refresh token en `localStorage`.** Recargar la página no cierra la sesión; el token de acceso nunca queda persistido.
- **Los permisos replican `Role.java` en `src/lib/auth/permisos.ts`.** `Rol.permisos` no tiene mapeo JSON en el backend y, si se serializara, usaría los nombres de las constantes (`MANAGE_SHIFTS`) en lugar de los que evalúa `@PreAuthorize` (`Manage Shifts`). Si el backend cambia un rol, se actualiza la tabla y su prueba.
- **La sesión no trae datos de la persona.** `Usuario.getPersona()` está comentado en el backend; la interfaz muestra el nombre de usuario hasta que se exponga (dependencia 11 del spec).
- **Navegación por el router.** Iniciar o cerrar sesión solo cambia el estado de la sesión; `App` invalida el router y las guardas `beforeLoad` redirigen. Así no hay dos lugares que decidan a dónde ir.
- **Destino tras el login.** Solo se aceptan rutas internas, resueltas contra el origen actual (mismo origen, ruta que no empiece con `/login`), para evitar redirecciones abiertas.
- **El modo mock solo existe en desarrollo.** `import('./mocks/browser')` se guarda tras `import.meta.env.DEV && config.mockApi` para que Rollup elimine el chunk de MSW (con `USUARIOS_MOCK` y la contraseña `123`) del build de producción; `mockServiceWorker.js` vive en `public-mock/`, servido solo cuando `vite --mode mock` cambia el `publicDir`, y nunca en `pnpm build`.
- **Un 403 en `/auth/login` significa credenciales inválidas.** El despacho de errores de Spring tras un fallo de autenticación puede responder 401 o 403 según el filtro que lo intercepte primero; `sesion.iniciar` trata ambos como el mismo `MENSAJE_CREDENCIALES` sin distinguir cuál falló.

## Formularios y errores

- **Contraseña nueva de al menos 8 caracteres.** Es una política del frontend; el backend no valida longitud.
- **El cambio de contraseña envía también el `username` actual.** `PUT /api/usuarios/{id}` sobrescribe el nombre con lo que recibe.
- **El 404 de una lista es una lista vacía.** `sigeda-back` responde 404 cuando una página no tiene resultados.
- **El campo `mensaje` de los errores del backend va a la consola.** Suele contener SQL; al usuario solo se le muestra `error`.

## Turnos y evaluaciones (M1)

Las decisiones M1-1 a M1-12 están en el §13 del spec; aquí queda cómo se aplicaron y lo que se decidió al implementarlas.

- **Contrato primero (M1-1).** `src/mocks/sigeda/turnos.ts`, `evaluaciones.ts` y `catalogos.ts` implementan `docs/contrato-api-turnos.md`. Los adaptadores de `src/features/*/api.ts` aceptan también las formas actuales del backend: `200` con la entidad cruda al guardar un turno, `cantGrupo` en la lista y un detalle sin `alumnosTurno`.
- **Errores (M1-2).** `normalizarError` entiende `ErrorResponse` (`messages[]` → campos, `message` → mensaje), `{ mensaje }` y `{ "mensaje:": [] }` incluso con 403, y el 410 de un turno vencido. `aplicarErroresDeCampo` lleva cada error de campo del backend a su campo (`alumnosTurno[0].horaInicio` → `alumnosTurno.0.horaInicio`).
- **Selectores nativos.** Los formularios y filtros usan `native-select` de shadcn: las opciones deshabilitadas (aeronaves no disponibles) y los grupos de alumnos son nativos y accesibles.
- **Tabla con TanStack Table v9.** `DataTable` usa `useTable` con ordenamiento y paginación manuales; la página, el tamaño y el orden viven en la URL (`page`, `size`, `property`, `direction`) y el servidor pagina y ordena. Se muestran 10 filas (el backend usa 6 por defecto).
- **Filtros en la URL.** Cada lista valida su búsqueda con zod (`.default().catch()`): una URL mal escrita vuelve a los valores por defecto en lugar de fallar. El código de alumno se lee con `z.coerce.string()` porque el router convierte `?alumno=555555` en número.
- **Lo propio del alumno (CA-TUR-14, CA-EVA-10).** El alumno y el personal comparten el permiso `Read`, así que las listas generales (`/turnos`, `/turnos/dia`, `/evaluaciones`) declaran los roles del personal, y Mis turnos y Mis evaluaciones el rol Alumno. En los detalles, el cargador de la ruta rechaza a un alumno que no vuela en el turno o que no es dueño de la evaluación. Es la única comprobación por nombre de rol.
- **Detalles con cargador.** Las rutas de detalle cargan con `ensureQueryData`; un 404 del backend muestra la página no encontrada.
- **Migas de pan (M1-12).** Salen del registro de pantallas (`padre`); se omiten los niveles que el rol no puede abrir y no se muestran en Inicio.
- **Registrar evaluación (M1-6).** La acción la ve solo el instructor asignado al turno (§3.2 del spec: también registra los chequeos de sus turnos) y desaparece cuando el alumno ya tiene una evaluación en ese turno. La página repite ambas comprobaciones si se entra por URL. Las categorías son las que sugiere `GET /api/personas/{cod}/status`.
- **Última evaluación (M1-8).** Ningún endpoint expone `codEvalRealizada`; la interfaz toma como última la de fecha más reciente y, a igual fecha, la de mayor turno y correlativo del código. El backend decide al final y su 403 se muestra tal cual.
- **Modificar una evaluación.** La categoría no cambia. `codEvaluador` es `@Transient` y llega vacío en el detalle, así que en Chequeo y Complementación hay que volver a indicarlo.
- **Formulario de turno.** Cambiar el programa quita el instructor y los alumnos (dependen del programa). Al modificar, programa y sub fase son de solo lectura (`TurnoUpdate` no los acepta) y la sub fase se recupera por nombre porque el detalle no trae su id. Una maniobra con nota mínima D queda calificada D.
- **Cruce de horarios (M1-10).** Se advierte con los turnos de la misma aeronave ese día y se pide confirmación al guardar; el backend decide (dependencia 15).
- **Orden de vuelo.** `/turnos/dia` abre el día de hoy; el briefing diario se ubica 2 h antes del primer vuelo del día.
- **Datos de prueba.** Parten del seed: los turnos sembrados reciben instructor y aeronave (en el seed son nulos), se agregan dos turnos a una semana de la fecha actual, el alumno 777777 está En Chequeo, se agrega la evaluación 111111-1 y se omiten las filas mal formadas 555555-3-5 y 555555-3-2. El usuario `instructor.mendoza` del seed se suma a los usuarios de prueba.
- **Sesión más robusta (revisión final de M0).** Una respuesta 2xx de `/auth/refresh` que no es JSON cuenta como servicio no disponible y conserva el refresh token; `destinoSeguro` rechaza también las rutas que el navegador normaliza a `//…` (por ejemplo `/x/..//evil.com`); `sesion.restaurar` solo borra los tokens cuando el perfil responde 401, 403 o 404, no ante una falla de red o del servidor.
- **Errores 4xx y 5xx.** En un 5xx nunca se muestra `message`, `messages`, `mensaje` ni un texto plano (van a la consola): solo `error` o el mensaje genérico. En un 4xx con forma `ErrorResponse` se muestra `message` y, si no hay, `error`.
- **Errores de carga.** Si en la primera carga falla una consulta de la que depende la pantalla (los catálogos al modificar un turno; los alumnos y la última evaluación en Evaluaciones; los datos de Registrar y Modificar evaluación), se muestra un aviso con el mensaje en lugar de un formulario incompleto, una lista vacía o un motivo equivocado. Una recarga en segundo plano que falla no desmonta un formulario en uso.
- **Debriefing solo bajo el estándar (M1-5).** Causa, observación y recomendación se validan y se envían solo para las calificaciones bajo el estándar; si una calificación vuelve al estándar, el texto que quedó oculto se descarta.
- **Estilos compartidos mientras la revisión de diseño sigue abierta.** Las pantallas de M1 no definen colores propios: los enlaces de texto usan `Enlace`/`EnlaceExterno` (`src/components/enlace.tsx`) y la convención de etiquetas del debriefing (observación roja, causa azul, recomendación sin color) vive en `CLASES_ETIQUETA_DEBRIEFING` de `src/lib/dominio/tonos.ts`. Un cambio de la revisión se hace en `theme.css` o en esos dos módulos.
- **Guardas verificadas.** `src/lib/auth/cobertura-de-rutas.test.ts` falla si una ruta de `/_app` no tiene pantalla registrada o si su archivo no llama a `exigirPantalla` con la pantalla de su propia ruta.
- **Sin Playwright todavía (M1-11).** Las pruebas de componente cubren los criterios contra los mocks del contrato; la suite E2E llega con el primer hito que corra contra un `sigeda-back` corregido.
