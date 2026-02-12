#!/bin/bash
# Script para levantar Ollama y preparar Cursor localmente

# 1️⃣ Detener cualquier Ollama previa
pkill ollama 2>/dev/null

# 2️⃣ Levantar Ollama en modo servidor en segundo plano
echo "🚀 Levantando Ollama en http://localhost:11434 ..."
nohup ollama serve > ~/ollama.log 2>&1 &

# Esperar 3 segundos para que arranque
sleep 3

# 3️⃣ Verificar que Ollama está activo
echo "🔎 Verificando modelos disponibles..."
curl -s http://localhost:11434/api/tags | jq '.models[].name'

echo ""
echo "✅ Ollama levantado en localhost:11434"
echo "Ahora abre Cursor y agrega un modelo manual con estos datos:"
echo "  Name: deepseek-coder"
echo "  Provider: OpenAI Compatible"
echo "  Base URL: http://localhost:11434"
echo "  API Key: local-ollama"
echo ""
echo "Todo listo para usar tu modelo localmente 👍"

