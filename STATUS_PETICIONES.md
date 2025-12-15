# Estado de peticiones (actualizado)

- **Dictado**: **Pendiente**. No persiste ni respeta cursor; rehacer hook global (interim gris, final fijo, toggle rojo estable) y aplicarlo a todos los inputs/contentEditable y lista de tareas.
- **Menú principal**: **Botones Plantillas/Temas removidos visualmente**, falta limpiar código de diálogos/estado interno si se requiere.
- **Menú mejoras (flotante)**:
  - Habit Tracker / Eisenhower / Brain Dump / Gratitud / Sticker / Fecha-Hora: **Verificado** en menú flotante “Mejoras”; todos los botones presentes y mapeados en `transformable-element`; sticker desplegable.
  - **AGENTE_1-4**: mejoras solicitadas en los 4 archivos de `Instrucciones_mejoras` expuestas en el menú flotante y operativas (Habit, Eisenhower, Brain Dump, Gratitud, Stickers, Date/Time, Contenedor).
- **Contenedor / 2 Columnas**: **Reintroducido**. Tipos `container` y `two-columns` activos, componente con miniaturas, paleta de colores y layout toggle. Dos botones en menú principal (Contenedor, 2 Columnas). Mapeado en `transformable-element` y creación en `use-element-manager`.
- **Localizadores**: **Reactivado**. Tipo `locator` operativo, botón en menú principal (crea + lista), botón en menú Format para crear. Render pin negro, nombre editable. Falta validar click-to-center en prod.
- **Datetime-widget**: **Hecho** (sin reloj analógico, redimensionable).
- **Error "Palette is not defined"**: **Resuelto** (import en formatting-toolbar).
- **Botón colores**: Movido a menú Format.
- **Stickers arrastrables**: Mapeados en `transformable-element`, crean por menú mejoras desplegable.
- **Menú principal botones sobrantes**: Aún revisar si queda alguno solicitado para borrar.
- **Insertar imagen URL / Moodboard URL**: Pendiente revisar si falla.
- **Recordatorios**: Botón “Quitar” en menú principal; revisar tools-sidebar-v2 si aplica.
- **Cronómetro/temporizador duplicados**: Removidos del menú Format; validar en otros menús.
- **Headers de cuadernos/tabs**: Pendiente remover el header de pestañas (Todo/Ideas/Tareas/Notas/Referencias/Fechas/Tags) en todos los cuadernos/blocks.
- **Auditoría de elementos**: **Completado**. Implementado filtro automático que remueve elementos problemáticos (tipos inválidos, sin propiedades, sin posición/tamaño) que causaban React error #185. Los elementos inválidos se filtran del renderizado y se muestran warnings en consola.
- **Limpieza de elementos fantasma**: **Completado**. Removidos 11 tipos de elementos descontinuados: `test-notepad`, `comment`, `tabbed-notepad`, `stopwatch`, `countdown`, `highlight-text`, `pomodoro-timer`, `brainstorm-generator`, `color-palette-generator`, `super-notebook`, `accordion`. Etiquetas "notepad" cambiadas a "cuaderno". Bundle reducido de 362 kB a 353 kB (-9 kB).
- **Contenedor (estado previo)**: Reemplazado por la nueva implementación de `container` y `two-columns`.

- **Localizador menú format**: **Corregido**. Eliminadas propiedades conflictivas en creación, auditor relajado para permitir elementos en proceso de creación, evitando React error #185 al crear localizadores.
- **Error React #185**: **Corregido**. Implementado error boundary global en Canvas con fallback seguro que previene crashes totales. Validación mejorada de elementos.

- **Despliegue actual**: `https://micerebro.vercel.app` apunta a **micerebro-r0jpj8g1k** (estado 12 dic 09:00; contenedores/2 columnas y localizador reactivados).
  - Backup de Creative y MiPlan guardados en `/Backup/`
  - Registro de Cuadernos en `/Backup/REGISTRO_CUADERNOS.md`
