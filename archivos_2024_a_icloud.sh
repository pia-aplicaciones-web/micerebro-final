#!/bin/bash

echo "📅 ORGANIZACIÓN DE ARCHIVOS 2024 EN ICLOUD"
echo "=========================================="

# Crear directorio en iCloud si no existe
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Archivos 2024"
if [ ! -d "$ICLOUD_DIR" ]; then
    mkdir -p "$ICLOUD_DIR" 2>/dev/null
    echo "✅ Carpeta 'Archivos 2024' creada en iCloud Drive"
else
    echo "✅ Carpeta 'Archivos 2024' ya existe en iCloud Drive"
fi

echo -e "\n🔍 BUSCANDO ARCHIVOS DEL 2024:"
echo "================================="

# Buscar archivos modificados en 2024
echo "Archivos modificados en 2024:"
find ~/Desktop ~/Documents ~/Downloads -type f -newermt "2024-01-01" ! -newermt "2025-01-01" 2>/dev/null | head -10

# Contar archivos
TOTAL_2024=$(find ~/Desktop ~/Documents ~/Downloads -type f -newermt "2024-01-01" ! -newermt "2025-01-01" 2>/dev/null | wc -l)
echo -e "\n📊 TOTAL ARCHIVOS 2024 ENCONTRADOS: $TOTAL_2024"

echo -e "\n📂 INSTRUCCIONES PARA MOVER ARCHIVOS:"
echo "====================================="
echo "1. Los archivos listados arriba son del 2024"
echo "2. Mueve manualmente los archivos importantes a:"
echo "   $HOME/Library/Mobile Documents/com~apple~CloudDocs/Archivos 2024/"
echo "3. Después del movimiento:"
echo "   - Click derecho en la carpeta 'Archivos 2024'"
echo "   - Selecciona 'Eliminar descarga local'"
echo "   - Los archivos quedarán SOLO en iCloud"

echo -e "\n💾 ESPACIO QUE PUEDES LIBERAR:"
echo "================================"
# Calcular tamaño aproximado (solo archivos, no carpetas)
SIZE_2024=$(find ~/Desktop ~/Documents ~/Downloads -type f -newermt "2024-01-01" ! -newermt "2025-01-01" -exec ls -lh {} \; 2>/dev/null | awk '{sum += $5} END {print sum/1024/1024 " MB"}')
echo "Archivos 2024 encontrados: ~$SIZE_2024"

echo -e "\n⚠️  IMPORTANTE:"
echo "=============="
echo "• Respaldar archivos importantes ANTES de mover"
echo "• La carpeta 'Archivos 2024' quedará solo en iCloud"
echo "• Podrás acceder desde cualquier dispositivo"
echo "• Si necesitas editar, se descargarán automáticamente"

echo -e "\n🎯 RESULTADO ESPERADO:"
echo "======================"
echo "✅ Archivos 2024 organizados en iCloud"
echo "✅ Espacio liberado en tu Mac"
echo "✅ Acceso desde cualquier dispositivo"
echo "✅ Archivos solo en la nube, no localmente"
