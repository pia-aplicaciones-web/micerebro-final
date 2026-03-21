# Acta de cambios - 21 de marzo

## 1) Estado general
- Estado: **Completado y desplegado**
- Producción oficial: `https://micerebroapp.vercel.app/`
- Commit principal del día: `c2044b2b778a3c3945523d2c77f01a77596c3f7a`
- Rama: `main`
- Autor: `pia-aplicaciones-web`
- Fecha commit: `2026-03-21 10:39:57 -0300`
- Mensaje commit: `ultimos febrero.`

## 2) Cambios funcionales implementados
- **ToolsSidebar / menú de herramientas:**
  - Se agregó item `XTRa menu: menu principal de la App` en menú `Más`.
  - Se aplicó estilo de tooltip sutil en botones del `ToolsSidebar`.
  - Se dejó modo flotante centrado superior al volver al menú principal (`toolsSidebarFloatingMode`).
- **Capas (z-index):**
  - Se conectaron de forma real los botones `Traer al frente`, `Enviar atrás` y `Enviar al fondo`.
  - Se corrigió el problema crítico de funciones vacías en `BoardPageClient`.
- **Undo/Redo profesional:**
  - `Undo` ampliado a 10 pasos.
  - `Redo` con stack independiente (`redoStack`), botón visible en `ZoomControls` y atajos.
- **Reglas globales de capas:**
  - Cuadernos en capa base `z=-1`.
  - Elementos nuevos por encima de los existentes.
  - Elemento seleccionado sube temporalmente a `z=999` para edición y luego vuelve a su capa base.
- **Timer Lista (voz automática):**
  - Al presionar play se lee la tarea actual.
  - Al pasar a siguiente tarea, se lee automáticamente la siguiente.
  - Voz fijada con prioridad a **Paulina**.
- **UI / experiencia:**
  - Tooltips sutiles en controles clave (`ToolsSidebar` y controles inferiores de zoom/capas).
- **Corrector tipo Word (dictado):**
  - Se habilitó `spellCheck` en contenido editable de `dictado`.
  - Se configuró idioma `es-419` para español latinoamericano.
  - Se activó `spellCheck` global en `layout` para la app.
- **Regla crítica de deploy:**
  - Documentación reforzada para mantener producción en `https://micerebroapp.vercel.app/`.

## 3) Impacto esperado
- Mayor confiabilidad en orden de capas y edición visual.
- Flujo de trabajo más estable con deshacer/rehacer real de tipo editor.
- Mejor accesibilidad y productividad en `Timer Lista` con lectura automática de tareas.
- Menor ambigüedad operativa en despliegues de producción.

## 4) Validación realizada
- Se verificó build en producción con hash visible.
- Se verificó sincronización de commit desplegado con commit local del día.
- Se propuso checklist de aceptación para:
  - capas,
  - undo/redo,
  - lectura de Timer Lista,
  - dominio de producción.

## 5) Cambios detectados al momento del commit

### Archivos agregados
- `src/components/canvas/elements/block-dibujo-2-element.tsx`
- `src/components/canvas/elements/mis-imagenes-element.tsx`
- `src/lib/touch-edit-guard.ts`

### Archivos modificados
- `deploy.txt`
- `package-lock.json`
- `package.json`
- `src/app/board/[boardId]/BoardPageClient.tsx`
- `src/app/layout.tsx`
- `src/app/page.jsx`
- `src/components/board-content.tsx`
- `src/components/canvas/add-link-dialog.tsx`
- `src/components/canvas/canvas.tsx`
- `src/components/canvas/elements/block-dibujo-element.tsx`
- `src/components/canvas/elements/container-element.tsx`
- `src/components/canvas/elements/dictado-element.tsx`
- `src/components/canvas/elements/highlight-text-element.tsx`
- `src/components/canvas/elements/image-element.tsx`
- `src/components/canvas/elements/image-frame-element.tsx`
- `src/components/canvas/elements/libreta-element.tsx`
- `src/components/canvas/elements/mini-element.tsx`
- `src/components/canvas/elements/notepad-element.tsx`
- `src/components/canvas/elements/notes-element.tsx`
- `src/components/canvas/elements/photo-collage-free-element.tsx`
- `src/components/canvas/elements/photo-grid-adaptive-element.tsx`
- `src/components/canvas/elements/photo-grid-element.tsx`
- `src/components/canvas/elements/photo-grid-free-element.tsx`
- `src/components/canvas/elements/photo-grid-horizontal-element.tsx`
- `src/components/canvas/elements/sticky-note-element.tsx`
- `src/components/canvas/elements/sticky-note-type2.tsx`
- `src/components/canvas/elements/text-element.tsx`
- `src/components/canvas/elements/timer-lista-element.tsx`
- `src/components/canvas/elements/todo-list-element.tsx`
- `src/components/canvas/elements/url-doc-element.tsx`
- `src/components/canvas/elements/yellow-notepad-element.tsx`
- `src/components/canvas/formatting-toolbar.tsx`
- `src/components/canvas/mini-tools-panel.tsx`
- `src/components/canvas/mini-tools-sidebar.tsx`
- `src/components/canvas/mobile-menu.tsx`
- `src/components/canvas/mobile/mobile-board-client.tsx`
- `src/components/canvas/text-tools-menu.tsx`
- `src/components/canvas/tools-sidebar-v2.tsx`
- `src/components/canvas/tools-sidebar.tsx`
- `src/components/canvas/transformable-element.tsx`
- `src/components/canvas/zoom-controls.tsx`
- `src/hooks/use-dictation.ts`
- `src/hooks/use-element-manager.ts`
- `src/hooks/use-speech-to-text.ts`
- `src/lib/auth.js`
- `src/lib/saved-links.ts`
- `src/lib/store/boardStore.ts`
- `src/lib/types.ts`
- `src/lib/upload-helper.ts`

## 6) Pendientes recomendados
- Ejecutar checklist de aceptación completo post-deploy en entorno productivo.
- Definir batería mínima fija de regresión antes de cada push a `main`.
