/**
 * Falla antes de la primera prueba si el entorno no es el que estas pruebas dicen ejercitar.
 * Sin esto, una suite apuntada a los mocks pasaría en verde y no probaría ninguna integración,
 * que es justo la confusión que estas pruebas existen para evitar.
 */
export default async function comprobarEntorno() {
  const api = process.env.VITE_SIGEDA_API_URL ?? 'http://localhost:8080'

  let respuesta: Response
  try {
    respuesta = await fetch(`${api}/api/materias`)
  } catch (causa) {
    throw new Error(
      `No hay backend en ${api}. Levantalo con el perfil dev antes de correr estas pruebas:\n` +
        `  cd sigeda-back && SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5544/sigeda_demo?prepareThreshold=0' \\\n` +
        `    sh ./mvnw -o spring-boot:run -Dspring-boot.run.profiles=dev\n` +
        `Detalle: ${String(causa)}`,
    )
  }

  // 401 es la respuesta correcta sin token: significa que el backend está vivo y con seguridad.
  if (respuesta.status !== 401) {
    throw new Error(
      `El backend en ${api} respondió ${respuesta.status} a /api/materias sin token, y debería ser 401. ` +
        `O no es el backend de SIGEDA, o su seguridad no está activa.`,
    )
  }

  const login = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin.sistema', password: '123' }),
  })
  if (!login.ok) {
    throw new Error(
      `El backend en ${api} no acepta la cuenta sembrada admin.sistema/123 (${login.status}). ` +
        `¿La base tiene la semilla de data_prod.sql?`,
    )
  }
}
