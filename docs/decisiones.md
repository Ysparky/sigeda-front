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
- **Lo propio del alumno (CA-TUR-14, CA-EVA-10).** El alumno y el personal comparten el permiso `Read`, así que las listas generales (`/turnos`, `/turnos/dia`, `/evaluaciones`) declaran los roles del personal, y Mis turnos y Mis evaluaciones el rol Alumno. En los detalles, el cargador de la ruta rechaza a un alumno que no vuela en el turno o que no es dueño de la evaluación. En un turno compartido, el alumno ve solo su propio vuelo: ni las tarjetas ni las evaluaciones de sus compañeros. Es la única comprobación por nombre de rol.
- **Detalles con cargador.** Las rutas de detalle cargan con `ensureQueryData`; un 404 del backend muestra la página no encontrada.
- **Rutas con códigos.** El cargador de `/evaluaciones/$cod` valida el código (`^\d{6}-\d+(-\d+)?$`) antes de pedir nada al backend y, si no calza, muestra la página no encontrada. Los adaptadores de `src/features/*/api.ts` codifican con `encodeURIComponent` cada segmento que interpolan en la ruta, así que un parámetro no puede salirse de su endpoint.
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
- **Errores de carga.** Un error de consulta se muestra solo si la consulta nunca trajo datos (`errorDePrimeraCarga` en `src/lib/query.ts`): una recarga en segundo plano que falla conserva lo que ya se ve y no desmonta un formulario en uso. Si en la primera carga falla una consulta de la que depende la pantalla (las listas de turnos y de evaluaciones, Mis turnos, la orden de vuelo, los catálogos al modificar un turno, los alumnos y la última evaluación en Evaluaciones, los datos de Registrar y Modificar evaluación), `AvisoDeError` muestra el mensaje con el botón «Reintentar» en lugar de un formulario incompleto, una lista vacía o un motivo equivocado. Los catálogos de los filtros y del formulario de turno no bloquean la pantalla: bajo el selector afectado aparece «No se pudieron cargar …». En el detalle del turno, si falla la evaluación de un alumno, su tarjeta muestra el aviso con «Reintentar» en lugar del ciclo de la misión y no la da por pendiente.
- **Debriefing solo bajo el estándar (M1-5).** Causa, observación y recomendación se validan y se envían solo para las calificaciones bajo el estándar; si una calificación vuelve al estándar, el texto que quedó oculto se descarta.
- **Estilos compartidos mientras la revisión de diseño sigue abierta.** Las pantallas de M1 no definen colores propios: los enlaces de texto usan `Enlace`/`EnlaceExterno` (`src/components/enlace.tsx`) y la convención de etiquetas del debriefing (observación roja, causa azul, recomendación sin color) vive en `CLASES_ETIQUETA_DEBRIEFING` de `src/lib/dominio/tonos.ts`. Un cambio de la revisión se hace en `theme.css` o en esos dos módulos.
- **Guardas verificadas.** `src/lib/auth/cobertura-de-rutas.test.ts` falla si una ruta de `/_app` no tiene pantalla registrada o si su archivo no llama a `exigirPantalla` con la pantalla de su propia ruta.
- **Sin Playwright todavía (M1-11).** Las pruebas de componente cubren los criterios contra los mocks del contrato; la suite E2E llega con el primer hito que corra contra un `sigeda-back` corregido.

## Matrícula y programa (M2)

Las decisiones M2-1 a M2-15 están en el §14 del spec; aquí queda cómo se aplicaron y lo que se decidió al implementarlas.

