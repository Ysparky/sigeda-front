import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

function haciaElBackend(destino: string): ProxyOptions {
  return {
    target: destino,
    changeOrigin: true,
    configure: (proxy) => proxy.on('proxyReq', (peticion) => peticion.removeHeader('origin')),
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routeFileIgnorePattern: '\\.test\\.tsx?$' }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Un solo origen para las tres cosas, que es lo que hace posible demostrar por túnel: el navegador
  // habla únicamente con Vite y Vite reparte.
  //
  // EL PROXY BORRA LA CABECERA `Origin`, Y SIN ESO NO FUNCIONA. Para el navegador la petición es del
  // mismo origen y no pide CORS, pero el proxy REENVÍA el `Origin` del navegador, y Spring Security
  // ve una cabecera que no está en su lista y responde **403 «Invalid CORS request»**. Quitarla deja
  // la petición como lo que ya es a esa altura: una llamada de servidor a servidor.
  //
  // NO SE VE CON `curl`: curl no manda `Origin`, así que comprobarlo así da 200 mientras el
  // navegador recibe 403. Para probarlo hay que mandar la cabecera a mano.
  // En desarrollo este proxy está inerte: `.env` apunta a `localhost:8080` y `localhost:3000`, que
  // son absolutos y no pasan por acá.
  // Los prefijos no se pisan: `sigeda-back` vive bajo /api y /auth, y el de IA cuelga sus rutas de
  // la raíz, así que se enumeran una por una.
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
    // Detrás del túnel el cliente llega por 443, no por 5173: sin esto el navegador del que abre el
    // enlace intenta el websocket de HMR contra `wss://<host>:5173`, falla, y Vite le muestra un
    // error de conexión encima de la página. La aplicación funciona igual, pero parece rota.
    ...(process.env.TUNEL ? { hmr: { clientPort: 443, protocol: 'wss' as const } } : {}),
    proxy: Object.fromEntries(
      [
        ...['/api', '/auth'].map((ruta) => [ruta, 'http://localhost:8080'] as const),
        ...['/documents', '/quizzes', '/attempts', '/chat', '/prediction'].map(
          (ruta) => [ruta, 'http://localhost:3000'] as const,
        ),
      ].map(([ruta, destino]) => [ruta, haciaElBackend(destino)]),
    ),
  },
  publicDir: mode === 'mock' ? 'public-mock' : 'public',
}))
