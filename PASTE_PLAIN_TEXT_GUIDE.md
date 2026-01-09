# 📋 Sistema Global de Pegado de Texto Plano

## 🎯 **Problema Resuelto**

Cuando los usuarios copian texto desde otras aplicaciones (Word, navegadores, etc.) y lo pegan en elementos editables de Mi Cerebro, el texto mantiene estilos HTML/CSS externos que interfieren con las tipografías y colores propios de cada elemento.

## ✅ **Solución Implementada**

Sistema global que intercepta eventos de `paste` y limpia automáticamente todo el contenido HTML, dejando solo texto plano que adopta los estilos del elemento destino.

## 🔧 **Cómo Funciona**

### 1. **Hook `usePastePlainText`**
```typescript
// src/hooks/use-paste-plain-text.ts
const { handlePaste } = usePastePlainText();

// Se aplica a cualquier elemento editable:
// onPaste={handlePaste}
```

### 2. **Limpieza Automática**
- ✅ **Texto plano:** Se preserva completamente
- ❌ **Estilos HTML:** Se eliminan (`<b>`, `<i>`, `<span style="...">`)
- ❌ **Estilos CSS:** Se remueven
- ❌ **Atributos:** Se limpian
- ❌ **Caracteres de control:** Se eliminan

### 3. **Elementos Soportados**
- 📝 **Sticky Notes:** `contentEditable` divs
- 📄 **Text Elements:** `react-contenteditable`
- ✅ **Todo Lists:** `textarea` para tareas
- ✅ **Input Fields:** Todos los campos de entrada

## 📝 **Implementación por Componente**

### **Sticky Notes** (`sticky-note-element.tsx`)
```typescript
// Importar hook
import { usePastePlainText } from '@/hooks/use-paste-plain-text';

// Usar hook
const { handlePaste } = usePastePlainText();

// Aplicar al contentEditable
<div
  contentEditable={!isPreview}
  onPaste={handlePaste}
  // ... otros props
>
```

### **Text Elements** (`text-element.tsx`)
```typescript
// Importar hook
import { usePastePlainText } from '@/hooks/use-paste-plain-text';

// Usar hook
const { handlePaste } = usePastePlainText();

// Aplicar al ContentEditable
<ContentEditable
  onPaste={handlePaste}
  // ... otros props
/>
```

### **Todo Lists** (`todo-list-element.tsx`)
```typescript
// Importar hook
import { usePastePlainText } from '@/hooks/use-paste-plain-text';

// Usar hook
const { handlePaste } = usePastePlainText();

// Aplicar a ambos textarea
<textarea onPaste={handlePaste} /> // Editar tarea existente
<textarea onPaste={handlePaste} /> // Agregar nueva tarea
```

## 🎨 **Resultado Visual**

### **Antes (con estilos externos):**
```html
<!-- Texto copiado de Word -->
<span style="font-family: Arial; font-size: 12pt; color: #000000;">
  <b>Texto</b> <i>con</i> <u>estilos</u>
</span>
```
*Renders with Arial font, black color, overriding the element's Patrick Hand font and custom colors.*

### **Después (texto plano):**
```text
Texto con estilos
```
*Renders with the element's own Patrick Hand font, custom colors, and styling.*

## 🛠️ **Características Técnicas**

### **Compatibilidad**
- ✅ **Chrome/Edge:** Soporte completo
- ✅ **Firefox:** Soporte completo
- ✅ **Safari:** Soporte completo
- ✅ **Mobile:** Funciona en dispositivos móviles

### **Formatos Soportados**
- 📋 **text/plain:** Texto plano directo
- 🌐 **text/html:** HTML limpio automáticamente
- 📄 **Otros formatos:** Conversión automática

### **Limpieza Inteligente**
```typescript
// Ejemplo de limpieza
const plainText = clipboardData.getData('text/plain') ||
  // Si no hay texto plano, limpiar HTML
  tempDiv.textContent || tempDiv.innerText ||
  // Otros formatos como fallback
  clipboardData.getData(otherType);
```

## 🚀 **Uso Global**

### **Para Futuros Componentes Editables**
```typescript
// 1. Importar el hook
import { usePastePlainText } from '@/hooks/use-paste-plain-text';

// 2. Usar el hook
const { handlePaste } = usePastePlainText();

// 3. Aplicar al elemento editable
<textarea onPaste={handlePaste} />
<input onPaste={handlePaste} />
<div contentEditable onPaste={handlePaste} />
<ContentEditable onPaste={handlePaste} />
```

### **Función Utilitaria**
```typescript
// Para casos avanzados
import { applyPlainTextPaste } from '@/hooks/use-paste-plain-text';

useEffect(() => {
  const cleanup = applyPlainTextPaste(elementRef.current);
  return cleanup; // Remueve listener al desmontar
}, []);
```

## 🐛 **Solución de Problemas**

### **Si el paste no funciona:**
1. Verificar que `onPaste={handlePaste}` esté aplicado
2. Revisar que el hook esté importado correctamente
3. Verificar que el elemento sea editable (`contentEditable`, `textarea`, etc.)

### **Si los estilos persisten:**
1. El hook solo se activa en eventos `paste`
2. Verificar que no haya otros event listeners interfiriendo
3. Revisar que el elemento tenga los estilos correctos aplicados

### **Para debugging:**
```typescript
// Agregar logging temporal
const handlePaste = useCallback((event: ClipboardEvent) => {
  console.log('Paste event:', event.clipboardData?.types);
  // ... resto del código
}, []);
```

## 📊 **Beneficios**

- 🎨 **Consistencia visual:** Todo texto adopta los estilos del elemento
- 🚀 **Performance:** Limpieza automática sin intervención del usuario
- 🔒 **Seguridad:** Remueve potenciales scripts maliciosos en HTML
- 📱 **UX mejorada:** Pegado seamless desde cualquier fuente
- 🔧 **Mantenibilidad:** Una sola implementación para toda la app

## ✅ **Estado Actual**

- ✅ **Hook implementado:** `usePastePlainText`
- ✅ **Sticky notes:** ✅ Aplicado
- ✅ **Text elements:** ✅ Aplicado
- ✅ **Todo lists:** ✅ Aplicado
- ✅ **Testing:** Listo para pruebas

---

**Resultado:** Ahora cuando copies texto desde Word, navegadores, o cualquier aplicación externa y lo pegues en Mi Cerebro, el texto se limpiará automáticamente y adoptará la tipografía Patrick Hand, colores personalizados, y estilos de cada elemento. 🎯✨
