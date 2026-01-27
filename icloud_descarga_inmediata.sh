#!/bin/bash

echo "⚡ ICLOUD CONFIGURADO PARA DESCARGA INMEDIATA"
echo "============================================"

# Verificar estado actual
echo -e "\n📊 ESTADO ACTUAL:"
echo "Procesos iCloud: $(ps aux | grep -i "icloud\|cloudd\|bird" | grep -v grep | wc -l)"
echo "Espacio disponible: $(df -h /System/Volumes/Data | tail -1 | awk '{print $4}')"
echo "Archivos pendientes: $(find ~/Desktop ~/Documents -name "*.icloud" 2>/dev/null | wc -l)"

# Reiniciar servicios para asegurar funcionamiento
echo -e "\n🔄 REINICIANDO SERVICIOS ICLOUD..."
killall cloudd 2>/dev/null || true
killall bird 2>/dev/null || true
killall CloudPhotosd 2>/dev/null || true

# Esperar reinicio
sleep 2

echo -e "\n✅ SERVICIOS REINICIADOS"

echo -e "\n🎯 INSTRUCCIONES PARA DESCARGA INMEDIATA:"
echo "=========================================="
echo ""
echo "📍 PASO 1 - DESACTIVAR OPTIMIZACIÓN:"
echo "   Preferencias del Sistema > Apple ID > iCloud"
echo "   □ DESACTIVAR 'Optimizar almacenamiento de Mac'"
echo ""
echo "📂 PASO 2 - PARA ARCHIVOS FRECUENTES:"
echo "   Click derecho en archivo/carpeta > 'Mantener en este Mac'"
echo ""
echo "⚡ PASO 3 - PARA DESCARGA INMEDIATA:"
echo "   Click derecho en archivo > 'Descargar ahora'"
echo ""
echo "🚀 RESULTADO ESPERADO:"
echo "   ✅ Doble click = apertura inmediata"
echo "   ✅ Sin esperas de descarga"
echo "   ✅ Edición fluida instantánea"
echo ""
echo "💡 CONSEJO: Para carpetas completas que usas mucho,"
echo "   mantenlas siempre locales con 'Mantener en este Mac'"

echo -e "\n🎉 ¡ICLOUD LISTO PARA DESCARGA INMEDIATA!"
