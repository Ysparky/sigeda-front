#!/bin/sh
# Publica la demostración en una URL HTTPS temporal, sin cuenta, sin tarjeta y sin servidores.
#
# POR QUÉ UN SOLO TÚNEL Y NO TRES. El túnel apunta a Vite, y Vite reparte /api y /auth al backend
# de SIGEDA y /documents, /quizzes, /attempts, /chat y /prediction al de IA (ver vite.config.ts).
# Todo queda en el MISMO ORIGEN, así que no hay CORS que configurar en ninguno de los dos backends.
#
# LA URL CAMBIA EN CADA CORRIDA: es un túnel efímero de Cloudflare. Por eso este script la descubre
# y la escribe en .env antes de arrancar Vite, que lee ese archivo UNA VEZ al iniciar.
#
# Requiere los dos backends ya levantados (8080 y 3000). Ver demo-runbook.md.
set -e
cd "$(dirname "$0")/.."

[ -f .env ] && cp .env .env.antes-del-tunel && echo "· .env guardado en .env.antes-del-tunel"

REGISTRO=$(mktemp)
cloudflared tunnel --url http://localhost:5173 --no-autoupdate > "$REGISTRO" 2>&1 &
TUNEL=$!
trap 'kill $TUNEL 2>/dev/null; [ -f .env.antes-del-tunel ] && mv .env.antes-del-tunel .env && echo "· .env restaurado"' EXIT

echo "· esperando la URL del túnel…"
URL=""
for _ in $(seq 1 60); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$REGISTRO" | head -1) && [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "No apareció la URL. Registro:"; cat "$REGISTRO"; exit 1; }

cat > .env <<ENV
VITE_SIGEDA_API_URL=$URL
VITE_IA_API_URL=$URL
VITE_MOCK_API=false
VITE_DEPENDENCIAS_RESUELTAS=$(grep '^VITE_DEPENDENCIAS_RESUELTAS=' .env.antes-del-tunel 2>/dev/null | cut -d= -f2-)
ENV

echo
echo "  ┌─────────────────────────────────────────────────────────────"
echo "  │  $URL"
echo "  └─────────────────────────────────────────────────────────────"
echo
echo "· Ctrl-C cierra el túnel y restaura el .env de antes."
echo
pnpm dev
