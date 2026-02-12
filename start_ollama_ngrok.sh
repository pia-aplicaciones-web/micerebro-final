#!/bin/bash
# Script para Ollama + ngrok listo para Cursor

# 1️⃣ Detener procesos previos
pkill ollama 2>/dev/null
pkill ngrok 2>/dev/null

# 2️⃣ Levantar Ollama en modo servidor en segundo plano
echo "🚀 Levantando Ollama en http://localhost:11434 ..."
nohup ollama serve > ~/ollama.log 2>&1 &

# Esperar 3 segundos para que Ollama arranque
sleep 3

# 3️⃣ Levantar ngrok apuntando al puerto de Ollama
echo "🌐 Levantando ngrok para exponer localhost:11434 ..."
nohup ngrok http 11434 > ~/ngrok.log 2>&1 &

# Esperar 3 segundos para que ngrok arranque
sleep 3

# 4️⃣ Obtener la URL pública de ngrok
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')

# 5️⃣ Mostrar resultados
echo ""
echo "✅ Ollama y ngrok levantados."
echo "URL pública para Cursor: $NGROK_URL"
echo ""
echo "Configura en Cursor:"
echo "  Name: deepseek-coder"
echo "  Provider: OpenAI Compatible"
echo "  Base URL: $NGROK_URL"
echo "  API Key: local-ollama"
echo ""
echo "Para probar loc/tags"

