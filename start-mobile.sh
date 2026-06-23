#!/bin/bash
# Script para iniciar InvestTracker y exponerlo para acceso móvil de forma dinámica.

echo "🚀 Iniciando InvestTracker para Acceso Móvil..."

# Detener procesos anteriores en puerto 3000
echo "🧹 Limpiando puerto del frontend (3000)..."
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

# Matar procesos antiguos de localtunnel
pkill -f "localtunnel" || true

# Limpiar archivos de log anteriores
rm -f /tmp/lt-backend.log /tmp/lt-frontend.log /tmp/next-dev.log

# Iniciar túnel del Backend (puerto 8000)
echo "🔒 Iniciando túnel del backend..."
npx -y localtunnel --port 8000 --subdomain investtracker-api-ef > /tmp/lt-backend.log 2>&1 &
LT_BACKEND_PID=$!

# Esperar a que el túnel del backend genere la URL
echo "⌛ Esperando URL del backend..."
BACKEND_URL=""
for i in {1..10}; do
  if [ -f /tmp/lt-backend.log ]; then
    BACKEND_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.loca\.lt" /tmp/lt-backend.log | head -n 1)
    if [ ! -z "$BACKEND_URL" ]; then
      break
    fi
  fi
  sleep 1
done

if [ -z "$BACKEND_URL" ]; then
  echo "⚠️ No se pudo obtener la URL de localtunnel para el backend. Usando fallback local..."
  BACKEND_URL="http://172.20.10.8:8000"
fi

echo "🔌 Backend expuesto en: $BACKEND_URL"

# Iniciar Next.js con la URL del backend dinámico
echo "💻 Iniciando servidor Next.js..."
cd frontend
NEXT_PUBLIC_API_URL="$BACKEND_URL" npm run dev > /tmp/next-dev.log 2>&1 &
NEXT_PID=$!
cd ..

# Iniciar túnel del Frontend (puerto 3000)
echo "🌐 Iniciando túnel del frontend..."
npx -y localtunnel --port 3000 --subdomain investtracker-ef > /tmp/lt-frontend.log 2>&1 &
LT_FRONTEND_PID=$!

# Esperar a que el túnel del frontend genere la URL
echo "⌛ Esperando URL del frontend..."
FRONTEND_URL=""
for i in {1..10}; do
  if [ -f /tmp/lt-frontend.log ]; then
    FRONTEND_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.loca\.lt" /tmp/lt-frontend.log | head -n 1)
    if [ ! -z "$FRONTEND_URL" ]; then
      break
    fi
  fi
  sleep 1
done

if [ -z "$FRONTEND_URL" ]; then
  echo "⚠️ No se pudo obtener la URL del frontend de localtunnel. Usando fallback de IP local..."
  FRONTEND_URL="http://172.20.10.8:3000"
fi

echo "--------------------------------------------------------"
echo "✨ ¡InvestTracker está listo para su uso móvil!"
echo "📱 Url de la WebApp: $FRONTEND_URL"
echo "🔌 Url del Backend: $BACKEND_URL"
echo "--------------------------------------------------------"
echo "Nota: Deja esta terminal abierta para mantener la conexión activa."
