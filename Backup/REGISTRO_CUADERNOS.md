# Registro: Botón Cuadernos

**Fecha:** 11 Dic 2025  
**Archivo:** `src/components/canvas/tools-sidebar.tsx`  
**Líneas:** 361-418

## Estado Actual

### Header del Elemento
- **Icono:** `BookCopy` (lucide-react)
- **Label:** "Cuaderno"
- **Tipo:** DropdownMenu

### Desplegables

1. **Agregar Cuaderno**
   - Icono: Plus
   - Acción: `handleAddElement('notepad')`

2. **Nuevo Cuaderno Amarillo**
   - Icono: Plus
   - Acción: `handleAddElement('yellow-notepad')`

3. **Cuadernos Abiertos ({count})**
   - Tipo: DropdownMenuSub
   - Condición: `notepadsOnCanvas.length > 0`
   - Contenido: Lista de cuadernos visibles (hidden !== true)
   - Acción por item: `onLocateElement(notepad.id)`

4. **Cerrados ({count})**
   - Tipo: DropdownMenuSub
   - Icono item: EyeOff
   - Condición: `hiddenNotepads.length > 0`
   - Contenido: Lista de cuadernos ocultos (hidden === true)
   - Acción por item: `onOpenNotepad(notepad.id)`

## Filtros de Elementos

```typescript
const allNotepads = useMemo(
  () => (Array.isArray(elements) ? elements : []).filter((el) => el.type === 'notepad'),
  [elements]
);

const notepadsOnCanvas = useMemo(
  () => (Array.isArray(allNotepads) ? allNotepads : []).filter((el) => el.hidden !== true),
  [allNotepads]
);

const hiddenNotepads = useMemo(
  () => (Array.isArray(allNotepads) ? allNotepads : []).filter((el) => el.hidden === true),
  [allNotepads]
);
```

## Tipos de Cuaderno Soportados
- `notepad` - Cuaderno estándar
- `yellow-notepad` - Cuaderno amarillo

## Estado: ✅ FUNCIONAL
