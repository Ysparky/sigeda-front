import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routeFileIgnorePattern: '\\.test\\.tsx?$' }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Un solo origen para las tres cosas, que es lo que hace posible demostrar por túnel: el navegador
  // habla únicamente con Vite y Vite reparte. Al no haber petición entre orígenes, NO HAY CORS que
  // configurar — ni el de `sigeda-back` ni el del backend de IA intervienen.
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
      ].map(([ruta, destino]) => [ruta, { target: destino, changeOrigin: true }]),
    ),
  },
  publicDir: mode === 'mock' ? 'public-mock' : 'public',
}))