- **Contrato primero (M2-1, M2-9).** `src/mocks/sigeda/{personas,cuentas,grupos,fases,maniobras,materias}.ts` implementan `docs/contrato-api-matricula.md` (y su §6 para materias). Los adaptadores toleran las respuestas de hoy: un detalle de persona sin `usuario.id` (se resuelve con `GET /api/personas/{username}`, dependencia 26), una lista sin `tipo` (dependencia 27), un detalle de maniobra sin `subfases` (dependencia 33) y un `POST /api/personas` que no devuelva `usuario`.
- **Una carpeta por entidad.** `src/features/{personas,cuentas,grupos,fases,maniobras,materias}`, como en M1, en lugar de las carpetas `administracion/` y `programa/` del §4.1 del spec: cada pantalla queda junto a su API, sus esquemas y sus componentes.
- **La sesión sale de la persona (M2-10).** `sesion.cargar` llama solo a `GET /api/personas/{username}`; el encabezado y el saludo de Inicio muestran «Nombre ApellidoPaterno» (`nombreDeSesion`). Una cuenta sin rol es una cuenta inválida: se borran los tokens y el inicio de sesión muestra el aviso, que vive en el módulo de sesión (`sesion.aviso()`) porque la restauración ocurre antes de que exista el router.
- **Las respuestas de `/api/usuarios` solo aportan su `mensaje` (M2-3).** `soloMensaje` de `src/features/cuentas/api.ts` las lee con zod; la contraseña que el backend devuelve (hash o texto plano) nunca entra al estado ni a la consola. Lo usan Asignar rol, Restablecer contraseña y Cambiar contraseña.
- **Cambiar contraseña pide la contraseña actual.** El contrato (§2.3, dependencia 3) exige `passwordActual` sobre la propia cuenta; el backend de hoy la ignora, así que enviarla no rompe nada y prepara la corrección.
- **Un 403 con texto plano es una regla de negocio (M2-4).** `normalizarError` muestra ese texto (los motivos de Eliminar persona); un 403 con forma `ErrorResponse` o sin cuerpo sigue siendo «No tiene permisos para esta acción.».
- **Acciones con dependencia pendiente (M2-14).** `src/lib/dependencias.ts` lee `VITE_DEPENDENCIAS_RESUELTAS` y `config.mockApi` en cada llamada (por eso `config` expone `mockApi` y `dependenciasResueltas` como getters: las pruebas cambian el entorno con `vi.stubEnv`). Registrar persona (22), Eliminar persona (30), Modificar maniobra (32 y 33) y Eliminar fase (37) se deshabilitan con su aviso y sus rutas muestran el mismo texto.
- **Tipo y rol (M2-13).** `src/lib/dominio/personas.ts` guarda la tabla por nombre de rol; la usan el formulario de persona (propone el rol según el tipo), Modificar persona (ofrece los tipos compatibles con el rol) y Asignar rol (ofrece los roles compatibles con el tipo). El backend la comprobará por id de rol (dependencias 23 y 28).
- **Nada destructivo sobre la propia cuenta (M2-15).** En el detalle de la propia persona no se ofrecen Eliminar, Asignar rol ni Restablecer contraseña.
- **Listas paginadas con dos utilidades.** Personas y grupos usan `Page_Sort` (`property`); fases y maniobras usan `PageWithSort` (`properties`, tamaño máximo 10, orden solo por `id` o `nombre`), con su propio esquema de búsqueda (`esquemaPaginacionPrograma`).
- **Formularios con catálogos.** Los formularios cuyo `select` o lista de casillas depende de un catálogo (roles, alumnos sin grupo, subfases por fase) se montan recién cuando el catálogo cargó, y muestran el aviso con «Reintentar» si falla la primera carga. El selector de rol de Registrar persona es controlado porque sus opciones cambian con el tipo.
- **Textos fijos.** Los avisos T1–T13 viven junto a su pantalla (`TEXTO_SOLO_RANGO_Y_TIPO`, `TEXTO_PROGRAMA_FIJO`, `TEXTO_CUENTA_*`) y los del programa (T3–T7, T12) y los avisos de fases, maniobras y estándares (T14–T20) en `src/lib/dominio/programa.ts`.
- **Datos de prueba.** Las 10 cuentas del seed más `comandante.aguirre` (solo en los mocks) y `raul.paredes` (cuenta sin rol, no inicia sesión). Se agregan `654321` Lucía Mendoza Ríos (alumna sin grupo ni cuenta, la única que se puede eliminar) y la maniobra 11 «Autorrotación» (sin estándares ni turnos), porque ninguna maniobra del seed se puede eliminar. Las materias son las 11 del PDI; la 3 (Adoctrinamiento de Vuelo) responde 409 al eliminarla.
- **Los toasts no se filtran entre pruebas.** `src/test/setup.ts` llama a `toast.dismiss()` después de cada prueba: sonner guarda su estado fuera de React y dos pruebas seguidas con el mismo mensaje se pisaban.
