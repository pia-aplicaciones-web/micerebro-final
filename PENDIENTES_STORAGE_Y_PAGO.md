### PENDIENTES_STORAGE_Y_PAGO.md
**Resumen y Acciones Pendientes sobre Almacenamiento y Posibles Pagos**

Este documento resume la información clave y las acciones pendientes relacionadas con el uso del almacenamiento en Firebase y posibles consideraciones de pago.

#### 1. Límites del Plan Gratuito de Firebase Storage

*   **Límite Actual:** 5 GB de almacenamiento total.
*   **Cambio Importante (a partir del 3 de febrero de 2026):** Firebase Storage dejará de estar disponible en el plan gratuito Spark. Es **obligatorio actualizar a un plan Blaze** (pago por uso) para mantener el acceso.
*   **Nota:** El plan Blaze incluye los mismos 5 GB gratuitos, por lo que los proyectos pequeños pueden seguir funcionando sin coste si se mantienen dentro de este límite y se realiza la actualización.

#### 2. Reglas de Seguridad de Firebase Storage

*   **Acción Necesaria:** **Debes verificar manualmente las reglas de seguridad de Firebase Storage** en tu consola de Firebase.
*   **Por qué es importante:** La nueva función de cálculo de uso de almacenamiento (`useStorageUsage`) necesita permisos para leer los metadatos de las imágenes en Storage. Si las reglas no son correctas, la función fallará.
*   **Cómo verificar:
    1.  Ve a [console.firebase.google.com](https://console.firebase.google.com/).
    2.  Selecciona tu proyecto.
    3.  En el menú de la izquierda, navega a **Storage** y luego a la pestaña **Rules**.
    4.  Asegúrate de tener una regla que permita la lectura de archivos por parte del propietario, similar a:
        ```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
        ```

#### 3. Funcionalidad de Cálculo de Uso de Almacenamiento Implementada

*   Se ha implementado un hook (`src/hooks/use-storage-usage.ts`) que calcula el número total de tableros, elementos y el tamaño total de las imágenes almacenadas por el usuario.
*   Se ha creado un componente de UI (`src/components/user-settings/StorageUsageDisplay.tsx`) para mostrar esta información.
*   El componente `StorageUsageDisplay` está actualmente integrado como un **marcador de posición** en `src/app/board/[boardId]/BoardPageClient.tsx`.

#### 4. Consideraciones Adicionales y Acciones Pendientes

*   **Rendimiento:** La función de cálculo de uso de almacenamiento puede ser lenta para usuarios con un gran volumen de datos, ya que realiza múltiples llamadas a la API de Firebase. Se podría considerar una optimización futura (ej. caché, cálculo en el backend).
*   **Integración UI:** La ubicación actual del `StorageUsageDisplay` es temporal. Deberías decidir el lugar más adecuado y accesible para los usuarios.
*   **Validación `userId`:** La función depende de un `userId` válido. Asegúrate de que este siempre se proporcione correctamente a `useStorageUsage`.