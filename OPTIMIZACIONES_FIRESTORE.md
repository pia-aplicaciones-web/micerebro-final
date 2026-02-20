# Optimizaciones de uso de Firestore (cuota)

Aplicadas para reducir lecturas y escrituras y evitar `resource-exhausted: Quota exceeded`.

## Cambios realizados

### 1. Debounce de autosave: 2s → 4s
- **Archivo:** `src/hooks/use-auto-save.ts` y elementos (notepad, sticky, text, etc.)
- **Efecto:** ~50% menos escrituras al editar texto
- Los cambios se guardan 4 segundos después de dejar de escribir (o al hacer blur)

### 2. Eliminado getDoc previo a updateDoc
- **Archivo:** `src/lib/store/boardStore.ts`
- **Efecto:** 1 lectura menos por cada actualización de elemento
- Antes: getDoc + updateDoc = 1 read + 1 write por update
- Ahora: solo updateDoc = 1 write por update

### 3. Logs reducidos
- Menos console.log en flujo normal para menor overhead

## Límites del plan Spark (gratis)
- 50,000 lecturas/día
- 20,000 escrituras/día

## Si sigues excediendo la cuota
1. **Upgrade a Blaze** – Pago por uso, más flexible
2. **Cerrar pestañas duplicadas** – Cada pestaña = listener activo = lecturas
3. **Evitar refrescos frecuentes** – Cada carga = snapshot completo
