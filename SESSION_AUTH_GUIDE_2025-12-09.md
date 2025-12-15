# Guía rápida: Autenticación y carga de tableros (2025-12-09)

## Flujos clave
- **AuthContext**: siempre espera `auth.currentUser`; no uses `localStorage` como fuente de verdad.
- **BoardPageClient**: sólo carga tableros con `user.uid` real de AuthContext; si no hay usuario, espera.
- **Crear tablero al fallo de permisos**: si Firestore devuelve `permission-denied`, crea un tablero nuevo para el `user.uid` autenticado y redirige.
- **Redirecciones post-login**: guarda `currentUserId/lastBoardId` sólo como helper, pero no los uses para decidir permisos; la fuente válida es `user.uid` de AuthContext.

## Qué NO hacer
- No cerrar sesión en `unload/pagehide` (corta la sesión al redirigir).
- No forzar carga de tableros con IDs guardados en `localStorage` si AuthContext no tiene usuario.
- No usar usuarios temporales/anon para tableros privados de usuario.

## Configuración Firebase
- Auth: dominio autorizado debe incluir `micerebro.vercel.app`.
- Firestore rules (resumen): acceso sólo a `users/{uid}/...` cuando `request.auth.uid == uid`.
- Storage: usa el mismo `auth` y bucket `canvasmind-app.firebasestorage.app`.

## Pasos de recuperación
1) Limpiar sesión (botón “Limpiar sesión y recargar” en home) si la consola muestra desincronización.
2) Revisar consola: buscar `permission-denied` al leer `users/{uid}/canvasBoards/{boardId}`.
3) Si hay `permission-denied`, dejar que el cliente cree un tablero nuevo (ya implementado).
4) Verificar que AuthContext reciba `onAuthStateChanged` (logs en consola).

## Checklist de despliegue
- Build OK (`npm run build` sin errores).
- Alias apunta al último deploy.
- Dominio en Firebase Auth autorizado.
- Reglas de Firestore publicadas.
