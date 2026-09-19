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

## Alcance diferido a M1

- Migas de pan: llegan con las primeras pantallas anidadas (detalle de turno).
- Suite Playwright: arranca con los flujos de M1 contra los backends reales.
